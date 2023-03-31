import { FundTransactionState } from '../constants'

export class FundTransaction {
  id: number
  account: string // XRP address
  state: FundTransactionState
  amountInDrops: bigint // Use BigInt to support 64-bit unsigned integer values

  constructor(
    id: number,
    account: string,
    state: FundTransactionState,
    amountInDrops: bigint
  ) {
    this.id = id
    this.account = account
    this.state = state
    this.amountInDrops = amountInDrops
  }
}
