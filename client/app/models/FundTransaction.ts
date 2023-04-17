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

  /**
   * Used to serialize the FundTransaction object into a JSON object
   * that can be sent as a server response.
   *
   * Note: BigInt values are converted to strings because JSON
   *     doesn't support BigInt values.
   *
   * @returns {object} - A JSON object representing the FundTransaction
   *
   * @memberof FundTransaction
   */
  serialize(): object {
    return {
      id: this.id,
      account: this.account,
      state: this.state,
      amountInDrops: this.amountInDrops.toString(),
    }
  }
}
