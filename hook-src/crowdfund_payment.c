/**
 * This hook only accepts Payments transactions coming through it
 */
#include "hookapi.h"
#include "crowdfund.h"

int64_t hook(uint32_t reserved) {
    TRACESTR("Crowdfund Payment Hook");
    
    int64_t tt = otxn_type();
    TRACEVAR(tt);

    if (tt != ttPAYMENT) {
        rollback(SBUF("Transaction type must be Payment. HookOn field is incorrectly set."), 50);
    }

    // check for the presence of a memo
    uint8_t memos[2048];
    int64_t memos_len = otxn_field(SBUF(memos), sfMemos);

    uint32_t payload_len = 0;
    uint8_t* payload_ptr = 0;

    // the memos are presented in an array object, which we must index into
    int i = 0;
    int64_t memo_lookup = sto_subarray(memos, memos_len, i);

    TRACEVAR(memo_lookup);
    if (memo_lookup < 0)
        rollback(SBUF("Memo transaction did not contain correct format."), 49);
    
    // if the subfield/array lookup is successful we must extract the two pieces of returned data
    // which are, respectively, the offset at which the field occurs and the field's length
    uint8_t*  memo_ptr = SUB_OFFSET(memo_lookup) + memos;
    uint32_t  memo_len = SUB_LENGTH(memo_lookup);

    trace(SBUF("Memo: "), memo_ptr, memo_len, 1);

    // memos are nested inside an actual memo object, so we need to subfield
    // equivalently in JSON this would look like memo_array[i]["Memo"]
    memo_lookup = sto_subfield(memo_ptr, memo_len, sfMemo);
    memo_ptr = SUB_OFFSET(memo_lookup) + memo_ptr;
    memo_len = SUB_LENGTH(memo_lookup);

    // now we lookup the subfields of the memo itself
    // again, equivalently this would look like memo_array[i]["Memo"]["MemoData"], ... etc.
    int64_t data_lookup = sto_subfield(memo_ptr, memo_len, sfMemoData);
    int64_t format_lookup = sto_subfield(memo_ptr, memo_len, sfMemoFormat);

    TRACEVAR(data_lookup);
    TRACEVAR(format_lookup);

    // if any of these lookups fail the request is malformed
    if (data_lookup < 0 || format_lookup < 0)
        rollback(SBUF("Memo transaction did not contain correct memo format."), 54);
    
    // care must be taken to add the correct pointer to an offset returned by sub_array or sub_field
    // since we are working relative to the specific memo we must add memo_ptr, NOT memos or something else
    uint8_t* data_ptr = SUB_OFFSET(data_lookup) + memo_ptr;
    uint32_t data_len = SUB_LENGTH(data_lookup);

    uint8_t* format_ptr = SUB_OFFSET(format_lookup) + memo_ptr;
    uint32_t format_len = SUB_LENGTH(format_lookup);

    payload_ptr = data_ptr;
    payload_len = data_len;

    /*
     * First byte indicates transaction mode flag:
     * 0 => Create Campaign Mode
     * 1 => Fund Campaign Mode
     * etc TBD...
     */
    uint8_t* memo_data_ptr = payload_ptr;
    uint8_t mode_flag = *payload_ptr++;

    TRACEVAR(mode_flag);

    if (mode_flag == MODE_CREATE_CAMPAIGN_FLAG) {
        // TODO: implement
        TRACESTR("Mode: Create Campaign Part A");

        /***** Validate/Parse Fields Steps *****/
        /* Step 1. Amount - Check if Amount is at least the minimum deposit for creating a campaign */
        // NOTE: Amounts can be 384 bits or 64 bits. If Amount is an XRP value it will be 64 bits.
        //       Amount should always be XRP for this hook.
        uint8_t amount_buffer[8];
        otxn_field(SBUF(amount_buffer), sfAmount);
        int64_t otxn_drops = AMOUNT_TO_DROPS(amount_buffer);
        TRACEVAR(otxn_drops);
        if (otxn_drops < CREATE_CAMPAIGN_DEPOSIT_IN_DROPS) {
            rollback(SBUF("Amount must be at least the create campaign deposit 1300 XRP"), 400);
        }

        /* Step 2. DestinationTag - Check if destinationTag isn't already used by another campaign */
        uint8_t destination_tag_buffer[4];
        otxn_field(SBUF(destination_tag_buffer), sfDestinationTag);
        uint32_t destination_tag = UINT32_FROM_BUF(destination_tag_buffer);
        TRACEVAR(destination_tag);

        uint8_t hook_state_key[32];
        GET_HOOK_STATE_KEY(DATA_LOOKUP_GENERAL_INFO_FLAG, destination_tag_buffer, hook_state_key);
        trace(SBUF("hook_state_key:"), SBUF(hook_state_key), 1);
        
        uint8_t hook_state_lookup_buffer[256];
        if (state(SBUF(hook_state_lookup_buffer), SBUF(hook_state_key)) > 0) {
            rollback(SBUF("destination_tag already in use for another campaign. Use a different one."), 400);
        }

        /* Step 3. Sender Account - Get Sender Account as Campaign Owner */
        uint8_t sender_account_buffer[20];
        otxn_field(SBUF(sender_account_buffer), sfAccount);
        uint8_t owner_raddress[35];
        uint8_t owner_raddress_len = util_raddr(owner_raddress, sizeof(owner_raddress), sender_account_buffer, 20);
        TRACEVAR(owner_raddress_len);
        trace(SBUF("sender_account_buffer to owner_raddress:"), owner_raddress, owner_raddress_len, 0);

        /* Step 4. fundRaiseGoalInDrops */
        uint64_t fund_raise_goal_in_drops = UINT64_FROM_BUF(payload_ptr);
        TRACEVAR(fund_raise_goal_in_drops);
        payload_ptr += 8;

        /* Step 5. fundRaiseEndDateInUnixSeconds */
        uint64_t fund_raise_end_date_in_unix_seconds = UINT64_FROM_BUF(payload_ptr);
        TRACEVAR(fund_raise_end_date_in_unix_seconds);
        payload_ptr += 8;
        int64_t ts_unix_seconds = GET_LAST_LEDGER_TIME_IN_UNIX_SECONDS();
        TRACEVAR(ts_unix_seconds);
        if (fund_raise_end_date_in_unix_seconds < ts_unix_seconds) {
            rollback(SBUF("Fund raise end date must be in the future."), 400);
        }

        /* Step 6. milestones */
        uint8_t milestones_len = *payload_ptr++;
        uint8_t* milestones = payload_ptr;
        TRACEVAR(milestones_len);
        if (milestones_len < 1 || milestones_len > MILESTONES_MAX_LENGTH) {
            rollback(SBUF("Milestones length must be between 1 and 10"), 49);
        }

        uint8_t* milestone_iterator = milestones;
        uint64_t prev_milestone_end_date_in_unix_seconds = 0;
        uint8_t total_payout_percent = 0;
        for (int i = 0; GUARD(MILESTONES_MAX_LENGTH), i < milestones_len; i++) {
            /* Step 4.1. milestone.endDateInUnixSeconds */
            uint64_t milestone_end_date_in_unix_seconds = UINT64_FROM_BUF(milestone_iterator);
            milestone_iterator += 8;
            TRACEVAR(milestone_end_date_in_unix_seconds);
            int64_t ts_unix_seconds = GET_LAST_LEDGER_TIME_IN_UNIX_SECONDS();
            TRACEVAR(ts_unix_seconds);
            if (milestone_end_date_in_unix_seconds < ts_unix_seconds) {
                rollback(SBUF("Milestone end date must be in the future."), 400);
            }

            if (milestone_end_date_in_unix_seconds < prev_milestone_end_date_in_unix_seconds) {
                rollback(SBUF("Milestone end date must be in ascending order."), 400);
            }
            prev_milestone_end_date_in_unix_seconds = milestone_end_date_in_unix_seconds;

            /* Step 4.3. milestone.payoutPercent */
            uint8_t milestone_payout_percent = *milestone_iterator++;
            TRACEVAR(milestone_payout_percent);
            if (milestone_payout_percent < 1 || milestone_payout_percent > 100) {
                rollback(SBUF("Milestone payout percent must be between 1 and 100"), 49);
            }
            total_payout_percent += milestone_payout_percent;
        }

        if (total_payout_percent != 100) {
            rollback(SBUF("Total payout percents must sum to 100"), 49);
        }

        /***** Write Campaign General Info to Hook State Steps *****/
        /* Step 1. Initialize General Info Buffer */
        int general_info_index = 0;
        uint8_t general_info_buffer[GENERAL_INFO_MAX_BYTES];

        /* Step 2. Write Campaign State to General Info Buffer */
        general_info_buffer[general_info_index++] = CAMPAIGN_STATE_FUND_RAISE_FLAG;

        /* Step 3. Write Campaign Owner to General Info Buffer */
        general_info_buffer[general_info_index++] = owner_raddress_len;
        uint8_t* iterator = general_info_buffer + general_info_index;
        int owner_raddress_index = 0;
        int owner_raddress_remaining_len = owner_raddress_len;
        int copy8bytesCount = owner_raddress_remaining_len / 8;
        TRACEVAR(copy8bytesCount);
        for (int i = 0; GUARD(4), i < copy8bytesCount; i++) {
            uint64_t owner_raddress_substring = UINT64_FROM_BUF(owner_raddress + owner_raddress_index);
            UINT64_TO_BUF(iterator, owner_raddress_substring);
            iterator += 8;
            owner_raddress_index += 8;
            owner_raddress_remaining_len -= 8;
        }

        int copy4bytesCount = owner_raddress_remaining_len / 4;
        TRACEVAR(copy4bytesCount);
        for (int i = 0; GUARD(1), i < copy4bytesCount; i++) {
            uint32_t owner_raddress_substring = UINT32_FROM_BUF(owner_raddress + owner_raddress_index);
            UINT32_TO_BUF(iterator, owner_raddress_substring);
            iterator += 4;
            owner_raddress_index += 4;
            owner_raddress_remaining_len -= 4;
        }

        int copy2bytesCount = owner_raddress_remaining_len / 2;
        TRACEVAR(copy2bytesCount);
        for (int i = 0; GUARD(1), i < copy2bytesCount; i++) {
            uint16_t owner_raddress_substring = UINT16_FROM_BUF(owner_raddress + owner_raddress_index);
            UINT16_TO_BUF(iterator, owner_raddress_substring);
            iterator += 2;
            owner_raddress_index += 2;
            owner_raddress_remaining_len -= 2;
        }

        // Copy last byte if necessary
        if (owner_raddress_remaining_len > 0) {
            TRACESTR("copy last 1 byte");
            *iterator = *(owner_raddress + owner_raddress_index);
            iterator++;
            owner_raddress_index++;
            owner_raddress_remaining_len--;
        }
        general_info_index += XRP_ADDRESS_MAX_BYTES;

        /* Step 4. Write fundRaiseGoalInDrops to General Info Buffer */
        UINT64_TO_BUF(general_info_buffer + general_info_index, fund_raise_goal_in_drops);
        general_info_index += 8;

        /* Step 5. Write fundRaiseEndDateInUnixSeconds to General Info Buffer */
        UINT64_TO_BUF(general_info_buffer + general_info_index, fund_raise_end_date_in_unix_seconds);
        general_info_index += 8;

        /* Step 6. Skip totalAmountRaisedInDrops and totalAmountRewardedInDrops */
        general_info_index += 16;

        /* Step 7. Write totalReserveAmountInDrops to General Info Buffer */
        UINT64_TO_BUF(general_info_buffer + general_info_index, otxn_drops);
        general_info_index += 8;

        /* Step 8. Skip totalFundTransactions */
        general_info_index += 4;

        TRACESTR("general_info_index should be at 81 at this point");
        TRACEVAR(general_info_index);

        /* TODO: Step 9. Write milestones to General Info Buffer */
        general_info_buffer[general_info_index++] = milestones_len;
        uint8_t* milestones_iterator = milestones;
        for (int i = 0; GUARD(MILESTONES_MAX_LENGTH), i < milestones_len; i++) {
            /* Step 9.1. milestone.state */
            general_info_buffer[general_info_index++] = MILESTONE_STATE_UNSTARTED_FLAG;

            /* Step 9.2. milestone.endDateInUnixSeconds */
            uint64_t milestone_end_date_in_unix_seconds = UINT64_FROM_BUF(milestones_iterator);
            UINT64_TO_BUF(general_info_buffer + general_info_index, milestone_end_date_in_unix_seconds);
            general_info_index += 8;
            milestones_iterator += 8;

            /* Step 9.3. milestone.payoutPercent */
            uint8_t milestone_payout_percent = *milestones_iterator++;
            general_info_buffer[general_info_index++] = milestone_payout_percent;

            /* Step 9.4. Skip milestone.refundVotes */
            general_info_index += 4;

            if (i == 0) {
              TRACESTR("general_info_index should be at 96 at this point");
              TRACEVAR(general_info_index);
            } else if (i == 1) {
              TRACESTR("general_info_index should be at 110 at this point");
              TRACEVAR(general_info_index);
            } else if (i == 2) {
              TRACESTR("general_info_index should be at 124 at this point");
              TRACEVAR(general_info_index);
            }
        }

        /* Step 10. Verify General Info Buffer was filled correctly */
        uint8_t expected_general_info_bytes = GENERAL_INFO_MAX_BYTES - ((MILESTONES_MAX_LENGTH - milestones_len) * MILESTONE_BYTES);
        TRACEVAR(expected_general_info_bytes);
        if (general_info_index != expected_general_info_bytes) {
            TRACEVAR(general_info_index);
            rollback(SBUF("general_info_buffer was not filled correctly."), 400);
        }

        /* Step 11. Write General Info Buffer to Hook State */
        int64_t state_set_res = state_set(general_info_buffer, GENERAL_INFO_MAX_BYTES, SBUF(hook_state_key));
        TRACEVAR(state_set_res);
        if (state_set_res < 0) {
            if (state_set_res == RESERVE_INSUFFICIENT) {
                rollback(SBUF("Insufficient reserve to write general info to hook state."), 400);
            } else {
                rollback(SBUF("Failed to write general info to hook state."), 400);
            }
        }

        // DEBUG: Read from Hook State to verify that the write was successful
        uint8_t read_state[256];
        if (state(SBUF(read_state), SBUF(hook_state_key)) < 0) {
            rollback(SBUF("Failed to read hook state."), 400);
        }
        trace(SBUF("read hook state:"), SBUF(read_state), 1); // prints the correct hexadecimal value

    } else if (mode_flag == MODE_FUND_CAMPAIGN_FLAG) {
        // TODO: implement
        rollback(SBUF("Mode: Fund Campaign - Not implemented"), 54);
    } else {
        rollback(SBUF("Invalid mode_flag"), 54);
    }

    TRACESTR("Accept.c: Called.");
    accept (0,0,0);
    _g(1,1);   // every hook needs to import guard function and use it at least once
    // unreachable
    return 0;
}