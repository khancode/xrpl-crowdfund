import { BaseModel } from '../app/models/BaseModel'
import { lengthToHex } from './encode'
import { UInt8, UInt32, UInt64, UInt224, VarString, XRPAddress } from './types'

export function decode<T extends BaseModel>(hex: string, model: T): unknown[] {
  const metadata = model.getMetadata()
  const decodedFields: unknown[] = []

  let hexIndex = 0
  for (const { type, maxStringLength } of metadata) {
    let fieldHex = ''
    switch (type) {
      case 'uint8':
        fieldHex = hex.slice(hexIndex, hexIndex + 2)
        hexIndex += 2
        break
      case 'uint32':
        fieldHex = hex.slice(hexIndex, hexIndex + 8)
        hexIndex += 8
        break
      case 'uint64':
        fieldHex = hex.slice(hexIndex, hexIndex + 16)
        hexIndex += 16
        break
      case 'uint224':
        fieldHex = hex.slice(hexIndex, hexIndex + 56)
        hexIndex += 56
        break
      case 'varString':
        if (maxStringLength === undefined) {
          throw Error('maxStringLength is required for type varString')
        }
        const prefixLengthHex = maxStringLength <= 2 ** 8 ? 2 : 4
        const length = prefixLengthHex + maxStringLength * 2
        fieldHex = hex.slice(hexIndex, hexIndex + length)
        hexIndex += length
        break
      case 'xrpAddress':
        fieldHex = hex.slice(hexIndex, hexIndex + 72)
        hexIndex += 72
        break
      default:
        throw Error(`Unknown type: ${type}`)
    }
    const decodedField = decodeField(fieldHex, type, maxStringLength)
    decodedFields.push(decodedField)
  }

  return decodedFields
}

function decodeField(
  hex: string,
  type: string,
  maxStringLength?: number
): unknown {
  switch (type) {
    case 'uint8':
      return hexToUInt8(hex)
    case 'uint32':
      return hexToUInt32(hex)
    case 'uint64':
      return hexToUInt64(hex)
    case 'uint224':
      return hexToUInt224(hex)
    case 'varString':
      if (maxStringLength === undefined) {
        throw Error('maxStringLength is required for type varString')
      }
      return hexToVarString(hex, maxStringLength)
    case 'xrpAddress':
      return hexToXRPAddress(hex)
    default:
      throw Error(`Unknown type: ${type}`)
  }
}

export function hexToUInt8(hex: string): UInt8 {
  return parseInt(hex, 16)
}

export function hexToUInt32(hex: string): UInt32 {
  return parseInt(hex, 16)
}

export function hexToUInt64(hex: string): UInt64 {
  return BigInt(`0x${hex}`)
}

export function hexToUInt224(hex: string): UInt224 {
  return BigInt(`0x${hex}`)
}

function hexToVarStringLength(hex: string, maxStringLength: number): number {
  if (maxStringLength <= 2 ** 8) {
    // 1-byte length
    return parseInt(hex.slice(0, 2), 16)
  } else if (maxStringLength <= 2 ** 16) {
    // 2-byte length
    return parseInt(hex.slice(0, 4), 16)
  }
  throw Error('maxStringLength exceeds 2 bytes')
}

export function hexToVarString(
  hex: string,
  maxStringLength: number
): VarString {
  const length = hexToVarStringLength(hex, maxStringLength)
  const prefixLength = lengthToHex(length, maxStringLength)
  const content = hex.slice(prefixLength.length)
  return Buffer.from(content, 'hex').toString('utf8').slice(0, length)
}

export function hexToXRPAddress(hex: string): XRPAddress {
  const length = hexToUInt8(hex.slice(0, 2))
  const value = Buffer.from(hex.slice(2), 'hex').toString('utf8')
  return value.slice(0, length)
}
