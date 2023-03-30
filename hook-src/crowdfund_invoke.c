/**
 * This hook only accepts Invoke transactions coming through it
 */
#include "hookapi.h"
#include "crowdfund.h"

int64_t hook(uint32_t reserved) {
    TRACESTR("Crowdfund Invoke Hook");

    int64_t tt = otxn_type();
    TRACEVAR(tt);

    if (tt != ttINVOKE) {
        rollback(SBUF("Transaction type must be Invoke. HookOn field is incorrectly set."), 50);
    }

    uint8_t blob_buffer[10122];
    int64_t blob_len = otxn_field(SBUF(blob_buffer), sfBlob);
    uint8_t* blob_ptr = blob_buffer;
    trace(SBUF("blob (hex):"), blob_ptr, blob_len, 1);
    blob_ptr += 2; // Skip over prefix length bytes: this will always be 2 bytes for this transaction mode
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

    if (mode_flag == MODE_VOTE_REJECT_MILESTONE_FLAG) {
        rollback(SBUF("Mode: Vote Reject Milestone - Not implemented"), 54);
    } else if (mode_flag == MODE_VOTE_APPROVE_MILESTONE_FLAG) {
        rollback(SBUF("Mode: Vote Approve Milestone - Not implemented"), 54);
    } else if (mode_flag == MODE_REQUEST_REFUND_PAYMENT_FLAG) {
        rollback(SBUF("Mode: Request Refund Payment - Not implemented"), 54);
    } else if (mode_flag == MODE_REQUEST_MILESTONE_PAYOUT_PAYMENT_FLAG) {
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