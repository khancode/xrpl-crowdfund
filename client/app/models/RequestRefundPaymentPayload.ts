import { UInt8, UInt32 } from '../../util/types'
import { MODE_REQUEST_REFUND_PAYMENT_FLAG } from '../constants'
import { BaseModel, Metadata } from './BaseModel'

export class RequestRefundPaymentPayload extends BaseModel {
  modeFlag: UInt8
  fundTransactionId: UInt32

  constructor(fundTransactionId: UInt32) {
    super()
    this.modeFlag = MODE_REQUEST_REFUND_PAYMENT_FLAG
    this.fundTransactionId = fundTransactionId
  }

  getMetadata(): Metadata {
    return [
      {
        field: 'modeFlag',
        type: 'uint8',
      },
      {
        field: 'fundTransactionId',
        type: 'uint32',
      },
    ]
  }
}
