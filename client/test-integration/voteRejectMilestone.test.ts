import accounts from './accounts.json'
import { client, connectClient, disconnectClient } from '../util/xrplClient'
import { Wallet } from 'xrpl'
import { Application, VoteRejectMilestoneParams } from '../app/Application'
import { StateUtility } from '../util/StateUtility'
import {
  IntegApplication,
  IntegCreateCampaignParams,
  IntegFundCampaignParams,
} from './IntegApplication'
import { dateOffsetToUnixTimestampInSeconds } from './testUtil'

// TODO: implement this test
describe.skip('voteRejectMilestone', () => {
  let owner: Wallet
  let backer1: Wallet
  let backer2: Wallet
  let backer3: Wallet
  let campaignId: number
  let fundTransactionId1: number
  let fundTransactionId2: number

  beforeAll(async () => {
    await connectClient()

    const voteRejectMilestoneAccounts = accounts['voteRejectMilestone']
    owner = Wallet.fromSeed(voteRejectMilestoneAccounts[0].seed)
    backer1 = Wallet.fromSeed(voteRejectMilestoneAccounts[1].seed)
    backer2 = Wallet.fromSeed(voteRejectMilestoneAccounts[2].seed)
    backer3 = Wallet.fromSeed(voteRejectMilestoneAccounts[3].seed)

    const createCampaignParams: IntegCreateCampaignParams = {
      ownerWallet: owner,
      depositInDrops: 100000100n,
      title: 'OFF-LEDGER DATA',
      description: 'OFF-LEDGER DATA',
      overviewURL: 'OFF-LEDGER DATA',
      fundRaiseGoalInDrops: 100000000n,
      fundRaiseEndDateInUnixSeconds:
        dateOffsetToUnixTimestampInSeconds('1_MONTH_BEFORE'),
      milestones: [
        {
          endDateInUnixSeconds:
            dateOffsetToUnixTimestampInSeconds('1_MONTH_AFTER'),
          title: 'OFF-LEDGER DATA',
          payoutPercent: 25,
        },
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
          payoutPercent: 50,
        },
      ],
    }

    campaignId = await IntegApplication.createCampaign(
      client,
      createCampaignParams
    )

    const fundCampaignParams1: IntegFundCampaignParams = {
      backerWallet: backer1,
      campaignId,
      fundAmountInDrops: 400000000n,
    }
    fundTransactionId1 = await IntegApplication.fundCampaign(
      client,
      fundCampaignParams1
    )

    const fundCampaignParams2: IntegFundCampaignParams = {
      backerWallet: backer2,
      campaignId,
      fundAmountInDrops: 400000000n,
    }
    fundTransactionId2 = await IntegApplication.fundCampaign(
      client,
      fundCampaignParams2
    )
  })

  afterAll(async () => {
    await disconnectClient()
  })

  it('should vote reject milestone a campaign with only 2 backers', async () => {
    // Get the current HookState
    const hookStateBefore = await StateUtility.getHookState(client)

    // Vote reject milestone
    const params: VoteRejectMilestoneParams = {
      backerWallet: backer1,
      campaignId,
      fundTransactionId: fundTransactionId1,
    }

    await Application.voteRejectMilestone(client, params)

    // Verify that vote reject milestone made changes to Hook State
    const hookStateAfter = await StateUtility.getHookState(client)

    expect(hookStateAfter.entries.length).toBe(hookStateBefore.entries.length)
  })
})
