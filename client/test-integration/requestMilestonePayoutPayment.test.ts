import accounts from './accounts.json'
import { client, connectClient, disconnectClient } from '../util/xrplClient'
import { Wallet } from 'xrpl'
import {
  Application,
  RequestMilestonePayoutPaymentParams,
} from '../app/Application'
import { StateUtility } from '../util/StateUtility'
import {
  DevApplication,
  DevCreateCampaignParams,
  DevFundCampaignParams,
} from './DevApplication'
import {
  cloneHSVCampaignGeneralInfo,
  dateOffsetToUnixTimestampInSeconds,
  getHookStateEntriesOfCampaign,
} from './testUtil'
import connectDatabase from '../database'
import { Connection } from 'mongoose'
import { HSVCampaignGeneralInfo } from '../app/models/HSVCampaignGeneralInfo'
import { HSVFundTransactionsPage } from '../app/models/HSVFundTransactionsPage'
import { MILESTONE_STATE_PAID_FLAG } from '../app/constants'
import { HSVMilestone } from '../app/models/HSVMilestone'

describe('requestMilestonePayoutPayment', () => {
  let database: Connection
  let owner: Wallet
  let backer1: Wallet
  let backer2: Wallet
  let backer3: Wallet
  let campaignId: number
  let fundTransactionId1: number
  let fundTransactionId2: number
  let mockCurrentTimeInUnixSeconds: bigint

  beforeAll(async () => {
    await connectClient()
    database = await connectDatabase()

    const requestMilestonePayoutPaymentAccounts =
      accounts['requestMilestonePayoutPayment']
    owner = Wallet.fromSeed(requestMilestonePayoutPaymentAccounts[0].seed)
    backer1 = Wallet.fromSeed(requestMilestonePayoutPaymentAccounts[1].seed)
    backer2 = Wallet.fromSeed(requestMilestonePayoutPaymentAccounts[2].seed)
    backer3 = Wallet.fromSeed(requestMilestonePayoutPaymentAccounts[3].seed)
    mockCurrentTimeInUnixSeconds =
      dateOffsetToUnixTimestampInSeconds('6_MONTH_BEFORE')

    const createCampaignParams: DevCreateCampaignParams = {
      mockCurrentTimeInUnixSeconds,
      ownerWallet: owner,
      depositInDrops: 100000100n,
      title: 'The Ultimate Wireless Earbuds for Immersive Audio Experience',
      description:
        "Our wireless earbuds use advanced audio technology to provide an immersive audio experience. With high-quality sound and noise-cancellation, it's perfect for music lovers and audiophiles.",
      overviewUrl: 'https://www.audiogearco.com/wireless-earbuds-campaign',
      imageUrl:
        'https://images.unsplash.com/photo-1606135185526-1bd767d76d65?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8',
      fundRaiseGoalInDrops: 100000000n,
      fundRaiseEndDateInUnixSeconds:
        dateOffsetToUnixTimestampInSeconds('5_MONTH_BEFORE'),
      milestones: [
        {
          endDateInUnixSeconds:
            dateOffsetToUnixTimestampInSeconds('1_MONTH_BEFORE'),
          title: 'Initial funds to cover design and prototype costs',
          payoutPercent: 25,
        },
        {
          endDateInUnixSeconds:
            dateOffsetToUnixTimestampInSeconds('1_MONTH_AFTER'),
          title: 'Design and prototype wireless earbuds',
          payoutPercent: 25,
        },
        {
          endDateInUnixSeconds:
            dateOffsetToUnixTimestampInSeconds('2_MONTH_AFTER'),
          title: 'Launch wireless earbuds on Kickstarter',
          payoutPercent: 50,
        },
      ],
    }

    campaignId = await DevApplication.createCampaign(
      client,
      database,
      createCampaignParams
    )

    const fundCampaignParams1: DevFundCampaignParams = {
      mockCurrentTimeInUnixSeconds,
      backerWallet: backer1,
      campaignId,
      fundAmountInDrops:
        50000000n + Application.getFundCampaignDepositInDrops(),
    }
    fundTransactionId1 = await DevApplication.fundCampaign(
      client,
      fundCampaignParams1
    )

    const fundCampaignParams2: DevFundCampaignParams = {
      mockCurrentTimeInUnixSeconds,
      backerWallet: backer2,
      campaignId,
      fundAmountInDrops:
        50000000n + Application.getFundCampaignDepositInDrops(),
    }
    fundTransactionId2 = await DevApplication.fundCampaign(
      client,
      fundCampaignParams2
    )
  })

  afterAll(async () => {
    await disconnectClient()
    await database.close()
  })

  it('should request a milestone payout payment of milestone 1', async () => {
    // Get the current HookState
    const hookStateBefore = await StateUtility.getHookState(client)
    const hookStateEntriesBefore = getHookStateEntriesOfCampaign(
      hookStateBefore,
      campaignId
    )
    const hsvGeneralInfoBefore = hookStateEntriesBefore.generalInfo.value
      .decoded as HSVCampaignGeneralInfo
    const hsvFundTransactionsPageBefore = hookStateEntriesBefore
      .fundTransactionsPages[0].value.decoded as HSVFundTransactionsPage

    // Request milestone payout payment
    const params: RequestMilestonePayoutPaymentParams = {
      ownerWallet: owner,
      campaignId,
      milestoneIndex: 0,
    }

    const payoutAmountInDrops = await Application.requestMilestonePayoutPayment(
      client,
      params
    )

    expect(payoutAmountInDrops).toBe(25000000n)

    // Verify that request milestone payout payment made changes to Hook State
    const hookStateAfter = await StateUtility.getHookState(client)
    const newHookStateEntries = getHookStateEntriesOfCampaign(
      hookStateAfter,
      campaignId
    )
    const hsvGeneralInfoAfter = newHookStateEntries.generalInfo.value
      .decoded as HSVCampaignGeneralInfo
    const hsvFundTransactionsPageAfter = newHookStateEntries
      .fundTransactionsPages[0].value.decoded as HSVFundTransactionsPage

    expect(hookStateAfter.entries.length).toBe(hookStateBefore.entries.length)

    const expectHsvGeneralInfo = cloneHSVCampaignGeneralInfo(
      hsvGeneralInfoBefore,
      {
        milestones: hsvGeneralInfoBefore.milestones.map((milestone, index) => {
          if (index === 0) {
            return new HSVMilestone(
              MILESTONE_STATE_PAID_FLAG,
              milestone.endDateInUnixSeconds,
              milestone.payoutPercent
            )
          } else {
            return milestone
          }
        }),
      }
    )

    expect(hsvGeneralInfoAfter).toEqual(expectHsvGeneralInfo)

    expect(hsvFundTransactionsPageAfter).toEqual(hsvFundTransactionsPageBefore)
  })

  it('should throw error when owner has already been paid out milestone 1', async () => {
    // Get the current HookState
    const hookStateBefore = await StateUtility.getHookState(client)
    const hookStateEntriesBefore = getHookStateEntriesOfCampaign(
      hookStateBefore,
      campaignId
    )
    const hsvGeneralInfoBefore = hookStateEntriesBefore.generalInfo.value
      .decoded as HSVCampaignGeneralInfo
    const hsvFundTransactionsPageBefore = hookStateEntriesBefore
      .fundTransactionsPages[0].value.decoded as HSVFundTransactionsPage

    // Request milestone payout payment
    const params: RequestMilestonePayoutPaymentParams = {
      ownerWallet: owner,
      campaignId,
      milestoneIndex: 0,
    }

    try {
      await Application.requestMilestonePayoutPayment(client, params)
    } catch (error: any) {
      expect(
        error.message.includes(`Milestone has already been paid out.`)
      ).toBe(true)
    }

    const hookStateAfter = await StateUtility.getHookState(client)
    const newHookStateEntries = getHookStateEntriesOfCampaign(
      hookStateAfter,
      campaignId
    )
    const hsvGeneralInfoAfter = newHookStateEntries.generalInfo.value
      .decoded as HSVCampaignGeneralInfo
    const hsvFundTransactionsPageAfter = newHookStateEntries
      .fundTransactionsPages[0].value.decoded as HSVFundTransactionsPage

    expect(hookStateAfter.entries.length).toBe(hookStateBefore.entries.length)
    expect(hsvGeneralInfoAfter).toEqual(hsvGeneralInfoBefore)
    expect(hsvFundTransactionsPageAfter).toEqual(hsvFundTransactionsPageBefore)
  })
})
