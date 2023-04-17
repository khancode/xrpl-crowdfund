import { FundTransaction } from './FundTransaction'

export class Backer {
  account: string // XRP address
  fundTransactions: FundTransaction[]

  constructor(account: string, fundTransactions: FundTransaction[]) {
    this.account = account
    this.fundTransactions = fundTransactions
  }

  /**
   * Used to serialize the Backer object into a JSON object
   * that can be sent as a server response.
   *
   * Note: BigInt values are converted to strings because JSON
   *    doesn't support BigInt values.
   *
   * @returns {object} - A JSON object representing the Backer
   *
   * @memberof Backer
   */
  serialize(): object {
    return {
      account: this.account,
      fundTransactions: this.fundTransactions.map((fundTransaction) => {
        return fundTransaction.serialize()
      }),
    }
  }
}
