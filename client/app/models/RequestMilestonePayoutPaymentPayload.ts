import { UInt8 } from '../../util/types'
import { MODE_REQUEST_MILESTONE_PAYOUT_PAYMENT_FLAG } from '../constants'
import { BaseModel, Metadata } from './BaseModel'

export class RequestMilestonePayoutPaymentPayload extends BaseModel {
  modeFlag: UInt8
  milestoneIndex: UInt8

  constructor(milestoneIndex: UInt8) {
    super()
    this.modeFlag = MODE_REQUEST_MILESTONE_PAYOUT_PAYMENT_FLAG
    this.milestoneIndex = milestoneIndex
  }

  getMetadata(): Metadata {
    return [
      {
        field: 'modeFlag',
        type: 'uint8',
      },
      {
        field: 'milestoneIndex',
        type: 'uint8',
      },
    ]
  }
}
