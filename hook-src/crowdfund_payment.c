/**
 * This hook just accepts any transaction coming through it
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
    
    TRACESTR("Sweet bro"); 

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

    if (mode_flag == MODE_CREATE_CAMPAIGN_PART_A_FLAG) {
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

        /* Step 4. title */
        uint8_t title_len = *payload_ptr++;
        uint8_t* title_ptr = payload_ptr;
        TRACEVAR(title_len);
        trace(SBUF("title:"), payload_ptr, title_len, 0);
        if (title_len < 1 || title_len > TITLE_MAX_BYTES) {
            rollback(SBUF("Title must be between 1 and 75 characters."), 400);
        }
        payload_ptr += TITLE_MAX_BYTES;

        /* Step 5. fundRaiseGoalInDrops */
        uint64_t fund_raise_goal_in_drops = UINT64_FROM_BUF(payload_ptr);
        TRACEVAR(fund_raise_goal_in_drops);
        payload_ptr += 8;

        /* Step 6. fundRaiseEndDateInUnixSeconds */
        uint64_t fund_raise_end_date_in_unix_seconds = UINT64_FROM_BUF(payload_ptr);
        TRACEVAR(fund_raise_end_date_in_unix_seconds);
        payload_ptr += 8;
        int64_t ts_unix_seconds = GET_LAST_LEDGER_TIME_IN_UNIX_SECONDS();
        TRACEVAR(ts_unix_seconds);
        if (fund_raise_end_date_in_unix_seconds < ts_unix_seconds) {
            rollback(SBUF("Fund raise end date must be in the future."), 400);
        }

        /* Step 7. totalMilestones */
        uint8_t total_milestones = *payload_ptr++;
        TRACEVAR(total_milestones);
        if (total_milestones < 1 || total_milestones > MILESTONES_MAX_LENGTH) {
            rollback(SBUF("Total milestones must be between 1 and 10."), 400);
        }

        /***** Write Campaign General Info to Hook State Steps *****/
        /* Step 1. Initialize General Info Buffer */
        int general_info_index = 0;
        uint8_t general_info_buffer[GENERAL_INFO_BUFFER_LENGTH];

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

        /* Step 4. Write Campaign Title to General Info Buffer */
        general_info_buffer[general_info_index++] = title_len;
        iterator = general_info_buffer + general_info_index;
        int title_index = 0;
        int title_remaining_len = title_len;
        copy8bytesCount = title_remaining_len / 8;
        TRACEVAR(copy8bytesCount);
        for (int i = 0; GUARD(9), i < copy8bytesCount; i++) {
            uint64_t title_substring = UINT64_FROM_BUF(title_ptr + title_index);
            UINT64_TO_BUF(iterator, title_substring);
            iterator += 8;
            title_index += 8;
            title_remaining_len -= 8;
        }

        copy4bytesCount = title_remaining_len / 4;
        TRACEVAR(copy4bytesCount);
        for (int i = 0; GUARD(1), i < copy4bytesCount; i++) {
            uint32_t title_substring = UINT32_FROM_BUF(title_ptr + title_index);
            UINT32_TO_BUF(iterator, title_substring);
            iterator += 4;
            title_index += 4;
            title_remaining_len -= 4;
        }

        copy2bytesCount = title_remaining_len / 2;
        TRACEVAR(copy2bytesCount);
        for (int i = 0; GUARD(1), i < copy2bytesCount; i++) {
            uint16_t title_substring = UINT16_FROM_BUF(title_ptr + title_index);
            UINT16_TO_BUF(iterator, title_substring);
            iterator += 2;
            title_index += 2;
            title_remaining_len -= 2;
        }

        // Copy last byte if necessary
        if (title_remaining_len > 0) {
            TRACESTR("copy last 1 byte");
            *iterator = *(title_ptr + title_index);
            iterator++;
            title_index++;
            title_remaining_len--;
        }
        general_info_index += TITLE_MAX_BYTES;

        /* Step 5. Write fundRaiseGoalInDrops to General Info Buffer */
        UINT64_TO_BUF(general_info_buffer + general_info_index, fund_raise_goal_in_drops);
        general_info_index += 8;

        /* Step 6. Write fundRaiseEndDateInUnixSeconds to General Info Buffer */
        UINT64_TO_BUF(general_info_buffer + general_info_index, fund_raise_end_date_in_unix_seconds);
        general_info_index += 8;

        /* Step 7. Skip totalAmountRaisedInDrops and totalAmountRewardedInDrops */
        general_info_index += 16;

        /* Step 8. Write totalReserveAmountInDrops to General Info Buffer */
        UINT64_TO_BUF(general_info_buffer + general_info_index, otxn_drops);
        general_info_index += 8;

        /* Step 9. Write totalMilestones to General Info Buffer */
        general_info_buffer[general_info_index++] = total_milestones;

        /* Step 10. Skip totalFundTransactions */
        general_info_index += 4;

        /* Step 11. Verify General Info Buffer was filled correctly */
        if (general_info_index != GENERAL_INFO_BUFFER_LENGTH) {
            rollback(SBUF("general_info_buffer was not filled correctly."), 400);
        }

        /* Step 12. Write General Info Buffer to Hook State */
        int64_t state_set_res = state_set(general_info_buffer, GENERAL_INFO_BUFFER_LENGTH, SBUF(hook_state_key));
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