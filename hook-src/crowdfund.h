#define XRPL_TIMESTAMP_OFFSET 946684800

#define MODE_CREATE_CAMPAIGN_FLAG 0x00
#define MODE_FUND_CAMPAIGN_FLAG 0x01
#define MODE_VOTE_REJECT_MILESTONE_FLAG 0x02
#define MODE_VOTE_APPROVE_MILESTONE_FLAG 0x03
#define MODE_REQUEST_REFUND_PAYMENT_FLAG 0x04
#define MODE_REQUEST_MILESTONE_PAYOUT_PAYMENT_FLAG 0x05

// Integration test mode flags
#define MODE_INTEG_CREATE_CAMPAIGN_FLAG 0x06
#define MODE_INTEG_FUND_CAMPAIGN_FLAG 0x07

// Campaign state flags
#define CAMPAIGN_STATE_DERIVE_FLAG 0x00
#define CAMPAIGN_STATE_FAILED_MILESTONE_1_FLAG 0x01
#define CAMPAIGN_STATE_FAILED_MILESTONE_2_FLAG 0x02
#define CAMPAIGN_STATE_FAILED_MILESTONE_3_FLAG 0x03
#define CAMPAIGN_STATE_FAILED_MILESTONE_4_FLAG 0x04
#define CAMPAIGN_STATE_FAILED_MILESTONE_5_FLAG 0x05
#define CAMPAIGN_STATE_FAILED_MILESTONE_6_FLAG 0x06
#define CAMPAIGN_STATE_FAILED_MILESTONE_7_FLAG 0x07
#define CAMPAIGN_STATE_FAILED_MILESTONE_8_FLAG 0x08
#define CAMPAIGN_STATE_FAILED_MILESTONE_9_FLAG 0x09
#define CAMPAIGN_STATE_FAILED_MILESTONE_10_FLAG 0x0A

// Milestone state flags
#define MILESTONE_STATE_DERIVE_FLAG  0x00
#define MILESTONE_STATE_FAILED_FLAG  0x01
#define MILESTONE_STATE_PAID_FLAG  0x02

// Fund Transaction state flags
#define FUND_TRANSACTION_STATE_APPROVE_FLAG 0x00
#define FUND_TRANSACTION_STATE_REJECT_FLAG 0x01
#define FUND_TRANSACTION_STATE_REFUNDED_FLAG 0x02

#define GENERAL_INFO_MAX_BYTES 186
#define MILESTONE_BYTES 10
#define FUND_TRANSACTION_MAX_BYTES 246
#define FUND_TRANSACTION_BYTES 49

// General Info state index positions
#define GENERAL_INFO_STATE_INDEX 0
#define GENERAL_INFO_CAMPAIGN_OWNER_INDEX 1
#define GENERAL_INFO_FUND_RAISE_GOAL_IN_DROPS_INDEX 37
#define GENERAL_INFO_FUND_RAISE_END_DATE_IN_UNIX_SECONDS_INDEX 45
#define GENERAL_INFO_TOTAL_AMOUNT_RAISED_IN_DROPS_INDEX 53
#define GENERAL_INFO_TOTAL_AMOUNT_NON_REFUNDABLE_IN_DROPS_INDEX 61
#define GENERAL_INFO_TOTAL_RESERVE_AMOUNT_IN_DROPS_INDEX 69
#define GENERAL_INFO_TOTAL_FUND_TRANSACTIONS_INDEX 77
#define GENERAL_INFO_TOTAL_REJECT_VOTES_FOR_CURRENT_MILESTONE_INDEX 81
#define GENERAL_INFO_MILESTONES_INDEX 85
#define GENERAL_INFO_MILESTONE_STATE_INDEX_OFFSET 0
#define GENERAL_INFO_MILESTONE_END_DATE_IN_UNIX_SECONDS_INDEX_OFFSET 1
#define GENERAL_INFO_MILESTONE_PAYOUT_PERCENT_INDEX_OFFSET 9

// Fund Transaction state index positions
#define FUND_TRANSACTION_ID_INDEX_OFFSET 0
#define FUND_TRANSACTION_BACKER_INDEX_OFFSET 4
#define FUND_TRANSACTION_STATE_INDEX_OFFSET 40
#define FUND_TRANSACTION_AMOUNT_IN_DROPS_INDEX_OFFSET 41

#define CREATE_CAMPAIGN_DEPOSIT_IN_DROPS 100000100
#define FUND_CAMPAIGN_DEPOSIT_IN_DROPS 10000010

// Payload validation
#define XRP_ADDRESS_MAX_BYTES 35
#define MILESTONES_MAX_LENGTH 10

#define HOOK_STATE_DESCRIPTION_MAX_FRAGMENTS 10
#define HOOK_STATE_MILESTONES_PAGE_SIZE 2
#define HOOK_STATE_MILESTONE_PAGE_SLOT_BYTES 85
#define HOOK_STATE_FUND_TRANSACTIONS_PAGE_SIZE 5

#define DATA_LOOKUP_FLAG_BYTES 28
#define DATA_LOOKUP_GENERAL_INFO_FLAG ((uint8_t[DATA_LOOKUP_FLAG_BYTES]){ \
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, \
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, \
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, \
    0x00, 0x00, 0x00, 0x00})
#define DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_START_INDEX_FLAG ((uint8_t[DATA_LOOKUP_FLAG_BYTES]){ \
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, \
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, \
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, \
    0x00, 0x00, 0x00, 0x01})
#define DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_END_INDEX_FLAG ((uint8_t[DATA_LOOKUP_FLAG_BYTES]){ \
    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, \
    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, \
    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, \
    0xFF, 0xFF, 0xFF, 0xFF})


#define GET_HOOK_STATE_KEY(data_lookup_flag, destination_tag, result) { \
    (result)[0] = (data_lookup_flag)[0]; \
    (result)[1] = (data_lookup_flag)[1]; \
    (result)[2] = (data_lookup_flag)[2]; \
    (result)[3] = (data_lookup_flag)[3]; \
    (result)[4] = (data_lookup_flag)[4]; \
    (result)[5] = (data_lookup_flag)[5]; \
    (result)[6] = (data_lookup_flag)[6]; \
    (result)[7] = (data_lookup_flag)[7]; \
    (result)[8] = (data_lookup_flag)[8]; \
    (result)[9] = (data_lookup_flag)[9]; \
    (result)[10] = (data_lookup_flag)[10]; \
    (result)[11] = (data_lookup_flag)[11]; \
    (result)[12] = (data_lookup_flag)[12]; \
    (result)[13] = (data_lookup_flag)[13]; \
    (result)[14] = (data_lookup_flag)[14]; \
    (result)[15] = (data_lookup_flag)[15]; \
    (result)[16] = (data_lookup_flag)[16]; \
    (result)[17] = (data_lookup_flag)[17]; \
    (result)[18] = (data_lookup_flag)[18]; \
    (result)[19] = (data_lookup_flag)[19]; \
    (result)[20] = (data_lookup_flag)[20]; \
    (result)[21] = (data_lookup_flag)[21]; \
    (result)[22] = (data_lookup_flag)[22]; \
    (result)[23] = (data_lookup_flag)[23]; \
    (result)[24] = (data_lookup_flag)[24]; \
    (result)[25] = (data_lookup_flag)[25]; \
    (result)[26] = (data_lookup_flag)[26]; \
    (result)[27] = (data_lookup_flag)[27]; \
    (result)[28] = (destination_tag)[0]; \
    (result)[29] = (destination_tag)[1]; \
    (result)[30] = (destination_tag)[2]; \
    (result)[31] = (destination_tag)[3]; \
}

#define GET_DATA_LOOKUP_PAGE_FLAG_USING_FUND_TRANSACTION_ID(fund_transaction_id, result_data_lookup_page_flag, result_page_slot_index) { \
    uint32_t page_index = (fund_transaction_id / HOOK_STATE_FUND_TRANSACTIONS_PAGE_SIZE); \
    (result_page_slot_index) = (fund_transaction_id % HOOK_STATE_FUND_TRANSACTIONS_PAGE_SIZE); \
    ADD_UINT32_TO_ARRS_28(DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_START_INDEX_FLAG, page_index, result_data_lookup_page_flag); \
}

#define GET_LAST_LEDGER_TIME_IN_UNIX_SECONDS(result) (ledger_last_time() + XRPL_TIMESTAMP_OFFSET)

#define INCREMENT_DATA_LOOKUP_FLAG(data_lookup_flag) { \
    for (int i = DATA_LOOKUP_FLAG_BYTES - 1; GUARD(DATA_LOOKUP_FLAG_BYTES), i >= 0; i--) { \
        if (++(data_lookup_flag)[i] != 0) { \
            break; \
        } \
    } \
}

#define ADD_UINT32_TO_ARRS_28(data_lookup_flag, value_to_add, result) { \
    uint8_t value_to_add_arr28[28] = { \
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, \
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, \
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, \
        (value_to_add >> 24) & 0xFF, (value_to_add >> 16) & 0xFF, (value_to_add >> 8) & 0xFF, value_to_add & 0xFF \
    }; \
    uint16_t carry = 0; \
    for (int i = DATA_LOOKUP_FLAG_BYTES - 1; GUARD(DATA_LOOKUP_FLAG_BYTES), i >= 0; i--) { \
      uint16_t temp_sum = (uint16_t)(data_lookup_flag)[i] + (uint16_t)value_to_add_arr28[i] + carry; \
      (result)[i] = (uint8_t)(temp_sum & 0xFF); \
      carry = (temp_sum >> 8); \
    } \
}

#define XRP_ADDRESS_EQUAL(addr1, addr2) \
    ( \
        ((addr1)[0] == (addr2)[0]) && \
        ((addr1)[1] == (addr2)[1]) && \
        ((addr1)[2] == (addr2)[2]) && \
        ((addr1)[3] == (addr2)[3]) && \
        ((addr1)[4] == (addr2)[4]) && \
        ((addr1)[5] == (addr2)[5]) && \
        ((addr1)[6] == (addr2)[6]) && \
        ((addr1)[7] == (addr2)[7]) && \
        ((addr1)[8] == (addr2)[8]) && \
        ((addr1)[9] == (addr2)[9]) && \
        ((addr1)[10] == (addr2)[10]) && \
        ((addr1)[11] == (addr2)[11]) && \
        ((addr1)[12] == (addr2)[12]) && \
        ((addr1)[13] == (addr2)[13]) && \
        ((addr1)[14] == (addr2)[14]) && \
        ((addr1)[15] == (addr2)[15]) && \
        ((addr1)[16] == (addr2)[16]) && \
        ((addr1)[17] == (addr2)[17]) && \
        ((addr1)[18] == (addr2)[18]) && \
        ((addr1)[19] == (addr2)[19]) && \
        ((addr1)[20] == (addr2)[20]) && \
        ((addr1)[21] == (addr2)[21]) && \
        ((addr1)[22] == (addr2)[22]) && \
        ((addr1)[23] == (addr2)[23]) && \
        ((addr1)[24] == (addr2)[24]) && \
        ((addr1)[25] == (addr2)[25]) && \
        ((addr1)[26] == (addr2)[26]) && \
        ((addr1)[27] == (addr2)[27]) && \
        ((addr1)[28] == (addr2)[28]) && \
        ((addr1)[29] == (addr2)[29]) && \
        ((addr1)[30] == (addr2)[30]) && \
        ((addr1)[31] == (addr2)[31]) && \
        ((addr1)[32] == (addr2)[32]) && \
        ((addr1)[33] == (addr2)[33]) && \
        ((addr1)[34] == (addr2)[34]) \
    )

#define UINT64_TO_FLOAT(x) float_set(IEEE754_EXPONENT(x), IEEE754_MANTISSA(x))

/* Macros to extract the mantissa and exponent of a floating-point number in the IEEE 754 binary64 format */
// Returns int64_t
#define IEEE754_MANTISSA(x) (((x) >> 0) & ((1ULL << 52) - 1))
// Returns int32_t
#define IEEE754_EXPONENT(x) (((x) >> 52) & ((1 << 11) - 1))
