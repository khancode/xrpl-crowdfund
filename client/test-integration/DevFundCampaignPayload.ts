import { UInt64, UInt8 } from '../util/types'
import { MODE_DEV_FUND_CAMPAIGN_FLAG } from '../app/constants'
import { BaseModel, Metadata } from '../app/models/BaseModel'

export class DevFundCampaignPayload extends BaseModel {
  modeFlag: UInt8
  mockCurrentTimeInUnixSeconds: UInt64

  constructor(mockCurrentTimeInUnixSeconds: UInt64) {
    super()
    this.modeFlag = MODE_DEV_FUND_CAMPAIGN_FLAG
    this.mockCurrentTimeInUnixSeconds = mockCurrentTimeInUnixSeconds
  }

  getMetadata(): Metadata {
    return [
      { field: 'modeFlag', type: 'uint8' },
      { field: 'mockCurrentTimeInUnixSeconds', type: 'uint64' },
    ]
  }
}
