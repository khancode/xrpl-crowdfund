// Types
type UInt8 = number
type UInt32 = number
type UInt64 = bigint
type UInt224 = bigint
type VarString = string
type XRPAddress = string
type Model = {
  [key: string]:
    | UInt8
    | UInt32
    | UInt64
    | UInt224
    | VarString
    | XRPAddress
    | Model
    | VarModelArray
}
type VarModelArray = Model[]

export {
  UInt8,
  UInt32,
  UInt64,
  UInt224,
  VarString,
  XRPAddress,
  Model,
  VarModelArray,
}
