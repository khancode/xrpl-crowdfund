import accounts from './accounts.json'
import { client, connectClient, disconnectClient } from '../util/xrplClient'
import { Wallet } from 'xrpl'
import {
  Application,
  CreateCampaignParams,
  FundCampaignParams,
} from '../app/Application'
import { StateUtility } from '../util/StateUtility'
import {
  dateOffsetToUnixTimestampInSeconds,
  getHookStateEntriesOfCampaign,
  cloneHSVCampaignGeneralInfo,
  verifyHookStateKey,
  cloneHSVFundTransactionsPage,
} from './testUtil'
import { HSVCampaignGeneralInfo } from '../app/models/HSVCampaignGeneralInfo'
import { HSVFundTransactionsPage } from '../app/models/HSVFundTransactionsPage'
import {
  FUND_CAMPAIGN_DEPOSIT_IN_DROPS,
  FUND_TRANSACTION_STATE_APPROVE_FLAG,
} from '../app/constants'
import { HSVFundTransaction } from '../app/models/HSVFundTransaction'
import { Connection } from 'mongoose'
import connectDatabase from '../database'

describe('fundCampaign', () => {
  let database: Connection
  let owner: Wallet
  let backer1: Wallet
  let backer2: Wallet
  let backer3: Wallet
  let campaignId: number

  beforeAll(async () => {
    await connectClient()
    database = await connectDatabase()

    const fundCampaignAccounts = accounts['fundCampaign']
    owner = Wallet.fromSeed(fundCampaignAccounts[0].seed)
    backer1 = Wallet.fromSeed(fundCampaignAccounts[1].seed)
    backer2 = Wallet.fromSeed(fundCampaignAccounts[2].seed)
    backer3 = Wallet.fromSeed(fundCampaignAccounts[3].seed)

    const params: CreateCampaignParams = {
      ownerWallet: owner,
      depositInDrops: 100000100n,
      title: 'The Ultimate Fitness Tracker for Achieving Your Goals',
      description:
        "Our fitness tracker uses advanced sensors and algorithms to track your fitness goals and provide personalized recommendations. With a sleek and modern design, it's perfect for staying motivated and reaching your fitness goals.",
      overviewUrl: 'https://www.fittechco.com/fitness-tracker-campaign',
      fundRaiseGoalInDrops: 100000000n,
      fundRaiseEndDateInUnixSeconds:
        dateOffsetToUnixTimestampInSeconds('1_MONTH_AFTER'),
      milestones: [
        {
          endDateInUnixSeconds:
            dateOffsetToUnixTimestampInSeconds('2_MONTH_AFTER'),
          title: 'Initial funds to cover design and prototype costs',
          payoutPercent: 25,
        },
        {
          endDateInUnixSeconds:
            dateOffsetToUnixTimestampInSeconds('3_MONTH_AFTER'),
          title: 'Design and prototype fitness tracker',
          payoutPercent: 25,
        },
        {
          endDateInUnixSeconds:
            dateOffsetToUnixTimestampInSeconds('5_MONTH_AFTER'),
          title: 'Launch fitness tracker on all fitness platforms',
          payoutPercent: 50,
        },
      ],
    }

    campaignId = await Application.createCampaign(client, database, params)
  })

  afterAll(async () => {
    await disconnectClient()
    await database.close()
  })

  it('should fund a campaign with no backers', async () => {
    // Get the current HookState
    const hookStateBefore = await StateUtility.getHookState(client)
    const hookStateEntriesBefore = getHookStateEntriesOfCampaign(
      hookStateBefore,
      campaignId
    )
    const hsvGeneralInfoBefore = hookStateEntriesBefore.generalInfo.value
      .decoded as HSVCampaignGeneralInfo
    const hsvFundTransactionsPageBefore = null // expected to be null

    const params: FundCampaignParams = {
      backerWallet: backer1,
      campaignId,
      fundAmountInDrops:
        400000000n + Application.getFundCampaignDepositInDrops(),
    }
    const fundTransactionId = await Application.fundCampaign(client, params)

    // Verify that the fund transaction was saved to Hook State
    const hookStateAfter = await StateUtility.getHookState(client)

    const newHookStateEntries = getHookStateEntriesOfCampaign(
      hookStateAfter,
      campaignId
    )

    const hsvGeneralInfoAfter = newHookStateEntries.generalInfo.value
      .decoded as HSVCampaignGeneralInfo

    const hsvFundTransactionsPageAfter = newHookStateEntries
      .fundTransactionsPages[0].value.decoded as HSVFundTransactionsPage

    expect(fundTransactionId).toBe(0)
    expect(hookStateAfter.entries.length).toBe(
      hookStateBefore.entries.length + 1
    )
    expect(newHookStateEntries.generalInfo).toBeDefined()
    expect(newHookStateEntries.fundTransactionsPages.length).toBe(1)

    verifyHookStateKey(newHookStateEntries.generalInfo.key, {
      destinationTag: campaignId,
      dataLookupFlag: 0n,
    })

    const expectHsvGeneralInfo = cloneHSVCampaignGeneralInfo(
      hsvGeneralInfoBefore,
      {
        totalAmountRaisedInDrops: 400000000n,
        totalReserveAmountInDrops:
          hsvGeneralInfoBefore.totalReserveAmountInDrops +
          FUND_CAMPAIGN_DEPOSIT_IN_DROPS,
        totalFundTransactions: 1,
      }
    )

    expect(hsvGeneralInfoAfter).toEqual(expectHsvGeneralInfo)

    verifyHookStateKey(newHookStateEntries.fundTransactionsPages[0].key, {
      destinationTag: campaignId,
      dataLookupFlag: 1n,
    })

    const expectHsvFundTransactionsPage = cloneHSVFundTransactionsPage(
      hsvFundTransactionsPageBefore,
      [
        {
          pageSlotIndex: 0,
          hsvFundTransaction: new HSVFundTransaction(
            fundTransactionId,
            backer1.classicAddress,
            FUND_TRANSACTION_STATE_APPROVE_FLAG,
            400000000n
          ),
        },
      ]
    )

    expect(hsvFundTransactionsPageAfter).toEqual(expectHsvFundTransactionsPage)
  })

  it('should fund a campaign with an existing backer', async () => {
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

    const params: FundCampaignParams = {
      backerWallet: backer2,
      campaignId,
      fundAmountInDrops:
        300000000n + Application.getFundCampaignDepositInDrops(),
    }
    const fundTransactionId = await Application.fundCampaign(client, params)

    // Verify that the fund transaction was saved to Hook State
    const hookStateAfter = await StateUtility.getHookState(client)
    const newHookStateEntries = getHookStateEntriesOfCampaign(
      hookStateAfter,
      campaignId
    )
    const hsvGeneralInfoAfter = newHookStateEntries.generalInfo.value
      .decoded as HSVCampaignGeneralInfo
    const hsvFundTransactionsPageAfter = newHookStateEntries
      .fundTransactionsPages[0].value.decoded as HSVFundTransactionsPage

    expect(fundTransactionId).toBe(1)
    expect(hookStateAfter.entries.length).toBe(hookStateBefore.entries.length)
    expect(newHookStateEntries.generalInfo).toBeDefined()
    expect(newHookStateEntries.fundTransactionsPages.length).toBe(1)

    verifyHookStateKey(newHookStateEntries.generalInfo.key, {
      destinationTag: campaignId,
      dataLookupFlag: 0n,
    })

    const expectHsvGeneralInfo = cloneHSVCampaignGeneralInfo(
      hsvGeneralInfoBefore,
      {
        totalAmountRaisedInDrops: 700000000n,
        totalReserveAmountInDrops:
          hsvGeneralInfoBefore.totalReserveAmountInDrops +
          Application.getFundCampaignDepositInDrops(),
        totalFundTransactions: 2,
      }
    )

    expect(hsvGeneralInfoAfter).toEqual(expectHsvGeneralInfo)

    verifyHookStateKey(newHookStateEntries.fundTransactionsPages[0].key, {
      destinationTag: campaignId,
      dataLookupFlag: 1n,
    })

    const expectHsvFundTransactionsPage = cloneHSVFundTransactionsPage(
      hsvFundTransactionsPageBefore,
      [
        {
          pageSlotIndex: 1,
          hsvFundTransaction: new HSVFundTransaction(
            fundTransactionId,
            backer2.classicAddress,
            FUND_TRANSACTION_STATE_APPROVE_FLAG,
            300000000n
          ),
        },
      ]
    )

    expect(hsvFundTransactionsPageAfter).toEqual(expectHsvFundTransactionsPage)
  })

  it('should fund a campaign with existing backers that adds a new FundTransactionsPage', async () => {
    // Get the current HookState
    const hookStateBefore = await StateUtility.getHookState(client)
    const hookStateEntriesBefore = getHookStateEntriesOfCampaign(
      hookStateBefore,
      campaignId
    )
    const hsvGeneralInfoBefore = hookStateEntriesBefore.generalInfo.value
      .decoded as HSVCampaignGeneralInfo
    const hsvFundTransactionsPage0Before = hookStateEntriesBefore
      .fundTransactionsPages[0].value.decoded as HSVFundTransactionsPage
    const hsvFundTransactionsPage1Before = null // expect this to be null

    const params1: FundCampaignParams = {
      backerWallet: backer3,
      campaignId,
      fundAmountInDrops:
        300000000n + Application.getFundCampaignDepositInDrops(),
    }
    const params2: FundCampaignParams = {
      backerWallet: backer1,
      campaignId,
      fundAmountInDrops:
        300000000n + Application.getFundCampaignDepositInDrops(),
    }
    const params3: FundCampaignParams = {
      backerWallet: backer2,
      campaignId,
      fundAmountInDrops:
        300000000n + Application.getFundCampaignDepositInDrops(),
    }
    const params4: FundCampaignParams = {
      backerWallet: backer3,
      campaignId,
      fundAmountInDrops:
        300000000n + Application.getFundCampaignDepositInDrops(),
    }

    // Synchronous fundCampaign calls so fundTransactionId is deterministic
    const fundTransactionId1 = await Application.fundCampaign(client, params1)
    const fundTransactionId2 = await Application.fundCampaign(client, params2)
    const fundTransactionId3 = await Application.fundCampaign(client, params3)
    const fundTransactionId4 = await Application.fundCampaign(client, params4)

    // Verify that the fund transaction was saved to Hook State
    const hookStateAfter = await StateUtility.getHookState(client)

    const newHookStateEntries = getHookStateEntriesOfCampaign(
      hookStateAfter,
      campaignId
    )
    const hsvGeneralInfoAfter = newHookStateEntries.generalInfo.value
      .decoded as HSVCampaignGeneralInfo
    const hsvFundTransactionsPage0After = newHookStateEntries
      .fundTransactionsPages[0].value.decoded as HSVFundTransactionsPage
    const hsvFundTransactionsPage1After = newHookStateEntries
      .fundTransactionsPages[1].value.decoded as HSVFundTransactionsPage

    expect(fundTransactionId1).toBe(2)
    expect(fundTransactionId2).toBe(3)
    expect(fundTransactionId3).toBe(4)
    expect(fundTransactionId4).toBe(5)
    expect(hookStateAfter.entries.length).toBe(
      hookStateBefore.entries.length + 1
    )
    expect(newHookStateEntries.generalInfo).toBeDefined()
    expect(newHookStateEntries.fundTransactionsPages.length).toBe(2)

    verifyHookStateKey(newHookStateEntries.generalInfo.key, {
      destinationTag: campaignId,
      dataLookupFlag: 0n,
    })

    const expectHsvGeneralInfo = cloneHSVCampaignGeneralInfo(
      hsvGeneralInfoAfter,
      {
        totalAmountRaisedInDrops: 1900000000n,
        totalReserveAmountInDrops:
          hsvGeneralInfoBefore.totalReserveAmountInDrops +
          Application.getFundCampaignDepositInDrops() * 4n,
        totalFundTransactions: 6,
      }
    )

    expect(hsvGeneralInfoAfter).toEqual(expectHsvGeneralInfo)

    // Verify fundTransactionsPage0 is unchanged
    verifyHookStateKey(newHookStateEntries.fundTransactionsPages[0].key, {
      destinationTag: campaignId,
      dataLookupFlag: 1n,
    })

    const expectHsvFundTransactionsPage0 = cloneHSVFundTransactionsPage(
      hsvFundTransactionsPage0Before,
      [
        {
          pageSlotIndex: 2,
          hsvFundTransaction: new HSVFundTransaction(
            fundTransactionId1,
            backer3.classicAddress,
            FUND_TRANSACTION_STATE_APPROVE_FLAG,
            300000000n
          ),
        },
        {
          pageSlotIndex: 3,
          hsvFundTransaction: new HSVFundTransaction(
            fundTransactionId2,
            backer1.classicAddress,
            FUND_TRANSACTION_STATE_APPROVE_FLAG,
            300000000n
          ),
        },
        {
          pageSlotIndex: 4,
          hsvFundTransaction: new HSVFundTransaction(
            fundTransactionId3,
            backer2.classicAddress,
            FUND_TRANSACTION_STATE_APPROVE_FLAG,
            300000000n
          ),
        },
      ]
    )

    expect(hsvFundTransactionsPage0After).toEqual(
      expectHsvFundTransactionsPage0
    )

    // Verify fundTransactionsPage1 is correct
    verifyHookStateKey(newHookStateEntries.fundTransactionsPages[1].key, {
      destinationTag: campaignId,
      dataLookupFlag: 2n,
    })

    const expectHsvFundTransactionsPage1 = cloneHSVFundTransactionsPage(
      hsvFundTransactionsPage1Before,
      [
        {
          pageSlotIndex: 0,
          hsvFundTransaction: new HSVFundTransaction(
            fundTransactionId4,
            backer3.classicAddress,
            FUND_TRANSACTION_STATE_APPROVE_FLAG,
            300000000n
          ),
        },
      ]
    )

    expect(hsvFundTransactionsPage1After).toEqual(
      expectHsvFundTransactionsPage1
    )
  })
})
