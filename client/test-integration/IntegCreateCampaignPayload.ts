import { UInt64, UInt8 } from '../util/types'
import {
  MILESTONES_MAX_LENGTH,
  MODE_INTEG_CREATE_CAMPAIGN_FLAG,
} from '../app/constants'
import { BaseModel, Metadata } from '../app/models/BaseModel'
import { MilestonePayload } from '../app/models/MilestonePayload'

export class IntegCreateCampaignPayload extends BaseModel {
  modeFlag: UInt8
  fundRaiseGoalInDrops: UInt64
  fundRaiseEndDateInUnixSeconds: UInt64
  milestones: MilestonePayload[]

  constructor(
    fundRaiseGoalInDrops: UInt64,
    fundRaiseEndDateInUnixSeconds: UInt64,
    milestones: MilestonePayload[]
  ) {
    super()
    this.modeFlag = MODE_INTEG_CREATE_CAMPAIGN_FLAG
    this.fundRaiseGoalInDrops = fundRaiseGoalInDrops
    this.fundRaiseEndDateInUnixSeconds = fundRaiseEndDateInUnixSeconds
    this.milestones = milestones
  }

  getMetadata(): Metadata {
    return [
      { field: 'modeFlag', type: 'uint8' },
      { field: 'fundRaiseGoalInDrops', type: 'uint64' },
      { field: 'fundRaiseEndDateInUnixSeconds', type: 'uint64' },
      {
        field: 'milestones',
        type: 'varModelArray',
        modelClass: MilestonePayload,
        maxArrayLength: MILESTONES_MAX_LENGTH,
      },
    ]
  }
}
