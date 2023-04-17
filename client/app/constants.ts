import { Wallet } from 'xrpl'
import config from '../../config.json'
import { HSVCampaignGeneralInfo } from './models/HSVCampaignGeneralInfo'
import { HSVMilestone } from './models/HSVMilestone'
import { HSVFundTransaction } from './models/HSVFundTransaction'

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
  | 'failedMilestone1'
  | 'failedMilestone2'
  | 'failedMilestone3'
  | 'failedMilestone4'
  | 'failedMilestone5'
  | 'failedMilestone6'
  | 'failedMilestone7'
  | 'failedMilestone8'
  | 'failedMilestone9'
  | 'failedMilestone10'
  | 'completed'

export type CampaignStateFlag =
  | typeof CAMPAIGN_STATE_DERIVE_FLAG
  | typeof CAMPAIGN_STATE_FAILED_MILESTONE_1_FLAG
  | typeof CAMPAIGN_STATE_FAILED_MILESTONE_2_FLAG
  | typeof CAMPAIGN_STATE_FAILED_MILESTONE_3_FLAG
  | typeof CAMPAIGN_STATE_FAILED_MILESTONE_4_FLAG
  | typeof CAMPAIGN_STATE_FAILED_MILESTONE_5_FLAG
  | typeof CAMPAIGN_STATE_FAILED_MILESTONE_6_FLAG
  | typeof CAMPAIGN_STATE_FAILED_MILESTONE_7_FLAG
  | typeof CAMPAIGN_STATE_FAILED_MILESTONE_8_FLAG
  | typeof CAMPAIGN_STATE_FAILED_MILESTONE_9_FLAG
  | typeof CAMPAIGN_STATE_FAILED_MILESTONE_10_FLAG

export type MilestoneState =
  | 'unstarted'
  | 'inProgress'
  | 'failed'
  | 'payoutAvailable'
  | 'paid'

export type MilestoneStateFlag =
  | typeof MILESTONE_STATE_DERIVE_FLAG
  | typeof MILESTONE_STATE_FAILED_FLAG
  | typeof MILESTONE_STATE_PAID_FLAG

export type FundTransactionState = 'reject' | 'approve' | 'refunded'

export type FundTransactionStateFlag =
  | typeof FUND_TRANSACTION_STATE_APPROVE_FLAG
  | typeof FUND_TRANSACTION_STATE_REJECT_FLAG
  | typeof FUND_TRANSACTION_STATE_REFUNDED_FLAG

export const HOOK_ACCOUNT_WALLET = Wallet.fromSeed(config.HOOK_ACCOUNT.seed)

// Campaign States
export const CAMPAIGN_STATE_DERIVE_FLAG = 0x00
export const CAMPAIGN_STATE_FAILED_MILESTONE_1_FLAG = 0x01
export const CAMPAIGN_STATE_FAILED_MILESTONE_2_FLAG = 0x02
export const CAMPAIGN_STATE_FAILED_MILESTONE_3_FLAG = 0x03
export const CAMPAIGN_STATE_FAILED_MILESTONE_4_FLAG = 0x04
export const CAMPAIGN_STATE_FAILED_MILESTONE_5_FLAG = 0x05
export const CAMPAIGN_STATE_FAILED_MILESTONE_6_FLAG = 0x06
export const CAMPAIGN_STATE_FAILED_MILESTONE_7_FLAG = 0x07
export const CAMPAIGN_STATE_FAILED_MILESTONE_8_FLAG = 0x08
export const CAMPAIGN_STATE_FAILED_MILESTONE_9_FLAG = 0x09
export const CAMPAIGN_STATE_FAILED_MILESTONE_10_FLAG = 0x0a

// Milestone States
export const MILESTONE_STATE_DERIVE_FLAG = 0x00
export const MILESTONE_STATE_FAILED_FLAG = 0x01
export const MILESTONE_STATE_PAID_FLAG = 0x02

// Fund Transaction States
export const FUND_TRANSACTION_STATE_APPROVE_FLAG = 0x00
export const FUND_TRANSACTION_STATE_REJECT_FLAG = 0x01
export const FUND_TRANSACTION_STATE_REFUNDED_FLAG = 0x02

export const MODE_CREATE_CAMPAIGN_FLAG = 0x00
export const MODE_FUND_CAMPAIGN_FLAG = 0x01
export const MODE_VOTE_REJECT_MILESTONE_FLAG = 0x02
export const MODE_VOTE_APPROVE_MILESTONE_FLAG = 0x03
export const MODE_REQUEST_REFUND_PAYMENT_FLAG = 0x04
export const MODE_REQUEST_MILESTONE_PAYOUT_PAYMENT_FLAG = 0x05

// Modes used for development & integration tests
export const MODE_DEV_CREATE_CAMPAIGN_FLAG = 0x06
export const MODE_DEV_FUND_CAMPAIGN_FLAG = 0x07
export const MODE_DEV_VOTE_REJECT_MILESTONE_FLAG = 0x08
export const MODE_DEV_VOTE_APPROVE_MILESTONE_FLAG = 0x09

export const DATA_LOOKUP_GENERAL_INFO_FLAG = 0x00n
export const DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_START_INDEX_FLAG = 0x01n
export const DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_END_INDEX_FLAG =
  0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffn

// Payload validation
export const MILESTONES_MAX_LENGTH = 10

export const FUND_TRANSACTIONS_PAGE_MAX_SIZE = 5

// These will be used for off-ledger database validation
export const TITLE_MAX_LENGTH = 75
export const DESCRIPTION_MAX_LENGTH = 2500
export const OVERVIEW_URL_MAX_LENGTH = 2300

/*
  Fees:
    Owner Reserve Fee = 50 XRP
    Transaction Fee = 10 drops
  
  Create Campaign Deposit:
    2 Owner Reserve Fee + 10 transaction fees (for milestone payments; Max 10 milestones)
    = 100 XRP + 100 drops
    = 100000100 drops
  
  Fund Campaign Deposit:
    1/5 Owner Reserve Fee + 1 transaction fee (for refund payment)
    = 10 XRP + 1 drop
    = 10000010 drops
*/
export const CREATE_CAMPAIGN_DEPOSIT_IN_DROPS = 100000100n
export const FUND_CAMPAIGN_DEPOSIT_IN_DROPS = 10000010n

// convert campaign state code to campaign state
export const deriveCampaignState = (
  generalInfo: HSVCampaignGeneralInfo
): CampaignState => {
  if (generalInfo.state === CAMPAIGN_STATE_DERIVE_FLAG) {
    const currentTimeUnixInSeconds = Math.floor(Date.now() / 1000)
    if (currentTimeUnixInSeconds < generalInfo.fundRaiseEndDateInUnixSeconds) {
      return 'fundRaise'
    } else if (
      generalInfo.totalAmountRaisedInDrops < generalInfo.fundRaiseGoalInDrops
    ) {
      return 'failedFundRaise'
    }

    for (let i = 0; i < generalInfo.milestones.length; i++) {
      const milestone = generalInfo.milestones[i]
      if (currentTimeUnixInSeconds < milestone.endDateInUnixSeconds) {
        return `milestone${i + 1}` as CampaignState
      }
    }

    return 'completed'
  } else if (
    generalInfo.state >= CAMPAIGN_STATE_FAILED_MILESTONE_1_FLAG &&
    generalInfo.state <= CAMPAIGN_STATE_FAILED_MILESTONE_10_FLAG
  ) {
    return `failedMilestone${generalInfo.state}` as CampaignState
  }

  throw new Error('Invalid campaign state code')
}

// convert milestone state flag to milestone state
export const deriveMilestonesStates = (
  campaignState: CampaignState,
  fundRaiseEndDateInUnixSeconds: bigint,
  milestones: HSVMilestone[]
): MilestoneState[] => {
  return milestones.map((milestone, index, array) => {
    if (campaignState === `failedFundRaise`) {
      return 'unstarted'
    } else if (milestone.state === MILESTONE_STATE_DERIVE_FLAG) {
      const currentTimeUnixInSeconds = Math.floor(Date.now() / 1000)
      const prevEndDateInUnixSeconds =
        array[index - 1]?.endDateInUnixSeconds || fundRaiseEndDateInUnixSeconds
      if (currentTimeUnixInSeconds >= prevEndDateInUnixSeconds) {
        if (currentTimeUnixInSeconds < milestone.endDateInUnixSeconds) {
          return 'inProgress'
        } else {
          if (campaignState.includes('failedMilestone')) {
            const failedMilestoneIndex = Number(
              campaignState.replace('failedMilestone', '')
            )
            if (index > failedMilestoneIndex - 1) {
              return 'unstarted'
            }
          }

          return 'payoutAvailable'
        }
      }

      return 'unstarted'
    } else if (milestone.state === MILESTONE_STATE_FAILED_FLAG) {
      return 'failed'
    } else if (milestone.state === MILESTONE_STATE_PAID_FLAG) {
      return 'paid'
    }

    throw new Error('Invalid milestone state code')
  })
}

// convert fund transaction state flag to fund transaction state
export const deriveFundTransactionState = (
  fundTransaction: HSVFundTransaction
): FundTransactionState => {
  if (fundTransaction.state === FUND_TRANSACTION_STATE_APPROVE_FLAG) {
    return 'approve'
  } else if (fundTransaction.state === FUND_TRANSACTION_STATE_REJECT_FLAG) {
    return 'reject'
  } else if (fundTransaction.state === FUND_TRANSACTION_STATE_REFUNDED_FLAG) {
    return 'refunded'
  }

  throw new Error('Invalid fund transaction state code')
}
