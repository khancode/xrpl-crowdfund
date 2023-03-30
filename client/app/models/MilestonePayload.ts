import { UInt8, UInt64 } from '../../util/types'
import { BaseModel, Metadata } from './BaseModel'

export class MilestonePayload extends BaseModel {
  endDateInUnixSeconds: UInt64
  payoutPercent: UInt8

  constructor(endDateInUnixSeconds: UInt64, payoutPercent: UInt8) {
    super()
    this.endDateInUnixSeconds = endDateInUnixSeconds
    this.payoutPercent = payoutPercent
  }

  getMetadata(): Metadata {
    return [
      { field: 'endDateInUnixSeconds', type: 'uint64' },
      { field: 'payoutPercent', type: 'uint8' },
    ]
  }
}
