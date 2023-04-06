import { Wallet } from 'xrpl'
import { Application } from '../app/Application'
import { fundWallet } from '../util/fundWallet'
import { client, connectClient, disconnectClient } from '../util/xrplClient'
import { StateUtility } from '../util/StateUtility'
import {
  CAMPAIGN_STATE_DERIVE_FLAG,
  DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_START_INDEX_FLAG,
  DATA_LOOKUP_GENERAL_INFO_FLAG,
  FUND_TRANSACTION_STATE_APPROVE_FLAG,
  MILESTONE_STATE_DERIVE_FLAG,
} from '../app/constants'
import { HSVCampaignGeneralInfo } from '../app/models/HSVCampaignGeneralInfo'
import { HSVFundTransactionsPage } from '../app/models/HSVFundTransactionsPage'

describe('Application.voteRejectMilestone', () => {
  let ownerWallet: Wallet
  let backerWallet0: Wallet
  let campaignId: number
  let fundRaiseGoalInDrops: bigint
  let fundRaiseEndDateInUnixSeconds: bigint
  let milestones: Array<{
    endDateInUnixSeconds: bigint
    title: string
    payoutPercent: number
  }>

  beforeAll(async () => {
    await connectClient()
  })

  beforeEach(async () => {
    // NOTE: Must wait 10 seconds before funding a new wallet again on Hooks Testnet v3.
    ownerWallet = await fundWallet()
    // sleep 10 seconds before funding a new wallet again on Hooks Testnet v3.
    await new Promise((resolve) => setTimeout(resolve, 10000))
    backerWallet0 = await fundWallet()
    // sleep 2 seconds to allow fund wallet changes to be validated on the ledger
    await new Promise((resolve) => setTimeout(resolve, 2000))

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
    fundRaiseGoalInDrops = BigInt(25000000000)
    fundRaiseEndDateInUnixSeconds = nextMonthInUnixSeconds
    milestones = [
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

    campaignId = await Application.createCampaign(client, {
      ownerWallet,
      depositInDrops,
      title,
      description,
      overviewURL,
      fundRaiseGoalInDrops,
      fundRaiseEndDateInUnixSeconds,
      milestones,
    })
  })

  afterAll(async () => {
    await disconnectClient()
  })

  it('should vote reject a milestone of a campaign with a single backer', async () => {
    const fundAmountWithoutDepositFeeInDrops = BigInt(50000000)
    const fundAmountInDrops =
      Application.getFundCampaignDepositInDrops() +
      fundAmountWithoutDepositFeeInDrops
    await Application.fundCampaign(client, {
      backerWallet: backerWallet0,
      campaignId,
      fundAmountInDrops,
    })

    const beforeHookState = await StateUtility.getHookState(client)
    const beforeAppState = await StateUtility.getApplicationState(client)

    await Application.voteRejectMilestone(client, {
      backerWallet: backerWallet0,
      campaignId,
      fundTransactionId: 0,
    })

    const afterHookState = await StateUtility.getHookState(client)
    const afterHookStateEntries = afterHookState.entries.filter(
      (entry) => entry.key.destinationTag === campaignId
    )

    const afterAppState = await StateUtility.getApplicationState(client)
    const campaignFunded = afterAppState.campaigns.find(
      (campaign) => campaign.id === campaignId
    )
    if (!campaignFunded) {
      throw new Error(`Campaign not found in application state: ${campaignId}`)
    }

    /* Step 1. Verify Hook State contains latest changes */
    expect(afterHookState.entries.length).toBe(beforeHookState.entries.length)
    expect(afterHookStateEntries.length).toBe(2)

    const expectedDataLookupFlags: bigint[] = [
      DATA_LOOKUP_GENERAL_INFO_FLAG,
      DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_START_INDEX_FLAG,
    ]
    const actualDataLookupFlags: bigint[] = []
    afterHookStateEntries.forEach((entry) => {
      actualDataLookupFlags.push(entry.key.dataLookupFlag)
      if (entry.key.dataLookupFlag === DATA_LOOKUP_GENERAL_INFO_FLAG) {
        const hsvGeneralInfo = entry.value.decoded as HSVCampaignGeneralInfo
        expect(hsvGeneralInfo.state).toBe(CAMPAIGN_STATE_DERIVE_FLAG)
        expect(hsvGeneralInfo.owner).toBe(ownerWallet.address)
        expect(hsvGeneralInfo.fundRaiseGoalInDrops.toString()).toBe(
          fundRaiseGoalInDrops.toString()
        )
        expect(hsvGeneralInfo.fundRaiseEndDateInUnixSeconds.toString()).toBe(
          fundRaiseEndDateInUnixSeconds.toString()
        )
        expect(hsvGeneralInfo.totalAmountRaisedInDrops.toString()).toBe(
          fundAmountWithoutDepositFeeInDrops.toString()
        )
        expect(hsvGeneralInfo.totalAmountRewardedInDrops.toString()).toBe('0')
        expect(hsvGeneralInfo.totalReserveAmountInDrops.toString()).toBe(
          (
            Application.getCreateCampaignDepositInDrops() +
            Application.getFundCampaignDepositInDrops()
          ).toString()
        )
        expect(hsvGeneralInfo.totalFundTransactions).toBe(1)
        expect(hsvGeneralInfo.totalRejectVotesForCurrentMilestone).toBe(1)
        expect(hsvGeneralInfo.milestones.length).toBe(milestones.length)
        for (let i = 0; i < hsvGeneralInfo.milestones.length; i++) {
          const hsvMilestone = hsvGeneralInfo.milestones[i]
          expect(hsvMilestone.state).toBe(MILESTONE_STATE_DERIVE_FLAG)
          expect(hsvMilestone.endDateInUnixSeconds.toString()).toBe(
            milestones[i].endDateInUnixSeconds.toString()
          )
          expect(hsvMilestone.payoutPercent).toBe(milestones[i].payoutPercent)
        }
      } else if (
        entry.key.dataLookupFlag ===
        DATA_LOOKUP_FUND_TRANSACTIONS_PAGE_START_INDEX_FLAG
      ) {
        const hsvFundTransactionsPage = entry.value
          .decoded as HSVFundTransactionsPage
        expect(hsvFundTransactionsPage.fundTransactions.length).toBe(1)
        expect(hsvFundTransactionsPage.fundTransactions[0].id).toBe(0)
        expect(hsvFundTransactionsPage.fundTransactions[0].account).toBe(
          backerWallet0.address
        )
        expect(hsvFundTransactionsPage.fundTransactions[0].state).toBe(
          FUND_TRANSACTION_STATE_APPROVE_FLAG
        )
        expect(
          hsvFundTransactionsPage.fundTransactions[0].amountInDrops.toString()
        ).toBe(fundAmountWithoutDepositFeeInDrops.toString())
      } else {
        throw new Error(
          `Unexpected data lookup flag: ${entry.key.dataLookupFlag}`
        )
      }
    })

    // expect(actualDataLookupFlags).toHaveLength(expectedDataLookupFlags.length)
    // expectedDataLookupFlags.forEach((flag) => {
    //   expect(actualDataLookupFlags).toContain(flag)
    // })

    // /* Step 2. Verify Application State contains latest changes */
    // expect(afterAppState.campaigns.length).toBe(beforeAppState.campaigns.length)
    // expect(campaignFunded).toBeDefined()
    // expect(campaignFunded.totalAmountRaisedInDrops.toString()).toBe(
    //   fundAmountWithoutDepositFeeInDrops.toString()
    // )
    // expect(campaignFunded.totalReserveAmountInDrops.toString()).toBe(
    //   (
    //     Application.getCreateCampaignDepositInDrops() +
    //     Application.getFundCampaignDepositInDrops()
    //   ).toString()
    // )

    // for (let i = 0; i < campaignFunded.milestones.length; i++) {
    //   const milestone = campaignFunded.milestones[i]
    //   expect(milestone.state).toBe('unstarted')
    //   expect(milestone.endDateInUnixSeconds.toString()).toBe(
    //     milestones[i].endDateInUnixSeconds.toString()
    //   )
    //   expect(milestone.payoutPercent).toBe(milestones[i].payoutPercent)
    //   expect(milestone.rejectVotes).toBe(0)
    // }

    // expect(campaignFunded.backers.length).toBe(1)
    // expect(campaignFunded.backers[0].account).toBe(backerWallet0.address)
    // expect(
    //   campaignFunded.backers[0].fundTransactions[0].amountInDrops.toString()
    // ).toBe(fundAmountWithoutDepositFeeInDrops.toString())
    // expect(campaignFunded.fundTransactions.length).toBe(1)
    // expect(campaignFunded.fundTransactions[0].id).toBe(0)
    // expect(campaignFunded.fundTransactions[0].account).toBe(
    //   backerWallet0.address
    // )
    // expect(campaignFunded.fundTransactions[0].state).toBe('approve')
    // expect(campaignFunded.fundTransactions[0].amountInDrops.toString()).toBe(
    //   fundAmountWithoutDepositFeeInDrops.toString()
    // )
  })
})