import { UInt224 } from '../../util/types'
import {
  DATA_LOOKUP_DESCRIPTION_FRAGMENT_END_INDEX_FLAG,
  DATA_LOOKUP_DESCRIPTION_FRAGMENT_START_INDEX_FLAG,
  DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_END_INDEX_FLAG,
  DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_START_INDEX_FLAG,
  DATA_LOOKUP_GENERAL_INFO_FLAG,
  DATA_LOOKUP_MILESTONES_PAGE_END_INDEX_FLAG,
  DATA_LOOKUP_MILESTONES_PAGE_START_INDEX_FLAG,
  DATA_LOOKUP_OVERVIEW_URL_FRAGMENT_END_INDEX_FLAG,
  DATA_LOOKUP_OVERVIEW_URL_FRAGMENT_START_INDEX_FLAG,
} from '../constants'
import { BaseModel } from './BaseModel'
import { HSVCampaignGeneralInfo } from './HSVCampaignGeneralInfo'

export class HookStateValue<T extends BaseModel> {
  dataLookupFlag: UInt224
  decoded: T

  constructor(dataLookupFlag: UInt224, decoded: T) {
    this.dataLookupFlag = dataLookupFlag
    this.decoded = decoded
  }

  static from<T extends BaseModel>(
    valueEncoded: string,
    dataLookupFlag: UInt224
  ): HookStateValue<T> {
    if (dataLookupFlag === DATA_LOOKUP_GENERAL_INFO_FLAG) {
      // @ts-expect-error - TS doesn't know that HSVCampaignGeneralInfo extends BaseModel
      return new HookStateValue(
        dataLookupFlag,
        BaseModel.decode(valueEncoded, HSVCampaignGeneralInfo)
      )
    } else if (
      dataLookupFlag >= DATA_LOOKUP_DESCRIPTION_FRAGMENT_START_INDEX_FLAG &&
      dataLookupFlag <= DATA_LOOKUP_DESCRIPTION_FRAGMENT_END_INDEX_FLAG
    ) {
      throw new Error('Description Fragment not implemented')
    } else if (
      dataLookupFlag >= DATA_LOOKUP_OVERVIEW_URL_FRAGMENT_START_INDEX_FLAG &&
      dataLookupFlag <= DATA_LOOKUP_OVERVIEW_URL_FRAGMENT_END_INDEX_FLAG
    ) {
      throw new Error('Overview URL Fragment not implemented')
    } else if (
      dataLookupFlag >= DATA_LOOKUP_MILESTONES_PAGE_START_INDEX_FLAG &&
      dataLookupFlag <= DATA_LOOKUP_MILESTONES_PAGE_END_INDEX_FLAG
    ) {
      throw new Error('Milestones Page not implemented')
    } else if (
      dataLookupFlag >= DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_START_INDEX_FLAG &&
      dataLookupFlag <= DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_END_INDEX_FLAG
    ) {
      throw new Error('Fund Transactions Page not implemented')
    } else {
      throw new Error(`Invalid dataLookupFlag: ${dataLookupFlag}`)
    }
  }
}
