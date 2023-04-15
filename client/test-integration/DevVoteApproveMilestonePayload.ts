import { UInt8, UInt32, UInt64 } from '../util/types'
import { MODE_DEV_VOTE_APPROVE_MILESTONE_FLAG } from '../app/constants'
import { BaseModel, Metadata } from '../app/models/BaseModel'

export class DevVoteApproveMilestonePayload extends BaseModel {
  modeFlag: UInt8
  mockCurrentTimeInUnixSeconds: UInt64
  fundTransactionId: UInt32

  constructor(mockCurrentTimeInUnixSeconds: UInt64, fundTransactionId: UInt32) {
    super()
    this.modeFlag = MODE_DEV_VOTE_APPROVE_MILESTONE_FLAG
    this.mockCurrentTimeInUnixSeconds = mockCurrentTimeInUnixSeconds
    this.fundTransactionId = fundTransactionId
  }

  getMetadata(): Metadata {
    return [
      {
        field: 'modeFlag',
        type: 'uint8',
      },
      {
        field: 'mockCurrentTimeInUnixSeconds',
        type: 'uint64',
      },
      {
        field: 'fundTransactionId',
        type: 'uint32',
      },
    ]
  }
}
