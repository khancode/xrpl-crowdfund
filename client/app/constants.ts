import { Wallet } from 'xrpl'
import config from '../../config.json'

export const HOOK_ACCOUNT_WALLET = Wallet.fromSeed(config.HOOK_ACCOUNT.seed)

export const MODE_CREATE_CAMPAIGN_PART_A_FLAG = 0x00
export const MODE_CREATE_CAMPAIGN_PART_B_FLAG = 0x01
export const MODE_FUND_CAMPAIGN_FLAG = 0x02
export const MODE_VOTE_REJECT_FLAG = 0x03
export const MODE_VOTE_APPROVE_FLAG = 0x04
export const MODE_REQUEST_REFUND_PAYMENT_FLAG = 0x05
export const MODE_REQUEST_MILESTONE_PAYOUT_PAYMENT_FLAG = 0x06

export const DATA_LOOKUP_GENERAL_INFO_FLAG = 0x00n
export const DATA_LOOKUP_DESCRIPTION_FRAGMENT_START_INDEX_FLAG = 0x01n
export const DATA_LOOKUP_DESCRIPTION_FRAGMENT_END_INDEX_FLAG = 0x0an
export const DATA_LOOKUP_OVERVIEW_URL_FRAGMENT_START_INDEX_FLAG = 0x0bn
export const DATA_LOOKUP_OVERVIEW_URL_FRAGMENT_END_INDEX_FLAG = 0x13n
export const DATA_LOOKUP_MILESTONES_PAGE_START_INDEX_FLAG = 0x14n
export const DATA_LOOKUP_MILESTONES_PAGE_END_INDEX_FLAG = 0x18n
export const DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_START_INDEX_FLAG = 0x19n
export const DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_END_INDEX_FLAG =
  0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffn

// Payload validation
export const TITLE_MAX_LENGTH = 75
export const DESCRIPTION_MAX_LENGTH = 2500
export const OVERVIEW_URL_MAX_LENGTH = 2300
export const MILESTONES_MAX_LENGTH = 10

// Fees
// TODO: Need to add the fee for the second part of the campaign creation (Invoke transaction)
export const CREATE_CAMPAIGN_DEPOSIT_IN_DROPS = 1300000000n
