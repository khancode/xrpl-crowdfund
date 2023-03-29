import { UInt224, UInt32 } from '../../util/types'
import { BaseModel, Metadata } from './BaseModel'

export class HookStateKey extends BaseModel {
  dataLookupFlag: UInt224
  destinationTag: UInt32

  constructor(dataLookupFlag: UInt224, destinationTag: UInt32) {
    super()
    this.dataLookupFlag = dataLookupFlag
    this.destinationTag = destinationTag
  }

  getMetadata(): Metadata<BaseModel> {
    return [
      {
        field: 'dataLookupFlag',
        type: 'uint224',
      },
      {
        field: 'destinationTag',
        type: 'uint32',
      },
    ]
  }

  static from(keyEncoded: string): HookStateKey {
    return BaseModel.decode(keyEncoded, HookStateKey)
  }
}
