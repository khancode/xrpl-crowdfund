export class FundTransaction {
  id: number
  account: string // XRP address
  state: number // TODO - define possible states
  amountInDrops: bigint // Use BigInt to support 64-bit unsigned integer values

  constructor(
    id: number,
    account: string,
    state: number,
    amountInDrops: bigint
  ) {
    this.id = id
    this.account = account
    this.state = state
    this.amountInDrops = amountInDrops
  }
}
