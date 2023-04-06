import { UInt8, UInt32 } from '../../util/types'
import { MODE_VOTE_APPROVE_MILESTONE_FLAG } from '../constants'
import { BaseModel, Metadata } from './BaseModel'

export class VoteApproveMilestonePayload extends BaseModel {
  modeFlag: UInt8
  fundTransactionId: UInt32

  constructor(fundTransactionId: UInt32) {
    super()
    this.modeFlag = MODE_VOTE_APPROVE_MILESTONE_FLAG
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
