import { CampaignState } from '../constants'
import { Backer } from './Backer'
import { FundTransaction } from './FundTransaction'
import { Milestone } from './Milestone'

export class Campaign {
  id: number // represents destinationTag
  state: CampaignState
  owner: string // XRP address
  title: string // Max length 75 utf-8 characters
  description: string // Max length 2,500 utf-8 characters
  overviewUrl: string // Max length 2,300 utf-8 characters
  imageUrl: string // Max length 2,300 utf-8 characters
  fundRaiseGoalInDrops: bigint // Use BigInt to support 64-bit unsigned integer values
  fundRaiseEndDateInUnixSeconds: bigint
  totalAmountRaisedInDrops: bigint
  totalAmountNonRefundableInDrops: bigint // Total amount of funds that don't count towards a refund payment (i.e. reserved for milestone payouts)
  totalReserveAmountInDrops: bigint
  totalRejectVotesForCurrentMilestone: number
  milestones: Milestone[]
  fundTransactions: FundTransaction[]
  backers: Backer[]

  constructor(
    id: number,
    state: CampaignState,
    owner: string,
    title: string,
    description: string,
    overviewUrl: string,
    imageUrl: string,
    fundRaiseGoalInDrops: bigint,
    fundRaiseEndDateInUnixSeconds: bigint,
    totalAmountRaisedInDrops: bigint,
    totalAmountNonRefundableInDrops: bigint,
    totalReserveAmountInDrops: bigint,
    totalRejectVotesForCurrentMilestone: number,
    milestones: Milestone[],
    fundTransactions: FundTransaction[],
    backers: Backer[]
  ) {
    this.id = id
    this.state = state
    this.owner = owner
    this.title = title
    this.description = description
    this.overviewUrl = overviewUrl
    this.imageUrl = imageUrl
    this.fundRaiseGoalInDrops = fundRaiseGoalInDrops
    this.fundRaiseEndDateInUnixSeconds = fundRaiseEndDateInUnixSeconds
    this.totalAmountRaisedInDrops = totalAmountRaisedInDrops
    this.totalAmountNonRefundableInDrops = totalAmountNonRefundableInDrops
    this.totalReserveAmountInDrops = totalReserveAmountInDrops
    this.totalRejectVotesForCurrentMilestone =
      totalRejectVotesForCurrentMilestone
    this.milestones = milestones
    this.fundTransactions = fundTransactions
    this.backers = backers
  }

  /**
   * Used to serialize the Campaign object into a JSON object
   * that can be sent as a server response.
   *
   * Note: BigInt values are converted to strings because JSON
   *       doesn't support BigInt values.
   *
   * @returns {object} - A JSON object representing the Campaign
   *
   * @memberof Campaign
   */
  serialize(): object {
    return {
      id: this.id,
      state: this.state,
      owner: this.owner,
      title: this.title,
      description: this.description,
      overviewUrl: this.overviewUrl,
      imageUrl: this.imageUrl,
      fundRaiseGoalInDrops: this.fundRaiseGoalInDrops.toString(),
      fundRaiseEndDateInUnixSeconds:
        this.fundRaiseEndDateInUnixSeconds.toString(),
      totalAmountRaisedInDrops: this.totalAmountRaisedInDrops.toString(),
      totalAmountNonRefundableInDrops:
        this.totalAmountNonRefundableInDrops.toString(),
      totalReserveAmountInDrops: this.totalReserveAmountInDrops.toString(),
      totalRejectVotesForCurrentMilestone:
        this.totalRejectVotesForCurrentMilestone,
      milestones: this.milestones.map((milestone) => {
        return milestone.serialize()
      }),
      fundTransactions: this.fundTransactions.map((fundTransaction) => {
        return fundTransaction.serialize()
      }),
      backers: this.backers.map((backer) => {
        return backer.serialize()
      }),
    }
  }
}
