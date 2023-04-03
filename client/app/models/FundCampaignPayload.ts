import { UInt8 } from '../../util/types'
import { MODE_FUND_CAMPAIGN_FLAG } from '../constants'
import { BaseModel, Metadata } from './BaseModel'

export class FundCampaignPayload extends BaseModel {
  modeFlag: UInt8

  constructor() {
    super()
    this.modeFlag = MODE_FUND_CAMPAIGN_FLAG
  }

  getMetadata(): Metadata {
    return [{ field: 'modeFlag', type: 'uint8' }]
  }
}
