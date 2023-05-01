import accounts from './accounts.json'
import { client, connectClient, disconnectClient } from '../util/xrplClient'
import { Wallet } from 'xrpl'
import { Application, RequestRefundPaymentParams } from '../app/Application'
import { StateUtility } from '../util/StateUtility'
import {
  DevApplication,
  DevCreateCampaignParams,
  DevFundCampaignParams,
} from './DevApplication'
import {
  cloneHSVCampaignGeneralInfo,
  cloneHSVFundTransactionsPage,
  dateOffsetToUnixTimestampInSeconds,
  getHookStateEntriesOfCampaign,
} from './testUtil'
import connectDatabase from '../database'
import { Connection } from 'mongoose'
import { HSVCampaignGeneralInfo } from '../app/models/HSVCampaignGeneralInfo'
import { HSVFundTransactionsPage } from '../app/models/HSVFundTransactionsPage'
import { FUND_TRANSACTION_STATE_REFUNDED_FLAG } from '../app/constants'
import { HSVFundTransaction } from '../app/models/HSVFundTransaction'

describe('requestRefundPayment', () => {
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

    const voteRejectMilestoneAccounts = accounts['voteRejectMilestone']
    owner = Wallet.fromSeed(voteRejectMilestoneAccounts[0].seed)
    backer1 = Wallet.fromSeed(voteRejectMilestoneAccounts[1].seed)
    backer2 = Wallet.fromSeed(voteRejectMilestoneAccounts[2].seed)
    backer3 = Wallet.fromSeed(voteRejectMilestoneAccounts[3].seed)
    mockCurrentTimeInUnixSeconds =
      dateOffsetToUnixTimestampInSeconds('3_MONTH_BEFORE')

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
        dateOffsetToUnixTimestampInSeconds('1_MONTH_BEFORE'),
      milestones: [
        {
          endDateInUnixSeconds:
            dateOffsetToUnixTimestampInSeconds('1_MONTH_AFTER'),
          title: 'Initial funds to cover design and prototype costs',
          payoutPercent: 25,
        },
        {
          endDateInUnixSeconds:
            dateOffsetToUnixTimestampInSeconds('2_MONTH_AFTER'),
          title: 'Design and prototype wireless earbuds',
          payoutPercent: 25,
        },
        {
          endDateInUnixSeconds:
            dateOffsetToUnixTimestampInSeconds('3_MONTH_AFTER'),
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
        400000000n + Application.getFundCampaignDepositInDrops(),
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
        400000000n + Application.getFundCampaignDepositInDrops(),
    }
    fundTransactionId2 = await DevApplication.fundCampaign(
      client,
      fundCampaignParams2
    )

    await Promise.all([
      Application.voteRejectMilestone(client, {
        backerWallet: backer1,
        campaignId,
        fundTransactionId: fundTransactionId1,
      }),
      Application.voteRejectMilestone(client, {
        backerWallet: backer2,
        campaignId,
        fundTransactionId: fundTransactionId2,
      }),
    ])
  })

  afterAll(async () => {
    await disconnectClient()
    await database.close()
  })

  it('should request a refund payment', async () => {
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

    // Request refund payment
    const params: RequestRefundPaymentParams = {
      backerWallet: backer1,
      campaignId,
      fundTransactionId: fundTransactionId1,
    }

    const refundAmountInDrops = await Application.requestRefundPayment(
      client,
      params
    )

    expect(refundAmountInDrops).toBe(399999999n)

    // Verify that request refund payment made changes to Hook State
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
        totalRejectVotesForCurrentMilestone: 2,
      }
    )

    expect(hsvGeneralInfoAfter).toEqual(expectHsvGeneralInfo)

    const expectHsvFundTransactionsPage = cloneHSVFundTransactionsPage(
      hsvFundTransactionsPageBefore,
      [
        {
          pageSlotIndex: 0,
          hsvFundTransaction: new HSVFundTransaction(
            fundTransactionId1,
            backer1.classicAddress,
            FUND_TRANSACTION_STATE_REFUNDED_FLAG,
            400000000n
          ),
        },
      ]
    )

    expect(hsvFundTransactionsPageAfter).toEqual(expectHsvFundTransactionsPage)
  })

  it('should throw error when backer has already been refunded', async () => {
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

    // Request refund payment
    const params: RequestRefundPaymentParams = {
      backerWallet: backer1,
      campaignId,
      fundTransactionId: fundTransactionId1,
    }

    try {
      await Application.requestRefundPayment(client, params)
    } catch (error: any) {
      expect(
        error.message.includes(`Fund Transaction has already been refunded`)
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
