import { VarString, UInt8 } from '../../util/types'
import { MODE_CREATE_CAMPAIGN_PART_B_FLAG } from '../constants'
import { BaseModel, Metadata } from './BaseModel'
import { MilestonePayload } from './MilestonePayload'

const MILESTONES_MAX_LENGTH = 10

export class CreateCampaignPayloadPartB extends BaseModel {
  modeFlag: UInt8
  description: VarString
  overviewURL: VarString
  milestones: MilestonePayload[]

  constructor(
    description: VarString,
    overviewURL: VarString,
    milestones: MilestonePayload[]
  ) {
    super()
    this.modeFlag = MODE_CREATE_CAMPAIGN_PART_B_FLAG
    this.description = description
    this.overviewURL = overviewURL
    this.milestones = milestones
  }

  getMetadata(): Metadata {
    return [
      { field: 'modeFlag', type: 'uint8' },
      { field: 'description', type: 'varString', maxStringLength: 2500 },
      { field: 'overviewURL', type: 'varString', maxStringLength: 2300 },
      {
        field: 'milestones',
        type: 'varModelArray',
        modelClass: MilestonePayload,
        maxArrayLength: MILESTONES_MAX_LENGTH,
      },
    ]
  }
}
