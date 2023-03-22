import { VarString, UInt8 } from '../../util/types'
import {
  DESCRIPTION_MAX_LENGTH,
  MILESTONES_MAX_LENGTH,
  MODE_CREATE_CAMPAIGN_PART_B_FLAG,
  OVERVIEW_URL_MAX_LENGTH,
} from '../constants'
import { BaseModel, Metadata } from './BaseModel'
import { MilestonePayload } from './MilestonePayload'

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
      {
        field: 'description',
        type: 'varString',
        maxStringLength: DESCRIPTION_MAX_LENGTH,
      },
      {
        field: 'overviewURL',
        type: 'varString',
        maxStringLength: OVERVIEW_URL_MAX_LENGTH,
      },
      {
        field: 'milestones',
        type: 'varModelArray',
        modelClass: MilestonePayload,
        maxArrayLength: MILESTONES_MAX_LENGTH,
      },
    ]
  }
}
