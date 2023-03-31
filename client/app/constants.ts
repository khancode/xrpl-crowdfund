import { Wallet } from 'xrpl'
import config from '../../config.json'

export type CampaignState =
  | 'fundRaise'
  | 'milestone1'
  | 'milestone2'
  | 'milestone3'
  | 'milestone4'
  | 'milestone5'
  | 'milestone6'
  | 'milestone7'
  | 'milestone8'
  | 'milestone9'
  | 'milestone10'
  | 'failedFundRaise'
  | 'failedMilestone'
  | 'completed'

export type CampaignStateFlag =
  | typeof CAMPAIGN_STATE_FUND_RAISE_FLAG
  | typeof CAMPAIGN_STATE_MILESTONE_1_FLAG
  | typeof CAMPAIGN_STATE_MILESTONE_2_FLAG
  | typeof CAMPAIGN_STATE_MILESTONE_3_FLAG
  | typeof CAMPAIGN_STATE_MILESTONE_4_FLAG
  | typeof CAMPAIGN_STATE_MILESTONE_5_FLAG
  | typeof CAMPAIGN_STATE_MILESTONE_6_FLAG
  | typeof CAMPAIGN_STATE_MILESTONE_7_FLAG
  | typeof CAMPAIGN_STATE_MILESTONE_8_FLAG
  | typeof CAMPAIGN_STATE_MILESTONE_9_FLAG
  | typeof CAMPAIGN_STATE_MILESTONE_10_FLAG
  | typeof CAMPAIGN_STATE_FAILED_FUND_RAISE_FLAG
  | typeof CAMPAIGN_STATE_FAILED_MILESTONE_FLAG
  | typeof CAMPAIGN_STATE_COMPLETED_FLAG

export type MilestoneState =
  | 'unstarted'
  | 'inProgress'
  | 'failed'
  | 'completed'
  | 'paid'

export type MilestoneStateFlag =
  | typeof MILESTONE_STATE_UNSTARTED_FLAG
  | typeof MILESTONE_STATE_IN_PROGRESS_FLAG
  | typeof MILESTONE_STATE_FAILED_FLAG
  | typeof MILESTONE_STATE_COMPLETED_FLAG
  | typeof MILESTONE_STATE_PAID_FLAG

export type FundTransactionState = 'reject' | 'approve' | 'refunded'

export type FundTransactionStateFlag =
  | typeof FUND_TRANSACTION_STATE_REJECT_FLAG
  | typeof FUND_TRANSACTION_STATE_APPROVE_FLAG
  | typeof FUND_TRANSACTION_STATE_REFUNDED_FLAG

export const HOOK_ACCOUNT_WALLET = Wallet.fromSeed(config.HOOK_ACCOUNT.seed)

// Campaign States
export const CAMPAIGN_STATE_FUND_RAISE_FLAG = 0x00
export const CAMPAIGN_STATE_MILESTONE_1_FLAG = 0x01
export const CAMPAIGN_STATE_MILESTONE_2_FLAG = 0x02
export const CAMPAIGN_STATE_MILESTONE_3_FLAG = 0x03
export const CAMPAIGN_STATE_MILESTONE_4_FLAG = 0x04
export const CAMPAIGN_STATE_MILESTONE_5_FLAG = 0x05
export const CAMPAIGN_STATE_MILESTONE_6_FLAG = 0x06
export const CAMPAIGN_STATE_MILESTONE_7_FLAG = 0x07
export const CAMPAIGN_STATE_MILESTONE_8_FLAG = 0x08
export const CAMPAIGN_STATE_MILESTONE_9_FLAG = 0x09
export const CAMPAIGN_STATE_MILESTONE_10_FLAG = 0x0a
export const CAMPAIGN_STATE_FAILED_FUND_RAISE_FLAG = 0x0b
export const CAMPAIGN_STATE_FAILED_MILESTONE_FLAG = 0x0c
export const CAMPAIGN_STATE_COMPLETED_FLAG = 0x0d

// Milestone States
export const MILESTONE_STATE_UNSTARTED_FLAG = 0x00
export const MILESTONE_STATE_IN_PROGRESS_FLAG = 0x01
export const MILESTONE_STATE_FAILED_FLAG = 0x02
export const MILESTONE_STATE_COMPLETED_FLAG = 0x03
export const MILESTONE_STATE_PAID_FLAG = 0x04

// Fund Transaction States
export const FUND_TRANSACTION_STATE_REJECT_FLAG = 0x00
export const FUND_TRANSACTION_STATE_APPROVE_FLAG = 0x01
export const FUND_TRANSACTION_STATE_REFUNDED_FLAG = 0x02

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

// convert campaign state code to campaign state
export const campaignStateFlagToCampaignState = (
  campaignStateCode: CampaignStateFlag
): CampaignState => {
  switch (campaignStateCode) {
    case CAMPAIGN_STATE_FUND_RAISE_FLAG:
      return 'fundRaise'
    case CAMPAIGN_STATE_MILESTONE_1_FLAG:
      return 'milestone1'
    case CAMPAIGN_STATE_MILESTONE_2_FLAG:
      return 'milestone2'
    case CAMPAIGN_STATE_MILESTONE_3_FLAG:
      return 'milestone3'
    case CAMPAIGN_STATE_MILESTONE_4_FLAG:
      return 'milestone4'
    case CAMPAIGN_STATE_MILESTONE_5_FLAG:
      return 'milestone5'
    case CAMPAIGN_STATE_MILESTONE_6_FLAG:
      return 'milestone6'
    case CAMPAIGN_STATE_MILESTONE_7_FLAG:
      return 'milestone7'
    case CAMPAIGN_STATE_MILESTONE_8_FLAG:
      return 'milestone8'
    case CAMPAIGN_STATE_MILESTONE_9_FLAG:
      return 'milestone9'
    case CAMPAIGN_STATE_MILESTONE_10_FLAG:
      return 'milestone10'
    case CAMPAIGN_STATE_FAILED_FUND_RAISE_FLAG:
      return 'failedFundRaise'
    case CAMPAIGN_STATE_FAILED_MILESTONE_FLAG:
      return 'failedMilestone'
    case CAMPAIGN_STATE_COMPLETED_FLAG:
      return 'completed'
    default:
      throw new Error('Invalid campaign state code')
  }
}

// convert milestone state flag to milestone state
export const milestoneStateFlagToMilestoneState = (
  milestoneStateCode: MilestoneStateFlag
): MilestoneState => {
  switch (milestoneStateCode) {
    case MILESTONE_STATE_UNSTARTED_FLAG:
      return 'unstarted'
    case MILESTONE_STATE_IN_PROGRESS_FLAG:
      return 'inProgress'
    case MILESTONE_STATE_FAILED_FLAG:
      return 'failed'
    case MILESTONE_STATE_COMPLETED_FLAG:
      return 'completed'
    case MILESTONE_STATE_PAID_FLAG:
      return 'paid'
    default:
      throw new Error('Invalid milestone state code')
  }
}

// convert fund transaction state flag to fund transaction state
export const fundTransactionStateFlagToFundTransactionState = (
  fundTransactionStateCode: FundTransactionStateFlag
): FundTransactionState => {
  switch (fundTransactionStateCode) {
    case FUND_TRANSACTION_STATE_REJECT_FLAG:
      return 'reject'
    case FUND_TRANSACTION_STATE_APPROVE_FLAG:
      return 'approve'
    case FUND_TRANSACTION_STATE_REFUNDED_FLAG:
      return 'refunded'
    default:
      throw new Error('Invalid fund transaction state code')
  }
}
