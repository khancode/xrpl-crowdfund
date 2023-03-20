// Import necessary types
import { UInt8, UInt32, UInt64, UInt224, VarString, XRPAddress } from './types'

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
