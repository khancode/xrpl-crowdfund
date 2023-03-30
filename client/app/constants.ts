import { Wallet } from 'xrpl'
import config from '../../config.json'

export const HOOK_ACCOUNT_WALLET = Wallet.fromSeed(config.HOOK_ACCOUNT.seed)

export const MODE_CREATE_CAMPAIGN_FLAG = 0x00
export const MODE_FUND_CAMPAIGN_FLAG = 0x01
export const MODE_VOTE_REJECT_MILESTONE_FLAG = 0x02
export const MODE_VOTE_APPROVE_MILESTONE_FLAG = 0x03
export const MODE_REQUEST_REFUND_PAYMENT_FLAG = 0x04
export const MODE_REQUEST_MILESTONE_PAYOUT_PAYMENT_FLAG = 0x05

export const DATA_LOOKUP_GENERAL_INFO_FLAG = 0x00n
export const DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_START_INDEX_FLAG = 0x01n
export const DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_END_INDEX_FLAG =
  0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffn

// Payload validation
export const MILESTONES_MAX_LENGTH = 10

// These will be used for off-ledger database validation
export const TITLE_MAX_LENGTH = 75
export const DESCRIPTION_MAX_LENGTH = 2500
export const OVERVIEW_URL_MAX_LENGTH = 2300

// Fees
// TODO: Need to add the fee for the second part of the campaign creation (Invoke transaction)
export const CREATE_CAMPAIGN_DEPOSIT_IN_DROPS = 100000000n
export const FUND_CAMPAIGN_DEPOSIT_IN_DROPS = 10000000n
