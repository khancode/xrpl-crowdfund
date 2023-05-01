import { BaseModel } from '../app/models/BaseModel'
import { HSVCampaignGeneralInfo } from '../app/models/HSVCampaignGeneralInfo'
import { HSVFundTransaction } from '../app/models/HSVFundTransaction'
import { HSVFundTransactionsPage } from '../app/models/HSVFundTransactionsPage'
import { HSVMilestone } from '../app/models/HSVMilestone'
import { HookState } from '../app/models/HookState'
import { HookStateEntry } from '../app/models/HookStateEntry'

type GetHookStateEntriesOfCampaignResponse<T extends BaseModel> = {
  generalInfo: HookStateEntry<T>
  fundTransactionsPages: HookStateEntry<T>[]
}

export function dateOffsetToUnixTimestampInSeconds(dateOffset: string): bigint {
  const [countStr, unit, relativity] = dateOffset.split('_')
  const count = parseInt(countStr)
  const now = new Date()
  let date: Date
  if (relativity === 'BEFORE') {
    if (unit === 'DAY') {
      date = new Date(now.setDate(now.getDate() - count))
    } else if (unit === 'MONTH') {
      date = new Date(now.setMonth(now.getMonth() - count))
    } else if (unit === 'YEAR') {
      date = new Date(now.setFullYear(now.getFullYear() - count))
    } else {
      throw new Error(`Invalid unit in ${dateOffset}`)
    }
  } else if (relativity === 'AFTER') {
    if (unit === 'DAY') {
      date = new Date(now.setDate(now.getDate() + count))
    } else if (unit === 'MONTH') {
      date = new Date(now.setMonth(now.getMonth() + count))
    } else if (unit === 'YEAR') {
      date = new Date(now.setFullYear(now.getFullYear() + count))
    } else {
      throw new Error(`Invalid unit in ${dateOffset}`)
    }
  } else {
    throw new Error(`Invalid relativity in ${dateOffset}`)
  }
  return BigInt(Math.floor(date.getTime() / 1000))
}

export function getHookStateEntriesOfCampaign<T extends BaseModel>(
  hookState: HookState<T>,
  campaignId: number
): GetHookStateEntriesOfCampaignResponse<T> {
  const entries = hookState.entries.filter(
    (entry) => entry.key.destinationTag === campaignId
  )
  if (entries.length === 0) {
    throw new Error(`No campaign with id ${campaignId} found`)
  }
  const generalInfo = entries.find((entry) => entry.key.dataLookupFlag === 0n)
  if (!generalInfo) {
    throw new Error(`No general info found for campaign with id ${campaignId}`)
  }
  const fundTransactionsPages = entries.filter(
    (entry) => entry.key.dataLookupFlag !== 0n
  )
  // sort fundTransactionsPages by dataLookupFlag in ascending order
  fundTransactionsPages.sort((a, b) => {
    if (a.key.dataLookupFlag < b.key.dataLookupFlag) {
      return -1
    } else if (a.key.dataLookupFlag > b.key.dataLookupFlag) {
      return 1
    } else {
      return 0
    }
  })
  return {
    generalInfo,
    fundTransactionsPages,
  }
}

export function verifyHookStateKey(
  hookStateKey: HookStateEntry<BaseModel>['key'],
  params: {
    destinationTag?: number
    dataLookupFlag?: bigint
  }
) {
  if (params.destinationTag) {
    expect(hookStateKey.destinationTag).toBe(params.destinationTag)
  }
  if (params.dataLookupFlag) {
    expect(hookStateKey.dataLookupFlag).toBe(params.dataLookupFlag)
  }
}

export function cloneHSVCampaignGeneralInfo(
  hsvGeneralInfo: HSVCampaignGeneralInfo | null,
  params?: {
    state?: number
    owner?: string
    fundRaiseGoalInDrops?: bigint
    fundRaiseEndDateInUnixSeconds?: bigint
    totalAmountRaisedInDrops?: bigint
    totalAmountNonRefundableInDrops?: bigint
    totalReserveAmountInDrops?: bigint
    totalRejectVotesForCurrentMilestone?: number
    totalFundTransactions?: number
    milestones?: HSVMilestone[]
  }
): HSVCampaignGeneralInfo {
  // copy the HSVCampaignGeneralInfo and modify the copy
  const modifiedHsvGeneralInfo: any =
    hsvGeneralInfo === null ? {} : { ...hsvGeneralInfo }

  if (params) {
    if (params.state !== undefined) {
      modifiedHsvGeneralInfo.state = params.state
    }
    if (params.owner !== undefined) {
      modifiedHsvGeneralInfo.owner = params.owner
    }
    if (params.fundRaiseGoalInDrops !== undefined) {
      modifiedHsvGeneralInfo.fundRaiseGoalInDrops = params.fundRaiseGoalInDrops
    }
    if (params.fundRaiseEndDateInUnixSeconds !== undefined) {
      modifiedHsvGeneralInfo.fundRaiseEndDateInUnixSeconds =
        params.fundRaiseEndDateInUnixSeconds
    }
    if (params.totalAmountRaisedInDrops !== undefined) {
      modifiedHsvGeneralInfo.totalAmountRaisedInDrops =
        params.totalAmountRaisedInDrops
    }
    if (params.totalAmountNonRefundableInDrops !== undefined) {
      modifiedHsvGeneralInfo.totalAmountNonRefundableInDrops =
        params.totalAmountNonRefundableInDrops
    }
    if (params.totalReserveAmountInDrops !== undefined) {
      modifiedHsvGeneralInfo.totalReserveAmountInDrops =
        params.totalReserveAmountInDrops
    }
    if (params.totalFundTransactions !== undefined) {
      modifiedHsvGeneralInfo.totalFundTransactions =
        params.totalFundTransactions
    }
    if (params.totalRejectVotesForCurrentMilestone !== undefined) {
      modifiedHsvGeneralInfo.totalRejectVotesForCurrentMilestone =
        params.totalRejectVotesForCurrentMilestone
    }
    if (params.milestones !== undefined) {
      modifiedHsvGeneralInfo.milestones = params.milestones
    }
  }

  return new HSVCampaignGeneralInfo(
    modifiedHsvGeneralInfo.state,
    modifiedHsvGeneralInfo.owner,
    modifiedHsvGeneralInfo.fundRaiseGoalInDrops,
    modifiedHsvGeneralInfo.fundRaiseEndDateInUnixSeconds,
    modifiedHsvGeneralInfo.totalAmountRaisedInDrops,
    modifiedHsvGeneralInfo.totalAmountNonRefundableInDrops,
    modifiedHsvGeneralInfo.totalReserveAmountInDrops,
    modifiedHsvGeneralInfo.totalFundTransactions,
    modifiedHsvGeneralInfo.totalRejectVotesForCurrentMilestone,
    modifiedHsvGeneralInfo.milestones
  )
}

export function cloneHSVFundTransactionsPage(
  hsvFundTransactionsPage: HSVFundTransactionsPage | null,
  params?: Array<{
    pageSlotIndex: number
    hsvFundTransaction: HSVFundTransaction
  }>
): HSVFundTransactionsPage {
  // copy the HSVFundTransactionsPage and modify the copy
  const modifiedHsvFundTransactionsPage: any =
    hsvFundTransactionsPage === null
      ? { fundTransactions: [] }
      : { ...hsvFundTransactionsPage }

  if (params) {
    params.forEach((param) => {
      if (param.pageSlotIndex >= 0) {
        modifiedHsvFundTransactionsPage.fundTransactions[param.pageSlotIndex] =
          param.hsvFundTransaction
      }
    })
  }

  return new HSVFundTransactionsPage(
    modifiedHsvFundTransactionsPage.fundTransactions
  )
}
