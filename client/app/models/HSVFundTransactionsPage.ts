import { FUND_TRANSACTIONS_PAGE_MAX_SIZE } from '../constants'
import { BaseModel, Metadata } from './BaseModel'
import { HSVFundTransaction } from './HSVFundTransaction'

export class HSVFundTransactionsPage extends BaseModel {
  fundTransactions: HSVFundTransaction[]

  constructor(fundTransactions: HSVFundTransaction[]) {
    super()
    this.fundTransactions = fundTransactions
  }

  getMetadata(): Metadata<BaseModel> {
    return [
      {
        field: 'fundTransactions',
        type: 'varModelArray',
        modelClass: HSVFundTransaction,
        maxArrayLength: FUND_TRANSACTIONS_PAGE_MAX_SIZE,
      },
    ]
  }
}
