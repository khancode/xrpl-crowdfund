import { FundTransaction } from './FundTransaction'

export class Backer {
  account: string // XRP address
  fundTransactions: FundTransaction[]

  constructor(account: string, fundTransactions: FundTransaction[]) {
    this.account = account
    this.fundTransactions = fundTransactions
  }
}
