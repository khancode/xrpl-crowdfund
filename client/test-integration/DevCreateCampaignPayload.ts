import { UInt64, UInt8 } from '../util/types'
import {
  MILESTONES_MAX_LENGTH,
  MODE_DEV_CREATE_CAMPAIGN_FLAG,
} from '../app/constants'
import { BaseModel, Metadata } from '../app/models/BaseModel'
import { MilestonePayload } from '../app/models/MilestonePayload'

export class DevCreateCampaignPayload extends BaseModel {
  modeFlag: UInt8
  mockCurrentTimeInUnixSeconds: UInt64
  fundRaiseGoalInDrops: UInt64
  fundRaiseEndDateInUnixSeconds: UInt64
  milestones: MilestonePayload[]

  constructor(
    mockCurrentTimeInUnixSeconds: UInt64,
    fundRaiseGoalInDrops: UInt64,
    fundRaiseEndDateInUnixSeconds: UInt64,
    milestones: MilestonePayload[]
  ) {
    super()
    this.modeFlag = MODE_DEV_CREATE_CAMPAIGN_FLAG
    this.mockCurrentTimeInUnixSeconds = mockCurrentTimeInUnixSeconds
    this.fundRaiseGoalInDrops = fundRaiseGoalInDrops
    this.fundRaiseEndDateInUnixSeconds = fundRaiseEndDateInUnixSeconds
    this.milestones = milestones
  }

  getMetadata(): Metadata {
    return [
      { field: 'modeFlag', type: 'uint8' },
      { field: 'mockCurrentTimeInUnixSeconds', type: 'uint64' },
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
