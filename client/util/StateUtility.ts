import { AccountInfoRequest, Request } from 'xrpl'
import {
  CampaignStateFlag,
  campaignStateFlagToCampaignState,
  DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_END_INDEX_FLAG,
  DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_START_INDEX_FLAG,
  DATA_LOOKUP_GENERAL_INFO_FLAG,
  HOOK_ACCOUNT_WALLET,
  MilestoneStateFlag,
  milestoneStateFlagToMilestoneState,
} from '../app/constants'
import config from '../../config.json'
import { ApplicationState } from '../app/models/ApplicationState'
import { BaseModel } from '../app/models/BaseModel'
import { Campaign } from '../app/models/Campaign'
import { HookState } from '../app/models/HookState'
import { HSVCampaignGeneralInfo } from '../app/models/HSVCampaignGeneralInfo'
import { deriveHookNamespace } from './transaction'
import { client, connectClient, disconnectClient } from './xrplClient'
import { Milestone } from '../app/models/Milestone'

export class StateUtility {
  static async getHookState<T extends BaseModel>(): Promise<HookState<T>> {
    // Step 1. Connect to XRPL client
    await connectClient()

    // Step 2. Get HookNamespaces from Hook Account
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

    // Step 3. Derive HookNamespace
    const hookNamespaceDerived = deriveHookNamespace(config.HOOK_NAMESPACE_SEED)
    if (!HookNamespaces.includes(hookNamespaceDerived)) {
      throw Error(`HookNamespace not found for ${hookNamespaceDerived}`)
    }

    // Step 4. Get HookState from Hook Account using HookNamespace
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

    // Step 5. Initialize HookState object
    const hookState = new HookState<T>(namespaceEntries)

    // Step 6. Disconnect XRPL client
    await disconnectClient()

    return hookState
  }

  static async getApplicationState(): Promise<ApplicationState> {
    const hookState = await StateUtility.getHookState()

    const campaigns: Campaign[] = []
    for (const entry of hookState.entries) {
      const { key, value } = entry
      const { dataLookupFlag } = key
      if (dataLookupFlag === DATA_LOOKUP_GENERAL_INFO_FLAG) {
        const generalInfo = value.decoded as HSVCampaignGeneralInfo
        const milestones: Milestone[] = generalInfo.milestones.map(
          (milestone) => {
            return new Milestone(
              milestoneStateFlagToMilestoneState(
                milestone.state as MilestoneStateFlag
              ),
              milestone.endDateInUnixSeconds,
              milestone.payoutPercent,
              milestone.rejectVotes,
              'OFF-LEDGER DATA'
            )
          }
        )

        const campaign = new Campaign(
          key.destinationTag,
          campaignStateFlagToCampaignState(
            generalInfo.state as CampaignStateFlag
          ),
          generalInfo.owner,
          'OFF-LEDGER DATA',
          'OFF-LEDGER DATA',
          'OFF-LEDGER DATA',
          generalInfo.fundRaiseGoalInDrops,
          generalInfo.fundRaiseEndDateInUnixSeconds,
          generalInfo.totalAmountRaisedInDrops,
          generalInfo.totalAmountRewardedInDrops,
          generalInfo.totalReserveAmountInDrops,
          milestones,
          [],
          []
        )
        campaigns.push(campaign)
      } else if (
        dataLookupFlag >= DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_START_INDEX_FLAG ||
        dataLookupFlag === DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_END_INDEX_FLAG
      ) {
        throw Error('Fund Transactions not supported yet')
      } else {
        throw Error(`Invalid dataLookupFlag: ${dataLookupFlag}`)
      }
    }

    return new ApplicationState(campaigns)
  }
}
