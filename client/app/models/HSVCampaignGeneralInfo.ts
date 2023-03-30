import { UInt32, UInt64, UInt8, XRPAddress } from '../../util/types'
import { MILESTONES_MAX_LENGTH } from '../constants'
import { BaseModel, Metadata } from './BaseModel'
import { HSVMilestone } from './HSVMilestone'

export class HSVCampaignGeneralInfo extends BaseModel {
  state: UInt8
  owner: XRPAddress
  fundRaiseGoalInDrops: UInt64
  fundRaiseEndDateInUnixSeconds: UInt64
  totalAmountRaisedInDrops: UInt64
  totalAmountRewardedInDrops: UInt64
  totalReserveAmountInDrops: UInt64
  totalFundTransactions: UInt32
  milestones: HSVMilestone[]

  constructor(
    state: UInt8,
    owner: XRPAddress,
    fundRaiseGoalInDrops: UInt64,
    fundRaiseEndDateInUnixSeconds: UInt64,
    totalAmountRaisedInDrops: UInt64,
    totalAmountRewardedInDrops: UInt64,
    totalReserveAmountInDrops: UInt64,
    totalFundTransactions: UInt32,
    milestones: HSVMilestone[]
  ) {
    super()
    this.state = state
    this.owner = owner
    this.fundRaiseGoalInDrops = fundRaiseGoalInDrops
    this.fundRaiseEndDateInUnixSeconds = fundRaiseEndDateInUnixSeconds
    this.totalAmountRaisedInDrops = totalAmountRaisedInDrops
    this.totalAmountRewardedInDrops = totalAmountRewardedInDrops
    this.totalReserveAmountInDrops = totalReserveAmountInDrops
    this.totalFundTransactions = totalFundTransactions
    this.milestones = milestones
  }

  getMetadata(): Metadata<BaseModel> {
    return [
      {
        field: 'state',
        type: 'uint8',
      },
      {
        field: 'owner',
        type: 'xrpAddress',
      },
      {
        field: 'fundRaiseGoalInDrops',
        type: 'uint64',
      },
      {
        field: 'fundRaiseEndDateInUnixSeconds',
        type: 'uint64',
      },
      {
        field: 'totalAmountRaisedInDrops',
        type: 'uint64',
      },
      {
        field: 'totalAmountRewardedInDrops',
        type: 'uint64',
      },
      {
        field: 'totalReserveAmountInDrops',
        type: 'uint64',
      },
      {
        field: 'totalFundTransactions',
        type: 'uint32',
      },
      {
        field: 'milestones',
        type: 'varModelArray',
        modelClass: HSVMilestone,
        maxArrayLength: MILESTONES_MAX_LENGTH,
      },
    ]
  }
}
