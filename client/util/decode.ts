// Import necessary types
import { lengthToHex } from './encode'
import { UInt8, UInt32, UInt64, UInt224, VarString, XRPAddress } from './types'

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
