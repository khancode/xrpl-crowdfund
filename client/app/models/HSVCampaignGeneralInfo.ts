import { UInt32, UInt64, UInt8, VarString, XRPAddress } from '../../util/types'
import { TITLE_MAX_LENGTH } from '../constants'
import { BaseModel, Metadata } from './BaseModel'

export class HSVCampaignGeneralInfo extends BaseModel {
  state: UInt8
  owner: XRPAddress
  title: VarString
  fundRaiseGoalInDrops: UInt64
  fundRaiseEndDateInUnixSeconds: UInt64
  totalAmountRaisedInDrops: UInt64
  totalAmountRewardedInDrops: UInt64
  totalReserveAmountInDrops: UInt64
  totalMilestones: UInt8
  totalFundTransactions: UInt32

  constructor(
    state: UInt8,
    owner: XRPAddress,
    title: VarString,
    fundRaiseGoalInDrops: UInt64,
    fundRaiseEndDateInUnixSeconds: UInt64,
    totalAmountRaisedInDrops: UInt64,
    totalAmountRewardedInDrops: UInt64,
    totalReserveAmountInDrops: UInt64,
    totalMilestones: UInt8,
    totalFundTransactions: UInt32
  ) {
    super()
    this.state = state
    this.owner = owner
    this.title = title
    this.fundRaiseGoalInDrops = fundRaiseGoalInDrops
    this.fundRaiseEndDateInUnixSeconds = fundRaiseEndDateInUnixSeconds
    this.totalAmountRaisedInDrops = totalAmountRaisedInDrops
    this.totalAmountRewardedInDrops = totalAmountRewardedInDrops
    this.totalReserveAmountInDrops = totalReserveAmountInDrops
    this.totalMilestones = totalMilestones
    this.totalFundTransactions = totalFundTransactions
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
        field: 'title',
        type: 'varString',
        maxStringLength: TITLE_MAX_LENGTH,
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
        field: 'totalMilestones',
        type: 'uint8',
      },
      {
        field: 'totalFundTransactions',
        type: 'uint32',
      },
    ]
  }
}
