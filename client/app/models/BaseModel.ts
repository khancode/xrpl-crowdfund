import { encode } from '../../util/encode'
import { decode } from '../../util/decode'
import { Metadata } from './types'

export abstract class BaseModel {
  abstract getMetadata(): Metadata

  encode(): string {
    return encode(this)
  }

  static decode<T extends BaseModel>(
    hex: string,
    modelClass: new (...args: never[]) => T
  ): T {
    // @ts-expect-error - this is functionally correct
    const emptyModel = modelClass.createEmpty()
    const decodedFields = decode(hex, emptyModel)
    const metadata = emptyModel.getMetadata()

    for (let i = 0; i < metadata.length; i++) {
      const field = metadata[i]
      emptyModel[field.field] = decodedFields[i]
    }

    return emptyModel as T
  }

  private static createEmpty<T extends BaseModel>(
    this: new (...args: unknown[]) => T
  ): T {
    const modelArgs = this.prototype.getMetadata().map((metadata: Metadata) => {
      // @ts-expect-error - This is expected to be a Metadata object
      switch (metadata.type) {
        case 'uint8':
          return 0
        case 'uint32':
          return 0
        case 'uint64':
          return BigInt(0)
        case 'uint224':
          return BigInt(0)
        case 'varString':
          return ''
        case 'xrpAddress':
          return ''
        default:
          // @ts-expect-error - This is expected to be a Metadata object
          throw Error(`Unknown type: ${metadata.type}`)
      }
    })
    return new this(...modelArgs)
  }
}
