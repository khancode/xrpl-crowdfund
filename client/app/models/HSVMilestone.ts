import { UInt8, UInt64, UInt32 } from '../../util/types'
import { BaseModel, Metadata } from './BaseModel'

export class HSVMilestone extends BaseModel {
  state: UInt8
  endDateInUnixSeconds: UInt64
  payoutPercent: UInt8
  refundVotes: UInt32

  constructor(
    state: UInt8,
    endDateInUnixSeconds: UInt64,
    payoutPercent: UInt8,
    refundVotes: UInt32
  ) {
    super()
    this.state = state
    this.endDateInUnixSeconds = endDateInUnixSeconds
    this.payoutPercent = payoutPercent
    this.refundVotes = refundVotes
  }

  getMetadata(): Metadata {
    return [
      { field: 'state', type: 'uint8' },
      { field: 'endDateInUnixSeconds', type: 'uint64' },
      { field: 'payoutPercent', type: 'uint8' },
      { field: 'refundVotes', type: 'uint32' },
    ]
  }
}
