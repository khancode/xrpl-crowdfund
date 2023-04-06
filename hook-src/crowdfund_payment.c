/**
 * This hook only accepts Payment transactions coming through it
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
     * 0x00 => Create Campaign Mode
     * 0x01 => Fund Campaign Mode
     */
    uint8_t* memo_data_ptr = payload_ptr;
    uint8_t mode_flag = *payload_ptr++;

    TRACEVAR(mode_flag);

    if (mode_flag == MODE_CREATE_CAMPAIGN_FLAG) {
        TRACESTR("Mode: Create Campaign");

        /***** Validate/Parse Fields Steps *****/
        /* Step 1. Amount - Check if Amount is at least the minimum deposit for creating a campaign */
        // NOTE: Amounts can be 384 bits or 64 bits. If Amount is an XRP value it will be 64 bits.
        //       Amount should always be XRP for this hook.
        uint8_t amount_buffer[8];
        otxn_field(SBUF(amount_buffer), sfAmount);
        int64_t otxn_drops = AMOUNT_TO_DROPS(amount_buffer);
        TRACEVAR(otxn_drops);
        if (otxn_drops < CREATE_CAMPAIGN_DEPOSIT_IN_DROPS) {
            rollback(SBUF("Amount must be at least the create campaign deposit 100 XRP"), 400);
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
        int64_t current_timestamp_unix_seconds = GET_LAST_LEDGER_TIME_IN_UNIX_SECONDS();
        TRACEVAR(current_timestamp_unix_seconds);
        if (fund_raise_end_date_in_unix_seconds <= current_timestamp_unix_seconds) {
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
            if (milestone_end_date_in_unix_seconds <= current_timestamp_unix_seconds) {
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
        general_info_buffer[general_info_index++] = CAMPAIGN_STATE_DERIVE_FLAG;

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

        /* Step 6. totalAmountRaisedInDrops and totalAmountRewardedInDrops - already set to zero so skip them */
        general_info_index += 16;

        /* Step 7. Write totalReserveAmountInDrops to General Info Buffer */
        UINT64_TO_BUF(general_info_buffer + general_info_index, otxn_drops);
        general_info_index += 8;

        /* Step 8. totalFundTransactions - already set to zero so skip it */
        general_info_index += 4;
        
        /* Step 9. totalRejectVotesForCurrentMilestone - already set to zero so skip it */
        general_info_index += 4;

        /* Step 10. Write milestones to General Info Buffer */
        general_info_buffer[general_info_index++] = milestones_len;
        uint8_t* milestones_iterator = milestones;
        for (int i = 0; GUARD(MILESTONES_MAX_LENGTH), i < milestones_len; i++) {
            /* Step 10.1. milestone.state */
            general_info_buffer[general_info_index++] = MILESTONE_STATE_DERIVE_FLAG;

            /* Step 10.2. milestone.endDateInUnixSeconds */
            uint64_t milestone_end_date_in_unix_seconds = UINT64_FROM_BUF(milestones_iterator);
            UINT64_TO_BUF(general_info_buffer + general_info_index, milestone_end_date_in_unix_seconds);
            general_info_index += 8;
            milestones_iterator += 8;

            /* Step 10.3. milestone.payoutPercent */
            uint8_t milestone_payout_percent = *milestones_iterator++;
            general_info_buffer[general_info_index++] = milestone_payout_percent;
        }

        /* Step 11. Verify General Info Buffer was filled correctly */
        uint8_t expected_general_info_bytes = GENERAL_INFO_MAX_BYTES - ((MILESTONES_MAX_LENGTH - milestones_len) * MILESTONE_BYTES);
        if (general_info_index != expected_general_info_bytes) {
            rollback(SBUF("general_info_buffer was not filled correctly."), 400);
        }

        /* Step 12. Write General Info Buffer to Hook State */
        int64_t state_set_res = state_set(general_info_buffer, GENERAL_INFO_MAX_BYTES, SBUF(hook_state_key));
        TRACEVAR(state_set_res);
        if (state_set_res < 0) {
            if (state_set_res == RESERVE_INSUFFICIENT) {
                rollback(SBUF("Insufficient reserve to write general info to hook state."), 400);
            } else {
                rollback(SBUF("Failed to write general info to hook state."), 400);
            }
        }
    } else if (mode_flag == MODE_FUND_CAMPAIGN_FLAG) {
        TRACESTR("Mode: Fund Campaign");

        /***** Validate/Parse Fields Steps *****/
        /* Step 1. Amount - Check if Amount is at least the minimum deposit for creating a campaign */
        // NOTE: Amounts can be 384 bits or 64 bits. If Amount is an XRP value it will be 64 bits.
        //       Amount should always be XRP for this hook.
        uint8_t amount_buffer[8];
        otxn_field(SBUF(amount_buffer), sfAmount);
        int64_t otxn_drops = AMOUNT_TO_DROPS(amount_buffer);
        TRACEVAR(otxn_drops);
        if (otxn_drops <= FUND_CAMPAIGN_DEPOSIT_IN_DROPS) {
            rollback(SBUF("Amount must be more than the fund campaign deposit 10 XRP"), 400);
        }

        /* Step 2. DestinationTag - Check if destinationTag isn't already used by another campaign */
        uint8_t destination_tag_buffer[4];
        otxn_field(SBUF(destination_tag_buffer), sfDestinationTag);
        uint32_t destination_tag = UINT32_FROM_BUF(destination_tag_buffer);
        TRACEVAR(destination_tag);

        uint8_t hook_state_general_info_key[32];
        GET_HOOK_STATE_KEY(DATA_LOOKUP_GENERAL_INFO_FLAG, destination_tag_buffer, hook_state_general_info_key);
        trace(SBUF("hook_state_general_info_key:"), SBUF(hook_state_general_info_key), 1);
        
        uint8_t general_info_buffer[256];
        if (state(SBUF(general_info_buffer), SBUF(hook_state_general_info_key)) < 0) {
            rollback(SBUF("No campaign found with destination_tag."), 400);
        }

        /* Step 3. verify campaign is in fund raise state */
        uint64_t fund_raise_end_date_in_unix_seconds = UINT64_FROM_BUF(general_info_buffer + GENERAL_INFO_FUND_RAISE_END_DATE_IN_UNIX_SECONDS_INDEX);
        int64_t current_timestamp_unix_seconds = GET_LAST_LEDGER_TIME_IN_UNIX_SECONDS();
        if (current_timestamp_unix_seconds >= fund_raise_end_date_in_unix_seconds) {
            rollback(SBUF("Campaign is no longer in fund raise state."), 400);
        }

        /* Step 4. Sender Account - Get Sender Account as Campaign Backer */
        uint8_t sender_account_buffer[20];
        otxn_field(SBUF(sender_account_buffer), sfAccount);
        uint8_t backer_raddress[35];
        uint8_t backer_raddress_len = util_raddr(backer_raddress, sizeof(backer_raddress), sender_account_buffer, 20);
        TRACEVAR(backer_raddress_len);
        trace(SBUF("sender_account_buffer to backer_raddress:"), backer_raddress, backer_raddress_len, 0);


        /***** Write Fund Transaction to Hook State Steps *****/
        /* Step 1. Compute fundTransactionId, dataLookupFlag, pageSlotIndex for new Fund Transaction */
        uint32_t total_fund_transactions = UINT32_FROM_BUF(general_info_buffer + GENERAL_INFO_TOTAL_FUND_TRANSACTIONS_INDEX);
        uint32_t fund_transaction_id = total_fund_transactions;
        uint8_t fund_transaction_data_lookup_flag[28];
        uint8_t fund_transaction_page_slot_index;
        GET_DATA_LOOKUP_PAGE_FLAG_USING_FUND_TRANSACTION_ID(fund_transaction_id, fund_transaction_data_lookup_flag, fund_transaction_page_slot_index);
        trace(SBUF("fund_transaction_data_lookup_flag:"), SBUF(fund_transaction_data_lookup_flag), 1);
        TRACEVAR(fund_transaction_page_slot_index);

        /* Step 2. Get Hook State Key */
        uint8_t hook_state_fund_transaction_page_key[32];
        GET_HOOK_STATE_KEY(fund_transaction_data_lookup_flag, destination_tag_buffer, hook_state_fund_transaction_page_key);

        /* Step 3. Use existing Fund Transaction Hook State page or create new buffer */
        uint8_t fund_transaction_page_buffer[FUND_TRANSACTION_MAX_BYTES];
        uint8_t fund_transaction_page_index = 0;
        if (fund_transaction_page_slot_index == 0) {
            // Use new Fund Transaction page buffer
            fund_transaction_page_buffer[0] = 1; // set prefix length byte
            fund_transaction_page_index++;
        } else {
            // Read from Hook State to use existing Fund Transaction page buffer
            if (state(SBUF(fund_transaction_page_buffer), SBUF(hook_state_fund_transaction_page_key)) < 0) {
                rollback(SBUF("Failed to read hook state."), 400);
            }
            trace(SBUF("read fund_transaction_page_buffer from hook state:"), SBUF(fund_transaction_page_buffer), 1); // prints the correct hexadecimal value
            fund_transaction_page_buffer[0]++; // increment the prefix length byte
            fund_transaction_page_index = (fund_transaction_page_slot_index * FUND_TRANSACTION_BYTES) + 1; // +1 to skip the prefix length byte
        }

        /* Step 4. Write Fund Transaction ID to Fund Transaction Page Buffer */
        UINT32_TO_BUF(fund_transaction_page_buffer + fund_transaction_page_index, fund_transaction_id);
        fund_transaction_page_index += 4;

        /* Step 5. Write Backer Address to Fund Transaction Buffer */
        fund_transaction_page_buffer[fund_transaction_page_index++] = backer_raddress_len;
        uint8_t* iterator = fund_transaction_page_buffer + fund_transaction_page_index;
        int backer_raddress_index = 0;
        int backer_raddress_remaining_len = backer_raddress_len;
        int copy8bytesCount = backer_raddress_remaining_len / 8;
        TRACEVAR(copy8bytesCount);
        for (int i = 0; GUARD(4), i < copy8bytesCount; i++) {
            uint64_t backer_raddress_substring = UINT64_FROM_BUF(backer_raddress + backer_raddress_index);
            UINT64_TO_BUF(iterator, backer_raddress_substring);
            iterator += 8;
            backer_raddress_index += 8;
            backer_raddress_remaining_len -= 8;
        }

        int copy4bytesCount = backer_raddress_remaining_len / 4;
        TRACEVAR(copy4bytesCount);
        for (int i = 0; GUARD(1), i < copy4bytesCount; i++) {
            uint32_t backer_raddress_substring = UINT32_FROM_BUF(backer_raddress + backer_raddress_index);
            UINT32_TO_BUF(iterator, backer_raddress_substring);
            iterator += 4;
            backer_raddress_index += 4;
            backer_raddress_remaining_len -= 4;
        }

        int copy2bytesCount = backer_raddress_remaining_len / 2;
        TRACEVAR(copy2bytesCount);
        for (int i = 0; GUARD(1), i < copy2bytesCount; i++) {
            uint16_t backer_raddress_substring = UINT16_FROM_BUF(backer_raddress + backer_raddress_index);
            UINT16_TO_BUF(iterator, backer_raddress_substring);
            iterator += 2;
            backer_raddress_index += 2;
            backer_raddress_remaining_len -= 2;
        }

        // Copy last byte if necessary
        if (backer_raddress_remaining_len > 0) {
            TRACESTR("copy last 1 byte");
            *iterator = *(backer_raddress + backer_raddress_index);
            iterator++;
            backer_raddress_index++;
            backer_raddress_remaining_len--;
        }
        fund_transaction_page_index += XRP_ADDRESS_MAX_BYTES;

        /* Step 6. Write Fund Transaction State to Fund Transaction Buffer */
        fund_transaction_page_buffer[fund_transaction_page_index++] = FUND_TRANSACTION_STATE_APPROVE_FLAG;

        /* Step 7. Write Fund Transaction Amount to Fund Transaction Buffer */
        int64_t fund_amount_without_deposit_fee_in_drops = otxn_drops - FUND_CAMPAIGN_DEPOSIT_IN_DROPS;
        UINT64_TO_BUF(fund_transaction_page_buffer + fund_transaction_page_index, fund_amount_without_deposit_fee_in_drops);
        fund_transaction_page_index += 8;

        /* Step 8. Verify Fund Transaction Buffer was filled correctly */
        uint8_t expected_fund_transaction_page_index = (fund_transaction_page_slot_index * FUND_TRANSACTION_BYTES) + 1 + FUND_TRANSACTION_BYTES;
        if (fund_transaction_page_index != expected_fund_transaction_page_index) {
            TRACEVAR(expected_fund_transaction_page_index);
            TRACEVAR(fund_transaction_page_index);
            rollback(SBUF("fund_transaction_page_buffer was not filled correctly."), 400);
        }

        /* Step 9. Write Fund Transaction Buffer to Hook State */
        int64_t state_set_res = state_set(SBUF(fund_transaction_page_buffer), SBUF(hook_state_fund_transaction_page_key));
        TRACEVAR(state_set_res);
        if (state_set_res < 0) {
            if (state_set_res == RESERVE_INSUFFICIENT) {
                rollback(SBUF("Insufficient reserve to write fund transaction to hook state."), 400);
            } else {
                rollback(SBUF("Failed to write fund transaction to hook state."), 400);
            }
        }

        /***** Update Campaign General Info Hook State Steps *****/
        /* Step 1. Update totalAmountRaisedInDrops */
        uint64_t total_amount_raised_in_drops = UINT64_FROM_BUF(general_info_buffer + GENERAL_INFO_TOTAL_AMOUNT_RAISED_IN_DROPS_INDEX);
        UINT64_TO_BUF(general_info_buffer + GENERAL_INFO_TOTAL_AMOUNT_RAISED_IN_DROPS_INDEX, total_amount_raised_in_drops + fund_amount_without_deposit_fee_in_drops);
        
        /* Step 2. Update totalReserveAmountInDrops */
        uint64_t total_reserve_amount_in_drops = UINT64_FROM_BUF(general_info_buffer + GENERAL_INFO_TOTAL_RESERVE_AMOUNT_IN_DROPS_INDEX);
        UINT64_TO_BUF(general_info_buffer + GENERAL_INFO_TOTAL_RESERVE_AMOUNT_IN_DROPS_INDEX, total_reserve_amount_in_drops + FUND_CAMPAIGN_DEPOSIT_IN_DROPS);

        /* Step 3. Increment totalFundTransactions */
        UINT32_TO_BUF(general_info_buffer + GENERAL_INFO_TOTAL_FUND_TRANSACTIONS_INDEX, total_fund_transactions + 1);

        /* Step 4. Update General Info Buffer to Hook State */
        state_set_res = state_set(SBUF(general_info_buffer), SBUF(hook_state_general_info_key));
        TRACEVAR(state_set_res);
        if (state_set_res < 0) {
            if (state_set_res == RESERVE_INSUFFICIENT) {
                rollback(SBUF("Insufficient reserve to write general info to hook state."), 400);
            } else {
                rollback(SBUF("Failed to write general info to hook state."), 400);
            }
        }
    } else {
        rollback(SBUF("Invalid mode_flag"), 54);
    }

    TRACESTR("Accept.c: Called.");
    accept (0,0,0);
    _g(1,1);   // every hook needs to import guard function and use it at least once
    // unreachable
    return 0;
}