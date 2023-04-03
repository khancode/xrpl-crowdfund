import { UInt8, UInt64, UInt32, XRPAddress } from '../../util/types'
import { BaseModel, Metadata } from './BaseModel'

export class HSVFundTransaction extends BaseModel {
  id: UInt32
  account: XRPAddress
  state: UInt8
  amountInDrops: UInt64

  constructor(
    id: UInt32,
    account: XRPAddress,
    state: UInt8,
    amountInDrops: UInt64
  ) {
    super()
    this.id = id
    this.account = account
    this.state = state
    this.amountInDrops = amountInDrops
  }

  getMetadata(): Metadata {
    return [
      {
        field: 'id',
        type: 'uint32',
      },
      {
        field: 'account',
        type: 'xrpAddress',
      },
      {
        field: 'state',
        type: 'uint8',
      },
      {
        field: 'amountInDrops',
        type: 'uint64',
      },
    ]
  }
}
