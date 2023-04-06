import { UInt8, UInt64 } from '../../util/types'
import { BaseModel, Metadata } from './BaseModel'

export class HSVMilestone extends BaseModel {
  state: UInt8
  endDateInUnixSeconds: UInt64
  payoutPercent: UInt8

  constructor(
    state: UInt8,
    endDateInUnixSeconds: UInt64,
    payoutPercent: UInt8
  ) {
    super()
    this.state = state
    this.endDateInUnixSeconds = endDateInUnixSeconds
    this.payoutPercent = payoutPercent
  }

  getMetadata(): Metadata {
    return [
      { field: 'state', type: 'uint8' },
      { field: 'endDateInUnixSeconds', type: 'uint64' },
      { field: 'payoutPercent', type: 'uint8' },
    ]
  }
}
