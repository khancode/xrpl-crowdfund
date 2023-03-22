import { VarString, UInt64, UInt32, UInt8 } from '../../util/types'
import {
  MODE_CREATE_CAMPAIGN_PART_A_FLAG,
  TITLE_MAX_LENGTH,
} from '../constants'
import { BaseModel, Metadata } from './BaseModel'

export class CreateCampaignPayloadPartA extends BaseModel {
  modeFlag: UInt8
  title: VarString
  fundRaiseGoalInDrops: UInt64
  fundRaiseEndDateInUnixSeconds: UInt32
  totalMilestones: UInt8

  constructor(
    title: VarString,
    fundRaiseGoalInDrops: UInt64,
    fundRaiseEndDateInUnixSeconds: UInt32,
    totalMilestones: UInt8
  ) {
    super()
    this.modeFlag = MODE_CREATE_CAMPAIGN_PART_A_FLAG
    this.title = title
    this.fundRaiseGoalInDrops = fundRaiseGoalInDrops
    this.fundRaiseEndDateInUnixSeconds = fundRaiseEndDateInUnixSeconds
    this.totalMilestones = totalMilestones
  }

  getMetadata(): Metadata {
    return [
      { field: 'modeFlag', type: 'uint8' },
      { field: 'title', type: 'varString', maxStringLength: TITLE_MAX_LENGTH },
      { field: 'fundRaiseGoalInDrops', type: 'uint64' },
      { field: 'fundRaiseEndDateInUnixSeconds', type: 'uint32' },
      { field: 'totalMilestones', type: 'uint8' },
    ]
  }
}
