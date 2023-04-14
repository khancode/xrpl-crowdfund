import accounts from './accounts.json'
import { client, connectClient, disconnectClient } from '../util/xrplClient'
import { Wallet } from 'xrpl'
import { Application, CreateCampaignParams } from '../app/Application'
import { StateUtility } from '../util/StateUtility'
import {
  dateOffsetToUnixTimestampInSeconds,
  getHookStateEntriesOfCampaign,
  cloneHSVCampaignGeneralInfo,
  verifyHookStateKey,
} from './testUtil'
import { HSVCampaignGeneralInfo } from '../app/models/HSVCampaignGeneralInfo'
import {
  CAMPAIGN_STATE_DERIVE_FLAG,
  MILESTONE_STATE_DERIVE_FLAG,
} from '../app/constants'
import { HSVMilestone } from '../app/models/HSVMilestone'

describe('createCampaign', () => {
  let owner: Wallet
  let backer1: Wallet
  let backer2: Wallet
  let backer3: Wallet

  beforeAll(async () => {
    await connectClient()

    const createCampaignAccounts = accounts['createCampaign']
    owner = Wallet.fromSeed(createCampaignAccounts[0].seed)
    backer1 = Wallet.fromSeed(createCampaignAccounts[1].seed)
    backer2 = Wallet.fromSeed(createCampaignAccounts[2].seed)
    backer3 = Wallet.fromSeed(createCampaignAccounts[3].seed)
  })

  afterAll(async () => {
    await disconnectClient()
  })

  it('should create a campaign with 3 milestones', async () => {
    // Get the current HookState
    let hookState
    try {
      hookState = await StateUtility.getHookState(client)
    } catch (err: any) {
      if (err.message.includes('No HookNamespaces found')) {
        hookState = { entries: [] }
      } else {
        throw err
      }
    }
    const hookStateBefore = hookState

    const params: CreateCampaignParams = {
      ownerWallet: owner,
      depositInDrops: 100000100n,
      title: 'OFF-LEDGER DATA',
      description: 'OFF-LEDGER DATA',
      overviewURL: 'OFF-LEDGER DATA',
      fundRaiseGoalInDrops: 100000000n,
      fundRaiseEndDateInUnixSeconds:
        dateOffsetToUnixTimestampInSeconds('1_MONTH_AFTER'),
      milestones: [
        {
          endDateInUnixSeconds:
            dateOffsetToUnixTimestampInSeconds('2_MONTH_AFTER'),
          title: 'OFF-LEDGER DATA',
          payoutPercent: 25,
        },
        {
          endDateInUnixSeconds:
            dateOffsetToUnixTimestampInSeconds('3_MONTH_AFTER'),
          title: 'OFF-LEDGER DATA',
          payoutPercent: 25,
        },
        {
          endDateInUnixSeconds:
            dateOffsetToUnixTimestampInSeconds('5_MONTH_AFTER'),
          title: 'OFF-LEDGER DATA',
          payoutPercent: 50,
        },
      ],
    }

    const campaignId = await Application.createCampaign(client, params)

    // Verify that the campaign was created and saved to Hook State
    const hookStateAfter = await StateUtility.getHookState(client)

    const newHookStateEntries = getHookStateEntriesOfCampaign(
      hookStateAfter,
      campaignId
    )

    const hsvGeneralInfo = newHookStateEntries.generalInfo.value
      .decoded as HSVCampaignGeneralInfo

    expect(campaignId).toBeDefined()
    expect(hookStateAfter.entries.length).toBe(
      hookStateBefore.entries.length + 1
    )
    expect(newHookStateEntries.generalInfo).toBeDefined()
    expect(newHookStateEntries.fundTransactionsPages.length).toBe(0)

    verifyHookStateKey(newHookStateEntries.generalInfo.key, {
      destinationTag: campaignId,
      dataLookupFlag: 0n,
    })

    const expectHsvGeneralInfo = cloneHSVCampaignGeneralInfo(null, {
      state: CAMPAIGN_STATE_DERIVE_FLAG,
      owner: params.ownerWallet.address,
      fundRaiseGoalInDrops: params.fundRaiseGoalInDrops,
      fundRaiseEndDateInUnixSeconds: params.fundRaiseEndDateInUnixSeconds,
      totalAmountRaisedInDrops: 0n,
      totalAmountNonRefundableInDrops: 0n,
      totalReserveAmountInDrops: 100000100n,
      totalRejectVotesForCurrentMilestone: 0,
      totalFundTransactions: 0,
      milestones: params.milestones.map((m) => {
        return new HSVMilestone(
          MILESTONE_STATE_DERIVE_FLAG,
          m.endDateInUnixSeconds,
          m.payoutPercent
        )
      }),
    })

    expect(hsvGeneralInfo).toEqual(expectHsvGeneralInfo)
  })
})
