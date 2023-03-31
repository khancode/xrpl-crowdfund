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
  fundRaiseGoalInDrops: bigint // Use BigInt to support 64-bit unsigned integer values
  fundRaiseEndDateInUnixSeconds: bigint
  totalAmountRaisedInDrops: bigint
  totalAmountRewardedInDrops: bigint
  totalReserveAmountInDrops: bigint
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
    fundRaiseGoalInDrops: bigint,
    fundRaiseEndDateInUnixSeconds: bigint,
    totalAmountRaisedInDrops: bigint,
    totalAmountRewardedInDrops: bigint,
    totalReserveAmountInDrops: bigint,
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
    this.fundRaiseGoalInDrops = fundRaiseGoalInDrops
    this.fundRaiseEndDateInUnixSeconds = fundRaiseEndDateInUnixSeconds
    this.totalAmountRaisedInDrops = totalAmountRaisedInDrops
    this.totalAmountRewardedInDrops = totalAmountRewardedInDrops
    this.totalReserveAmountInDrops = totalReserveAmountInDrops
    this.milestones = milestones
    this.fundTransactions = fundTransactions
    this.backers = backers
  }
}
