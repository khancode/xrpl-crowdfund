import { AccountInfoRequest, Client, Request } from 'xrpl'
import {
  deriveCampaignState,
  DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_END_INDEX_FLAG,
  DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_START_INDEX_FLAG,
  DATA_LOOKUP_GENERAL_INFO_FLAG,
  HOOK_ACCOUNT_WALLET,
  deriveMilestonesStates,
  deriveFundTransactionState,
} from '../app/constants'
import config from '../../config.json'
import { ApplicationState } from '../app/models/ApplicationState'
import { BaseModel } from '../app/models/BaseModel'
import { Campaign } from '../app/models/Campaign'
import { HookState } from '../app/models/HookState'
import { HSVCampaignGeneralInfo } from '../app/models/HSVCampaignGeneralInfo'
import { deriveHookNamespace } from './transaction'
import { Milestone } from '../app/models/Milestone'
import { FundTransaction } from '../app/models/FundTransaction'
import { HSVFundTransactionsPage } from '../app/models/HSVFundTransactionsPage'
import { Backer } from '../app/models/Backer'

export class StateUtility {
  static async getHookState<T extends BaseModel>(
    client: Client
  ): Promise<HookState<T>> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }

    // Step 1. Get HookNamespaces from Hook Account
    const accountInfoRequest: AccountInfoRequest = {
      command: 'account_info',
      account: HOOK_ACCOUNT_WALLET.address,
    }
    const accountInfoResponse = await client.request(accountInfoRequest)
    // @ts-expect-error - this is defined
    const { HookNamespaces } = accountInfoResponse.result.account_data
    if (!HookNamespaces) {
      throw Error('No HookNamespaces found')
    }

    // Step 2. Derive HookNamespace
    const hookNamespaceDerived = deriveHookNamespace(config.HOOK_NAMESPACE_SEED)
    if (!HookNamespaces.includes(hookNamespaceDerived)) {
      throw Error(`HookNamespace not found for ${hookNamespaceDerived}`)
    }

    // Step 3. Get HookState from Hook Account using HookNamespace
    const accountNamespaceRequest: Request = {
      // @ts-expect-error - this command exists on Hooks Testnet v3
      command: 'account_namespace',
      account: HOOK_ACCOUNT_WALLET.address,
      namespace_id: hookNamespaceDerived,
    }
    const accountNamespaceResponse = await client.request(
      accountNamespaceRequest
    )
    // @ts-expect-error - this is defined
    const { namespace_entries: namespaceEntries } =
      accountNamespaceResponse.result

    // Step 4. Initialize HookState object
    const hookState = new HookState<T>(namespaceEntries)

    return hookState
  }

  static async getApplicationState(client: Client): Promise<ApplicationState> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }

    let hookState
    try {
      hookState = await StateUtility.getHookState(client)
    } catch (error: Error | any) {
      if (
        error?.message === 'No HookNamespaces found' ||
        error?.message.includes('HookNamespace not found for')
      ) {
        return new ApplicationState([]) // Return empty state
      }
      throw error
    }

    const destinationTagToCampaignMap: Map<number, Campaign> = new Map()
    const destinationTagToFundTransactionsMap: Map<number, FundTransaction[]> =
      new Map()
    const destinationTagToBackersMap: Map<number, Backer[]> = new Map()

    for (const entry of hookState.entries) {
      const { key, value } = entry
      const { dataLookupFlag, destinationTag } = key

      if (dataLookupFlag === DATA_LOOKUP_GENERAL_INFO_FLAG) {
        const generalInfo = value.decoded as HSVCampaignGeneralInfo
        const milestonesStates = deriveMilestonesStates(
          generalInfo.fundRaiseEndDateInUnixSeconds,
          generalInfo.milestones
        )
        const milestones: Milestone[] = generalInfo.milestones.map(
          (milestone, index) => {
            return new Milestone(
              milestonesStates[index],
              milestone.endDateInUnixSeconds,
              milestone.payoutPercent,
              'OFF-LEDGER DATA'
            )
          }
        )

        const campaign = new Campaign(
          key.destinationTag,
          deriveCampaignState(generalInfo),
          generalInfo.owner,
          'OFF-LEDGER DATA',
          'OFF-LEDGER DATA',
          'OFF-LEDGER DATA',
          generalInfo.fundRaiseGoalInDrops,
          generalInfo.fundRaiseEndDateInUnixSeconds,
          generalInfo.totalAmountRaisedInDrops,
          generalInfo.totalAmountRewardedInDrops,
          generalInfo.totalReserveAmountInDrops,
          generalInfo.totalRejectVotesForCurrentMilestone,
          milestones,
          [],
          []
        )
        destinationTagToCampaignMap.set(destinationTag, campaign)
      } else if (
        dataLookupFlag >= DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_START_INDEX_FLAG &&
        dataLookupFlag <= DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_END_INDEX_FLAG
      ) {
        const fundTransactionsPage = value.decoded as HSVFundTransactionsPage
        const fundTransactions = fundTransactionsPage.fundTransactions.map(
          (fundTransaction) => {
            /* Step 1. Create new FundTransaction object */
            const appFundTransaction = new FundTransaction(
              fundTransaction.id,
              fundTransaction.account,
              deriveFundTransactionState(fundTransaction),
              fundTransaction.amountInDrops
            )

            /* Step 2. Add/Update Backer object in destinationTagToBackersMap */
            if (!destinationTagToBackersMap.get(destinationTag)) {
              destinationTagToBackersMap.set(destinationTag, [])
            }
            const backers = destinationTagToBackersMap.get(destinationTag)

            // @ts-expect-error - this is defined from above check
            // OPTIMIZE: use a map instead of array for constant time O(1) lookup
            let backer = backers.find(
              (backer) => backer.account === fundTransaction.account
            )
            if (!backer) {
              backer = new Backer(fundTransaction.account, [])
              // @ts-expect-error - this is also defined from same check
              backers.push(backer)
            }

            backer.fundTransactions.push(appFundTransaction)

            /* Step 3. Return new application FundTransaction object */
            return appFundTransaction
          }
        )

        // Add fundTransactions to destinationTagToFundTransactionsMap
        const existingTransactions =
          destinationTagToFundTransactionsMap.get(destinationTag)
        destinationTagToFundTransactionsMap.set(
          destinationTag,
          existingTransactions
            ? existingTransactions.concat(fundTransactions)
            : fundTransactions
        )
      } else {
        throw Error(`Invalid dataLookupFlag: ${dataLookupFlag}`)
      }
    }

    // Add fundTransactions and backers to each campaign
    const campaigns: Campaign[] = []
    for (const [destinationTag, campaign] of destinationTagToCampaignMap) {
      // Add fundTransactions to campaign
      const fundTransactions =
        destinationTagToFundTransactionsMap.get(destinationTag)
      if (fundTransactions) {
        campaign.fundTransactions = fundTransactions
      }
      // Add backers to campaign
      const backers = destinationTagToBackersMap.get(destinationTag)
      if (backers) {
        campaign.backers = backers
      }
      campaigns.push(campaign)
    }

    return new ApplicationState(campaigns)
  }
}
