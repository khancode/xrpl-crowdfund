import { BaseModel } from '../app/models/BaseModel'
import { UInt8, UInt32, UInt64, UInt224, VarString, XRPAddress } from './types'

export function encode<T extends BaseModel>(model: T): string {
  const metadata = model.getMetadata()

  let result = ''
  for (const { field, type, maxStringLength } of metadata) {
    // @ts-expect-error -- this is functional
    const fieldValue = model[field]
    if (fieldValue === undefined) {
      throw Error(`Field ${field} is undefined in model`)
    }
    const encodedField = encodeField(fieldValue, type, maxStringLength)
    result += encodedField
  }

  return result
}

function encodeField(
  fieldValue: unknown,
  type: string,
  maxStringLength?: number
): string {
  switch (type) {
    case 'uint8':
      return uint8ToHex(fieldValue as UInt8)
    case 'uint32':
      return uint32ToHex(fieldValue as UInt32)
    case 'uint64':
      return uint64ToHex(fieldValue as UInt64)
    case 'uint224':
      return uint224ToHex(fieldValue as UInt224)
    case 'varString':
      if (maxStringLength === undefined) {
        throw Error('maxStringLength is required for type varString')
      }
      return varStringToHex(fieldValue as string, maxStringLength)
    case 'xrpAddress':
      return xrpAddressToHex(fieldValue as XRPAddress)
    default:
      throw Error(`Unknown type: ${type}`)
  }
}

export function uint8ToHex(value: UInt8): string {
  return value.toString(16).padStart(2, '0').toUpperCase()
}

export function uint32ToHex(value: UInt32): string {
  return value.toString(16).padStart(8, '0').toUpperCase()
}

export function uint64ToHex(value: UInt64): string {
  return value.toString(16).padStart(16, '0').toUpperCase()
}

export function uint224ToHex(value: UInt224): string {
  return value.toString(16).padStart(56, '0').toUpperCase()
}

export function lengthToHex(value: number, maxStringLength: number): string {
  if (maxStringLength <= 2 ** 8) {
    // 1-byte length
    return value.toString(16).padStart(2, '0')
  } else if (maxStringLength <= 2 ** 16) {
    // 2-byte length
    return value.toString(16).padStart(4, '0')
  }
  throw Error('maxStringLength exceeds 2 bytes')
}

export function varStringToHex(
  value: VarString,
  maxStringLength: number
): string {
  const prefixLength = lengthToHex(value.length, maxStringLength)
  const content = Buffer.from(value, 'utf8').toString('hex')
  const paddedContent = content.padEnd(maxStringLength * 2, '0')
  return (prefixLength + paddedContent).toUpperCase()
}

export function xrpAddressToHex(value: XRPAddress): string {
  const length = uint8ToHex(value.length)
  const content = Buffer.from(value, 'utf8').toString('hex')
  return (length + content.padEnd(70, '0')).toUpperCase() // 35 * 2 = 70
}
