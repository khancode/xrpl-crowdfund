/**
 * This hook only accepts Invoke transactions coming through it
 */
#include <stdbool.h>
#include "hookapi.h"
#include "crowdfund.h"

int64_t hook(uint32_t reserved) {
    TRACESTR("Crowdfund Invoke Hook");

    int64_t tt = otxn_type();
    TRACEVAR(tt);

    if (tt != ttINVOKE) {
        rollback(SBUF("Transaction type must be Invoke. HookOn field is incorrectly set."), 50);
    }

    uint8_t blob_buffer[7]; // 1 byte prefix + 6 bytes max blob length
    int64_t blob_len = otxn_field(SBUF(blob_buffer), sfBlob);
    uint8_t* blob_ptr = blob_buffer;
    trace(SBUF("blob (hex):"), blob_ptr, blob_len, 1);
    blob_ptr += 1; // Skip over prefix length bytes: this will always be 1 byte for all transaction modes
    TRACEVAR(blob_len);

    if (blob_len < 0) {
        if (blob_len == TOO_SMALL) {
            rollback(SBUF("Can't read blob buffer is too small"), 49);
        } else {
            rollback(SBUF("Can't read Blob from Invoke transaction"), 49);
        }
    }

    uint8_t mode_flag = *blob_ptr++;
    TRACEVAR(mode_flag);

    int64_t current_timestamp_unix_seconds = GET_LAST_LEDGER_TIME_IN_UNIX_SECONDS();

    if (mode_flag == MODE_VOTE_REJECT_MILESTONE_FLAG || mode_flag == MODE_VOTE_APPROVE_MILESTONE_FLAG) {
        const bool IS_VOTE_REJECT = mode_flag == MODE_VOTE_REJECT_MILESTONE_FLAG;
        if (IS_VOTE_REJECT) {
            TRACESTR("Mode: Vote Reject Milestone");
        } else {
            TRACESTR("Mode: Vote Approve Milestone");
        }

        /***** Validate/Parse Fields Steps *****/
        /* Step 1. DestinationTag - Check if destinationTag exists for a campaign */
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

        /* Step 2. verify campaign is in a milestone state */
        uint8_t campaign_state = general_info_buffer[GENERAL_INFO_STATE_INDEX];
        if (campaign_state == CAMPAIGN_STATE_DERIVE_FLAG) {
            uint64_t fund_raise_end_date_in_unix_seconds = UINT64_FROM_BUF(general_info_buffer + GENERAL_INFO_FUND_RAISE_END_DATE_IN_UNIX_SECONDS_INDEX);
            // get last milestone end date
            uint8_t milestones_len = general_info_buffer[GENERAL_INFO_MILESTONES_INDEX];
            uint64_t last_milestone_end_date_in_unix_seconds = UINT64_FROM_BUF(
                general_info_buffer + GENERAL_INFO_MILESTONES_INDEX + 1 + ((milestones_len - 1) * MILESTONE_BYTES) + GENERAL_INFO_MILESTONE_END_DATE_IN_UNIX_SECONDS_INDEX_OFFSET
            );
            TRACEVAR(milestones_len);
            TRACEVAR(last_milestone_end_date_in_unix_seconds);

            if (current_timestamp_unix_seconds < fund_raise_end_date_in_unix_seconds) {
                rollback(SBUF("Campaign is currently in fund raise state. Votes can only be applied during a milestone state."), 400);
            } else if (current_timestamp_unix_seconds >= last_milestone_end_date_in_unix_seconds) {
                rollback(SBUF("Campaign is currently in a closed state. Votes can only be applied during a milestone state."), 400);
            }
        } else if (campaign_state == CAMPAIGN_STATE_FAILED_MILESTONE_FLAG) {
            rollback(SBUF("Campaign has already failed due to a rejected milestone."), 400);
        } else {
            rollback(SBUF("Campaign is in an unknown state; this shouldn't happen. Something went wrong when campaign state was last updated."), 400);
        }

        /* Step 3. Sender Account - Get Sender Account as Backer */
        uint8_t backer_account_buffer[20];
        otxn_field(SBUF(backer_account_buffer), sfAccount);
        uint8_t backer_raddress[35];
        uint8_t backer_raddress_len = util_raddr(backer_raddress, sizeof(backer_raddress), backer_account_buffer, 20);
        TRACEVAR(backer_raddress_len);
        trace(SBUF("backer_account_buffer to backer_raddress:"), backer_raddress, backer_raddress_len, 0);

        /* Step 4. Fund Transaction ID */
        uint32_t fund_transaction_id = UINT32_FROM_BUF(blob_ptr);
        blob_ptr += 4;
        TRACEVAR(fund_transaction_id);

        /* Step 5. Compute dataLookupFlag, pageSlotIndex for Fund Transaction ID */
        uint8_t fund_transaction_data_lookup_flag[28];
        uint8_t fund_transaction_page_slot_index;
        GET_DATA_LOOKUP_PAGE_FLAG_USING_FUND_TRANSACTION_ID(fund_transaction_id, fund_transaction_data_lookup_flag, fund_transaction_page_slot_index);
        trace(SBUF("fund_transaction_data_lookup_flag:"), SBUF(fund_transaction_data_lookup_flag), 1);
        TRACEVAR(fund_transaction_page_slot_index);

        /* Step 6. Compute Hook State Fund Transaction Page Key */
        uint8_t hook_state_fund_transaction_page_key[32];
        GET_HOOK_STATE_KEY(fund_transaction_data_lookup_flag, destination_tag_buffer, hook_state_fund_transaction_page_key);

        /* Step 7. Fund Transaction ID - Check if fund transaction exists for a campaign */
        uint8_t fund_transaction_page_buffer[FUND_TRANSACTION_MAX_BYTES];
        if (state(SBUF(fund_transaction_page_buffer), SBUF(hook_state_fund_transaction_page_key)) < 0) {
            rollback(SBUF("Fund Transaction ID doesn't exist for campaign; hook_state_fund_transaction_page_key doesn't exist in Hook State."), 400);
        }
        uint8_t fund_transaction_page_index = (fund_transaction_page_slot_index * FUND_TRANSACTION_BYTES) + 1; // +1 to skip the prefix length byte
        uint32_t fund_transaction_id_from_hook_state = UINT32_FROM_BUF(fund_transaction_page_buffer + fund_transaction_page_index + FUND_TRANSACTION_ID_INDEX_OFFSET);
        TRACEVAR(fund_transaction_id_from_hook_state);

        if (fund_transaction_id != fund_transaction_id_from_hook_state) {
            rollback(SBUF("Fund Transaction ID doesn't exist for campaign; fund_transaction_id != fund_transaction_id_from_hook_state"), 400);
        }

        /* Step 8. Check if Backer matches Fund Transaction */
        uint8_t fund_transaction_backer_raddress_len = fund_transaction_page_buffer[fund_transaction_page_index + FUND_TRANSACTION_BACKER_INDEX_OFFSET];
        uint8_t* fund_transaction_backer_raddress_ptr = fund_transaction_page_buffer + fund_transaction_page_index + 1 + FUND_TRANSACTION_BACKER_INDEX_OFFSET; // +1 to skip the prefix length byte
        TRACEVAR(fund_transaction_backer_raddress_len);
        trace(SBUF("fund_transaction_backer_raddress_ptr:"), fund_transaction_backer_raddress_ptr, 35, 0);

        if (backer_raddress_len != fund_transaction_backer_raddress_len) {
            rollback(SBUF("Backer doesn't match fund transaction; address length doesn't match"), 400);
        }

        int backer_raddress_equal = XRP_ADDRESS_EQUAL(backer_raddress, fund_transaction_backer_raddress_ptr);
        TRACEVAR(backer_raddress_equal);
        if (backer_raddress_equal == 0) {
            rollback(SBUF("Backer doesn't match fund transaction; backer_raddress != fund_transaction_backer_raddress"), 400);
        };

        /* Step 9. Check if Fund Transaction has already placed same vote */
        const uint8_t VOTE_FLAG_UPDATE = IS_VOTE_REJECT ? FUND_TRANSACTION_STATE_REJECT_FLAG : FUND_TRANSACTION_STATE_APPROVE_FLAG;
        uint8_t fund_transaction_state_flag = fund_transaction_page_buffer[fund_transaction_page_index + FUND_TRANSACTION_STATE_INDEX_OFFSET];
        TRACEVAR(fund_transaction_state_flag);

        if (fund_transaction_state_flag == VOTE_FLAG_UPDATE) {
            rollback(SBUF("Fund Transaction has already placed same vote"), 400);
        }

        /***** Update Fund Transaction Hook State Steps *****/
        /* Step 1. Change Fund Transaction state to updated vote */
        fund_transaction_page_buffer[fund_transaction_page_index + FUND_TRANSACTION_STATE_INDEX_OFFSET] = VOTE_FLAG_UPDATE;

        /* Step 2. Update Fund Transaction Hook State */
        int64_t fund_transaction_state_set_res = state_set(SBUF(fund_transaction_page_buffer), SBUF(hook_state_fund_transaction_page_key));
        TRACEVAR(fund_transaction_state_set_res);
        if (fund_transaction_state_set_res < 0) {
            rollback(SBUF("Failed to update fund transaction hook state"), 400);
        }

        /***** Update Campaign General Info Hook State Steps *****/
        /* Step 1. Increment reject votes for General Info */
        uint32_t total_reject_votes_for_current_milestone = UINT32_FROM_BUF(general_info_buffer + GENERAL_INFO_TOTAL_REJECT_VOTES_FOR_CURRENT_MILESTONE_INDEX);
        total_reject_votes_for_current_milestone += IS_VOTE_REJECT ? 1 : -1;
        TRACEVAR(total_reject_votes_for_current_milestone);

        /* Step 2. Check if reject votes for General Info is greater than 50% (half) of total votes */
        uint32_t total_votes_for_current_milestone = UINT32_FROM_BUF(general_info_buffer + GENERAL_INFO_TOTAL_FUND_TRANSACTIONS_INDEX);
        uint32_t half_of_total_votes = total_votes_for_current_milestone / 2;
        TRACEVAR(total_votes_for_current_milestone);
        TRACEVAR(half_of_total_votes);

        if (total_reject_votes_for_current_milestone > half_of_total_votes) {
            /* Step 2.1. Change General Info state to reject */
            general_info_buffer[GENERAL_INFO_STATE_INDEX] = CAMPAIGN_STATE_FAILED_MILESTONE_FLAG;
            TRACESTR("Campaign failed current milestone")

            /* Step 2.2. Get current milestone */
            uint8_t* current_milestone_ptr;
            uint8_t milestones_len = general_info_buffer[GENERAL_INFO_MILESTONES_INDEX];
            uint8_t* milestones_ptr = general_info_buffer + 1 + GENERAL_INFO_MILESTONES_INDEX; // +1 to skip the prefix length byte
            TRACEVAR(milestones_len);
        
            for (int i = 0; GUARD(MILESTONES_MAX_LENGTH), i < milestones_len; i++) {
                uint8_t* milestone_ptr = milestones_ptr + (i * MILESTONE_BYTES);
                uint64_t milestone_end_date_in_unix_seconds = UINT64_FROM_BUF(milestone_ptr + GENERAL_INFO_MILESTONE_END_DATE_IN_UNIX_SECONDS_INDEX_OFFSET);
                TRACEVAR(milestone_end_date_in_unix_seconds);

                if (milestone_end_date_in_unix_seconds > current_timestamp_unix_seconds) {
                    current_milestone_ptr = milestone_ptr;
                    break;
                }
            }

            /* Step 2.3 Update General Info current milestone state to failed */
            current_milestone_ptr[GENERAL_INFO_MILESTONE_STATE_INDEX_OFFSET] = MILESTONE_STATE_FAILED_FLAG;
        }

        /* Step 2.1. Update General Info reject votes */
        UINT32_TO_BUF(general_info_buffer + GENERAL_INFO_TOTAL_REJECT_VOTES_FOR_CURRENT_MILESTONE_INDEX, total_reject_votes_for_current_milestone);

        /* Step 3. Update General Info Hook State */
        int64_t general_info_state_set_res = state_set(SBUF(general_info_buffer), SBUF(hook_state_general_info_key));
        TRACEVAR(general_info_state_set_res);
        if (general_info_state_set_res < 0) {
            rollback(SBUF("Failed to update general info hook state"), 400);
        }
    } else if (mode_flag == MODE_REQUEST_REFUND_PAYMENT_FLAG) {
        TRACESTR("Mode: Request Refund Payment");
        rollback(SBUF("Mode: Request Refund Payment - Not implemented"), 54);
    } else if (mode_flag == MODE_REQUEST_MILESTONE_PAYOUT_PAYMENT_FLAG) {
        TRACESTR("Mode: Request Milestone Payment");
        rollback(SBUF("Mode: Request Milestone Payment - Not implemented"), 54);
    } else {
        rollback(SBUF("Invalid mode flag"), 49);
    }

    TRACESTR("Accept.c: Called.");
    accept (0,0,0);
    _g(1,1);   // every hook needs to import guard function and use it at least once
    // unreachable
    return 0;
}