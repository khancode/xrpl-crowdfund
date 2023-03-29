/**
 * This hook just accepts any transaction coming through it
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

    accept (0,0,0); 

    _g(1,1);   // every hook needs to import guard function and use it at least once
    // unreachable
    return 0;
}