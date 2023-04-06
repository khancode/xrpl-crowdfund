import { Wallet } from 'xrpl'
import { Application } from '../app/Application'
import { fundWallet } from '../util/fundWallet'
import { client, connectClient, disconnectClient } from '../util/xrplClient'
import { StateUtility } from '../util/StateUtility'
import {
  CAMPAIGN_STATE_DERIVE_FLAG,
  DATA_LOOKUP_GENERAL_INFO_FLAG,
  MILESTONE_STATE_DERIVE_FLAG,
} from '../app/constants'
import { HSVCampaignGeneralInfo } from '../app/models/HSVCampaignGeneralInfo'
import { HookState } from '../app/models/HookState'

describe.skip('Application.createCampaign', () => {
  let ownerWallet: Wallet

  beforeAll(async () => {
    await connectClient()
    // NOTE: Must wait 10 seconds before funding a new wallet again on Hooks Testnet v3.
    ownerWallet = await fundWallet()
    // sleep 2 seconds to allow fund wallet changes to be validated on the ledger
    await new Promise((resolve) => setTimeout(resolve, 2000))
  })

  afterAll(async () => {
    await disconnectClient()
  })

  it('should create a campaign', async () => {
    let hookStateResult
    try {
      hookStateResult = await StateUtility.getHookState(client)
    } catch (error: Error | any) {
      if (
        error?.message ===
        'No HookNamespaces found. This means no data has been saved to the Hook State yet.'
      ) {
        // This means no data has been saved to the Hook State yet so this is fine.
        // We just need to initialize an empty HookState.
        hookStateResult = new HookState<HSVCampaignGeneralInfo>([])
      } else {
        throw error
      }
    }
    const beforeHookState = hookStateResult
    const beforeAppState = await StateUtility.getApplicationState(client)

    // init end dates in unix seconds
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const next2Months = new Date(now.getFullYear(), now.getMonth() + 2, 1)
    const next3Months = new Date(now.getFullYear(), now.getMonth() + 3, 1)
    const next5Months = new Date(now.getFullYear(), now.getMonth() + 5, 1)
    const nextMonthInUnixSeconds = BigInt(
      Math.floor(nextMonth.getTime() / 1000)
    )
    const next2MonthsInUnixSeconds = BigInt(
      Math.floor(next2Months.getTime() / 1000)
    )
    const next3MonthsInUnixSeconds = BigInt(
      Math.floor(next3Months.getTime() / 1000)
    )
    const next5MonthsInUnixSeconds = BigInt(
      Math.floor(next5Months.getTime() / 1000)
    )

    const depositInDrops = Application.getCreateCampaignDepositInDrops()
    const title =
      'title ioasej pf asiopefja sjeopfjopaisjef aoipsj eofjasoej fopas ejofjaos i'
    const description =
      "The Ultimate Fighting Championship (UFC) is the world's premier mixed martial arts (MMA) organization, showcasing a unique blend of striking, grappling, and submission techniques from various martial arts disciplines. Founded in 1993, the UFC has grown exponentially over the years, transforming from a niche sport into a global phenomenon, reaching millions of fans worldwide. The UFC was initially created as a competition to determine the most effective martial art, pitting practitioners of different disciplines against each other in a no-holds-barred format. However, over time, the organization evolved, introducing weight classes and implementing a comprehensive set of rules and regulations, prioritizing the safety and well-being of the fighters. Today, the UFC operates under the unified rules of MMA, which have been widely adopted across the sport. These rules dictate the legal striking techniques, grappling positions, and submissions, as well as the appropriate attire and protective gear for fighters. The UFC also adheres to strict drug testing protocols to ensure a level playing field for all competitors."
    const overviewURL = 'https://www.google.com'
    const fundRaiseGoalInDrops = BigInt(25000000000)
    const fundRaiseEndDateInUnixSeconds = nextMonthInUnixSeconds
    const milestones = [
      {
        endDateInUnixSeconds: next2MonthsInUnixSeconds,
        title: 'first milestone',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds: next3MonthsInUnixSeconds,
        title: 'second milestone',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds: next5MonthsInUnixSeconds,
        title: 'third/final milestone',
        payoutPercent: 50,
      },
    ]

    const campaignId = await Application.createCampaign(client, {
      ownerWallet,
      depositInDrops,
      title,
      description,
      overviewURL,
      fundRaiseGoalInDrops,
      fundRaiseEndDateInUnixSeconds,
      milestones,
    })

    const afterHookState = await StateUtility.getHookState(client)
    const afterHookStateEntries = afterHookState.entries.filter(
      (entry) => entry.key.destinationTag === campaignId
    )
    if (afterHookStateEntries.length === 0) {
      throw new Error(`Campaign not found in hook state: ${campaignId}`)
    }

    const afterAppState = await StateUtility.getApplicationState(client)
    const campaignCreated = afterAppState.campaigns.find(
      (campaign) => campaign.id === campaignId
    )
    if (!campaignCreated) {
      throw new Error(`Campaign not found in application state: ${campaignId}`)
    }

    /* Step 1. Verify Hook State contains latest changes */
    expect(afterHookState.entries.length).toBe(
      beforeHookState.entries.length + 1
    )
    expect(afterHookStateEntries.length).toBe(1)
    expect(afterHookStateEntries[0].key.destinationTag).toBe(campaignId)
    expect(afterHookStateEntries[0].key.dataLookupFlag).toBe(
      DATA_LOOKUP_GENERAL_INFO_FLAG
    )
    const hsvGeneralInfo = afterHookStateEntries[0].value
      .decoded as HSVCampaignGeneralInfo
    expect(hsvGeneralInfo.state).toBe(CAMPAIGN_STATE_DERIVE_FLAG)
    expect(hsvGeneralInfo.owner).toBe(ownerWallet.classicAddress)
    expect(hsvGeneralInfo.fundRaiseGoalInDrops.toString()).toBe(
      fundRaiseGoalInDrops.toString()
    )
    expect(hsvGeneralInfo.fundRaiseEndDateInUnixSeconds.toString()).toBe(
      fundRaiseEndDateInUnixSeconds.toString()
    )
    expect(hsvGeneralInfo.totalAmountRaisedInDrops.toString()).toBe('0')
    expect(hsvGeneralInfo.totalAmountRewardedInDrops.toString()).toBe('0')
    expect(hsvGeneralInfo.totalReserveAmountInDrops.toString()).toBe(
      Application.getCreateCampaignDepositInDrops().toString()
    )
    expect(hsvGeneralInfo.totalFundTransactions).toBe(0)
    expect(hsvGeneralInfo.totalRejectVotesForCurrentMilestone).toBe(0)
    expect(hsvGeneralInfo.milestones.length).toBe(milestones.length)
    for (let i = 0; i < hsvGeneralInfo.milestones.length; i++) {
      const hsvMilestone = hsvGeneralInfo.milestones[i]
      expect(hsvMilestone.state).toBe(MILESTONE_STATE_DERIVE_FLAG)
      expect(hsvMilestone.endDateInUnixSeconds.toString()).toBe(
        milestones[i].endDateInUnixSeconds.toString()
      )
      expect(hsvMilestone.payoutPercent).toBe(milestones[i].payoutPercent)
    }

    /* Step 2. Verify Application State contains latest changes */
    expect(afterAppState.campaigns.length).toBe(
      beforeAppState.campaigns.length + 1
    )
    expect(campaignCreated).toBeDefined()
    expect(campaignCreated.id).toBe(campaignId)
    expect(campaignCreated.state).toBe('fundRaise')
    expect(campaignCreated.owner).toBe(ownerWallet.classicAddress)
    expect(campaignCreated.fundRaiseGoalInDrops).toBe(fundRaiseGoalInDrops)
    expect(campaignCreated.fundRaiseEndDateInUnixSeconds).toBe(
      fundRaiseEndDateInUnixSeconds
    )
    expect(campaignCreated.totalAmountRaisedInDrops).toBe(BigInt(0))
    expect(campaignCreated.totalAmountRewardedInDrops).toBe(BigInt(0))
    expect(campaignCreated.totalReserveAmountInDrops).toBe(
      Application.getCreateCampaignDepositInDrops()
    )
    expect(campaignCreated.totalRejectVotesForCurrentMilestone).toBe(0)

    expect(campaignCreated.milestones.length).toBe(milestones.length)
    for (let i = 0; i < campaignCreated.milestones.length; i++) {
      const milestone = campaignCreated.milestones[i]
      expect(milestone.state).toBe('unstarted')
      expect(milestone.endDateInUnixSeconds.toString()).toBe(
        milestones[i].endDateInUnixSeconds.toString()
      )
      expect(milestone.payoutPercent).toBe(milestones[i].payoutPercent)
    }

    expect(campaignCreated.fundTransactions.length).toBe(0)
    expect(campaignCreated.backers.length).toBe(0)
  })
})
