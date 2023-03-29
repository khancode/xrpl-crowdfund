import { VarString, UInt8, UInt64 } from '../../util/types'
import { BaseModel, Metadata } from './BaseModel'

export class MilestonePayload extends BaseModel {
  title: VarString
  endDateInUnixSeconds: UInt64
  payoutPercent: UInt8

  constructor(
    title: VarString,
    endDateInUnixSeconds: UInt64,
    payoutPercent: UInt8
  ) {
    super()
    this.title = title
    this.endDateInUnixSeconds = endDateInUnixSeconds
    this.payoutPercent = payoutPercent
  }

  getMetadata(): Metadata {
    return [
      { field: 'title', type: 'varString', maxStringLength: 75 },
      { field: 'endDateInUnixSeconds', type: 'uint64' },
      { field: 'payoutPercent', type: 'uint8' },
    ]
  }
}
