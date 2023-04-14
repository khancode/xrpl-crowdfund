import { UInt8 } from '../util/types'
import { MODE_INTEG_FUND_CAMPAIGN_FLAG } from '../app/constants'
import { BaseModel, Metadata } from '../app/models/BaseModel'

export class IntegFundCampaignPayload extends BaseModel {
  modeFlag: UInt8

  constructor() {
    super()
    this.modeFlag = MODE_INTEG_FUND_CAMPAIGN_FLAG
  }

  getMetadata(): Metadata {
    return [{ field: 'modeFlag', type: 'uint8' }]
  }
}
