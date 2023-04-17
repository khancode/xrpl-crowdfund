/*

Different types of campaigns:
- Historical data
- In-progress data

Historical data cases:
- Campaign failed fund raise
- Campaign failed milestone 2 of 3 - payout 1 of 3 done, refunded remaining funds
- Campaign succeeded and completed - all payouts

In-progress data cases:
- Campaign in fund raise state

In-progress data where a single operation causes a state change:
- Campaign in milestone 1 of 3
    - voteReject will cause milestone 1 of 3 to fail
- Campaign failed milestone 2 of 3 - payout 1 of 3 done & waiting for request refund
    - requestRefundPayment will issue a refund for remaining funds
- Campaign in milestone 3 of 3 - payout 1 of 3 done, waiting for payout 2 of 3
    - requestMilestonePayoutPayment will issue a payout for milestone 2 of 3
- Campaign passed all milestones - payouts 1 & 2 of 3 done, waiting for payout 3 of 3
    - requestMilestonePayoutPayment will issue payout for milestone 3 and complete campaign

*/

import fs from 'fs'

import { Client, Wallet } from 'xrpl'
import { getBalance } from '../util/getBalance'
import { client, connectClient, disconnectClient } from '../util/xrplClient'
import { fundWallet } from '../util/fundWallet'
import { dateOffsetToUnixTimestampInSeconds } from '../test-integration/testUtil'
import {
  DevApplication,
  DevCreateCampaignParams,
  DevFundCampaignParams,
} from '../test-integration/DevApplication'
import {
  Application,
  CreateCampaignParams,
  FundCampaignParams,
  RequestMilestonePayoutPaymentParams,
  RequestRefundPaymentParams,
} from '../app/Application'
import connectDatabase from '../database'
import { CampaignDatabaseModel } from '../database/models/campaign.model'
import { Connection } from 'mongoose'

const TEST_GROUPS = [
  'historical-failed-fundraise',
  'historical-failed-milestone-2-of-3',
  'historical-succeeded',
  'in-progress-fundraise',
  'in-progress-milestone-1-of-3 ; #voteReject-opportunity',
  'in-progress-milestone-3-of-3 ; payout 1 of 3 done, pending payout 2 of 3 ; #requestMilestonePayoutPayment-opportunity',
  'completed-all-milestones; payouts 1 & 2 of 3 done, pending payout 3 of 3 ; #requestMilestonePayoutPayment-opportunity',
  'failed-milestone-2-of-3 ; payout 1 of 3 done ; #requestRefundPayment-opportunity',
]
const WALLETS_PER_TEST_GROUP = 4
const RESERVE_AMOUNT = 200000000n
const PADDING_AMOUNT = 300000000n
const MINIMUM_BALANCE = RESERVE_AMOUNT + PADDING_AMOUNT

/**
 * Setup accounts for adding test data.
 *
 * NOTE: Create an accounts.json with `{}` contents within this directory before running index.ts otherwise it will error with:
 *       error TS2307: Cannot find module './accounts.json' or its corresponding type declarations.
 *
 * @returns accounts: Record<string, Wallet[]>
 */
async function setupAccounts(
  client: Client
): Promise<Record<string, Wallet[]>> {
  /**
   * 1. Read from accounts.json.
   *    if empty, fund wallet and save to accounts.json
   *    if not empty, check if each wallet has at least 500 XRP
   *        if not, add to list of wallets to refund
   *       if yes, continue
   *   if list of wallets to refund is not empty, fund a new wallet for each one in the list synchronously waiting 10 seconds (rate-limit) between each refund
   * 2. Submit transactions for each test data case
   */

  let accounts: Record<string, Wallet[]>
  // Check if a file exists
  fs.access(`${__dirname}/accounts.json`, async (err) => {
    if (err) {
      console.log('File does not exist')
      fs.writeFileSync(`${__dirname}/accounts.json`, {})
    }
  })
  try {
    const accountsData = (await import('./accounts.json')) as any
    accounts = accountsData.default
  } catch (err: any) {
    if (err.code === 'MODULE_NOT_FOUND') {
      accounts = {}
    } else {
      throw err
    }
  }

  const updatedAccounts: Record<string, Wallet[]> = {}
  if (Object.keys(accounts).length !== TEST_GROUPS.length) {
    console.log('initializing accounts.json...')
    for (const testGroup of TEST_GROUPS) {
      updatedAccounts[testGroup] = []
      for (let j = 0; j < WALLETS_PER_TEST_GROUP; j++) {
        const wallet = Wallet.generate()
        updatedAccounts[testGroup].push(wallet)
      }
    }

    /* 2. Update accounts.json with the new wallet addresses */
    const accountsJSON = JSON.stringify(updatedAccounts, null, 2)
    fs.writeFileSync(`${__dirname}/accounts.json`, accountsJSON)
  }

  const resultAccounts =
    Object.keys(updatedAccounts).length > 0 ? updatedAccounts : accounts

  /* 3. Check if each wallet has at least 500 XRP (200 Reserve amount + 300 padding), if not add each one to a list of wallets to fund */
  const promises = []
  const walletsToFund: Wallet[] = []
  // console.log('checking wallet balances...')
  for (const testGroup of TEST_GROUPS) {
    for (const wallet of resultAccounts[testGroup]) {
      promises.push(
        getBalance(client, wallet.classicAddress)
          .then((balance) => {
            if (balance <= MINIMUM_BALANCE) {
              // 500 XRP
              walletsToFund.push(wallet)
            }
          })
          .catch((err: any) => {
            if (err.data.error === 'actNotFound') {
              walletsToFund.push(wallet)
            } else {
              throw err
            }
          })
      )
    }
  }

  await Promise.all(promises)

  /* 4. Fund a wallet for each one in the list synchronously waiting 10 second between each fund */
  for (const wallet of walletsToFund) {
    console.log(`funding wallet ${wallet.classicAddress}...`)
    try {
      await fundWallet(wallet)
    } catch (err: any) {
      if (err?.message.includes('fundWallet error: you must wait ')) {
        const seconds = parseInt(
          err.message.split('fundWallet error: you must wait ')[1]
        )
        await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
        await fundWallet(wallet)
      } else {
        throw err
      }
    }
  }

  return resultAccounts
}

async function historicalFailedFundraise(
  client: Client,
  database: Connection,
  accounts: Wallet[]
): Promise<void> {
  console.log('historical-failed-fundraise')

  if (
    !accounts[0].seed ||
    !accounts[1].seed ||
    !accounts[2].seed ||
    !accounts[3].seed
  ) {
    throw new Error('missing seed from one of the accounts')
  }

  const owner = Wallet.fromSeed(accounts[0].seed)
  const backer1 = Wallet.fromSeed(accounts[1].seed)
  const backer2 = Wallet.fromSeed(accounts[2].seed)
  const backer3 = Wallet.fromSeed(accounts[3].seed)

  const params: DevCreateCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('5_MONTH_BEFORE'),
    ownerWallet: owner,
    depositInDrops: 100000100n,
    title: 'Ultra Slim Wallet: Keep Your Cards & Cash in Style',
    description:
      "Our minimalist wallet is designed to hold all of your essentials while taking up minimal space in your pocket. Made from high-quality materials, it's both durable and stylish.",
    overviewUrl: 'https://www.coolwallets.com/minimalist-wallet-campaign',
    fundRaiseGoalInDrops: 100000000n,
    fundRaiseEndDateInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('4_MONTH_BEFORE'),
    milestones: [
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('3_MONTH_BEFORE'),
        title: 'Initial funds payout',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('2_MONTH_BEFORE'),
        title: 'Design and prototype wallet',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('1_MONTH_BEFORE'),
        title: 'Launch wallet on all major platforms',
        payoutPercent: 50,
      },
    ],
  }

  const campaignId = await DevApplication.createCampaign(
    client,
    database,
    params
  )

  console.log('campaignId', campaignId)
}

async function historicalFailedMilestone2of3(
  client: Client,
  database: Connection,
  accounts: Wallet[]
): Promise<void> {
  console.log('historical-failed-milestone-2-of-3')

  if (
    !accounts[0].seed ||
    !accounts[1].seed ||
    !accounts[2].seed ||
    !accounts[3].seed
  ) {
    throw new Error('missing seed from one of the accounts')
  }

  const owner = Wallet.fromSeed(accounts[0].seed)
  const backer1 = Wallet.fromSeed(accounts[1].seed)
  const backer2 = Wallet.fromSeed(accounts[2].seed)
  const backer3 = Wallet.fromSeed(accounts[3].seed)

  const params: DevCreateCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('6_MONTH_BEFORE'),
    ownerWallet: owner,
    depositInDrops: 100000100n,
    title: 'The Ultimate Strategy Board Game for Family Game Night',
    description:
      "Our board game is a fun and challenging strategy game that can be played by 2-4 players. With high-quality components and engaging gameplay, it's perfect for game night with friends and family.",
    overviewUrl: 'https://www.nightowlgames.com/board-game-campaign',
    fundRaiseGoalInDrops: 100000000n,
    fundRaiseEndDateInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('5_MONTH_BEFORE'),
    milestones: [
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('4_MONTH_BEFORE'),
        title: 'Initial funds payout',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('2_MONTH_BEFORE'),
        title: 'Design and prototype board game',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('1_MONTH_BEFORE'),
        title: 'Launch board game',
        payoutPercent: 50,
      },
    ],
  }

  const campaignId = await DevApplication.createCampaign(
    client,
    database,
    params
  )

  console.log('campaignId', campaignId)

  const fundCampaignParams1: DevFundCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('6_MONTH_BEFORE'),
    backerWallet: backer1,
    campaignId,
    fundAmountInDrops: 50000000n + Application.getFundCampaignDepositInDrops(),
  }

  const fundCampaignParams2: DevFundCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('6_MONTH_BEFORE'),
    backerWallet: backer2,
    campaignId,
    fundAmountInDrops: 50000000n + Application.getFundCampaignDepositInDrops(),
  }

  let fundTransactionId1, fundTransactionId2
  await Promise.all([
    DevApplication.fundCampaign(client, fundCampaignParams1).then((id) => {
      fundTransactionId1 = id
    }),
    DevApplication.fundCampaign(client, fundCampaignParams2).then((id) => {
      fundTransactionId2 = id
    }),
  ])

  if (fundTransactionId1 === undefined) {
    throw new Error('fundTransactionId1 is undefined')
  }
  if (fundTransactionId2 === undefined) {
    throw new Error('fundTransactionId2 is undefined')
  }

  await Promise.all([
    DevApplication.voteRejectMilestone(client, {
      mockCurrentTimeInUnixSeconds:
        dateOffsetToUnixTimestampInSeconds('3_MONTH_BEFORE'),
      backerWallet: backer1,
      campaignId,
      fundTransactionId: fundTransactionId1,
    }),
    DevApplication.voteRejectMilestone(client, {
      mockCurrentTimeInUnixSeconds:
        dateOffsetToUnixTimestampInSeconds('3_MONTH_BEFORE'),
      backerWallet: backer2,
      campaignId,
      fundTransactionId: fundTransactionId2,
    }),
  ])

  const requestMilestonePayoutPaymentParams: RequestMilestonePayoutPaymentParams =
    {
      ownerWallet: owner,
      campaignId,
      milestoneIndex: 0,
    }
  const requestRefundPaymentParams1: RequestRefundPaymentParams = {
    backerWallet: backer1,
    campaignId,
    fundTransactionId: fundTransactionId1,
  }
  const requestRefundPaymentParams2: RequestRefundPaymentParams = {
    backerWallet: backer2,
    campaignId,
    fundTransactionId: fundTransactionId2,
  }

  let payoutAmountInDrops, refundAmountInDrops1, refundAmountInDrops2

  await Promise.all([
    Application.requestMilestonePayoutPayment(
      client,
      requestMilestonePayoutPaymentParams
    ).then((result) => {
      payoutAmountInDrops = result
    }),
    Application.requestRefundPayment(client, requestRefundPaymentParams1).then(
      (result) => {
        refundAmountInDrops1 = result
      }
    ),
    Application.requestRefundPayment(client, requestRefundPaymentParams2).then(
      (result) => {
        refundAmountInDrops2 = result
      }
    ),
  ])

  console.log('payoutAmountInDrops', payoutAmountInDrops)
  console.log('refundAmountInDrops1', refundAmountInDrops1)
  console.log('refundAmountInDrops2', refundAmountInDrops2)
}

async function historicalSucceeded(
  client: Client,
  database: Connection,
  accounts: Wallet[]
): Promise<void> {
  console.log('historical-succeeded')

  if (
    !accounts[0].seed ||
    !accounts[1].seed ||
    !accounts[2].seed ||
    !accounts[3].seed
  ) {
    throw new Error('missing seed from one of the accounts')
  }

  const owner = Wallet.fromSeed(accounts[0].seed)
  const backer1 = Wallet.fromSeed(accounts[1].seed)
  const backer2 = Wallet.fromSeed(accounts[2].seed)
  const backer3 = Wallet.fromSeed(accounts[3].seed)

  const params: DevCreateCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('6_MONTH_BEFORE'),
    ownerWallet: owner,
    depositInDrops: 100000100n,
    title: 'The Revolutionary Documentary Exposing Hidden Truths',
    description:
      "Our documentary film explores a compelling and important topic that is often overlooked in mainstream media. With high-quality production values and expert interviews, it's a must-see for anyone interested in this subject.",
    overviewUrl: 'https://www.insightsfilmco.com/documentary-film-campaign',
    fundRaiseGoalInDrops: 100000000n,
    fundRaiseEndDateInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('5_MONTH_BEFORE'),
    milestones: [
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('4_MONTH_BEFORE'),
        title: 'Initial funds to cover production costs',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('2_MONTH_BEFORE'),
        title: 'Research and conduct interviews for documentary',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('1_MONTH_BEFORE'),
        title: 'Publish documentary on all major streaming platforms',
        payoutPercent: 50,
      },
    ],
  }

  const campaignId = await DevApplication.createCampaign(
    client,
    database,
    params
  )

  console.log('campaignId', campaignId)

  const fundCampaignParams1: DevFundCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('6_MONTH_BEFORE'),
    backerWallet: backer1,
    campaignId,
    fundAmountInDrops: 50000000n + Application.getFundCampaignDepositInDrops(),
  }

  const fundCampaignParams2: DevFundCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('6_MONTH_BEFORE'),
    backerWallet: backer2,
    campaignId,
    fundAmountInDrops: 50000000n + Application.getFundCampaignDepositInDrops(),
  }

  let fundTransactionId1, fundTransactionId2
  await Promise.all([
    DevApplication.fundCampaign(client, fundCampaignParams1).then((id) => {
      fundTransactionId1 = id
    }),
    DevApplication.fundCampaign(client, fundCampaignParams2).then((id) => {
      fundTransactionId2 = id
    }),
  ])

  if (fundTransactionId1 === undefined) {
    throw new Error('fundTransactionId1 is undefined')
  }
  if (fundTransactionId2 === undefined) {
    throw new Error('fundTransactionId2 is undefined')
  }

  const requestMilestonePayoutPaymentParams1: RequestMilestonePayoutPaymentParams =
    {
      ownerWallet: owner,
      campaignId,
      milestoneIndex: 0,
    }
  const requestMilestonePayoutPaymentParams2: RequestMilestonePayoutPaymentParams =
    {
      ownerWallet: owner,
      campaignId,
      milestoneIndex: 1,
    }
  const requestMilestonePayoutPaymentParams3: RequestMilestonePayoutPaymentParams =
    {
      ownerWallet: owner,
      campaignId,
      milestoneIndex: 2,
    }

  const payoutAmountInDrops1 = await Application.requestMilestonePayoutPayment(
    client,
    requestMilestonePayoutPaymentParams1
  )
  const payoutAmountInDrops2 = await Application.requestMilestonePayoutPayment(
    client,
    requestMilestonePayoutPaymentParams2
  )
  const payoutAmountInDrops3 = await Application.requestMilestonePayoutPayment(
    client,
    requestMilestonePayoutPaymentParams3
  )

  console.log('payoutAmountInDrops1', payoutAmountInDrops1)
  console.log('payoutAmountInDrops2', payoutAmountInDrops2)
  console.log('payoutAmountInDrops3', payoutAmountInDrops3)
}

async function inProgressFundraise(
  client: Client,
  database: Connection,
  accounts: Wallet[]
): Promise<void> {
  console.log('in-progress-fundraise')

  if (
    !accounts[0].seed ||
    !accounts[1].seed ||
    !accounts[2].seed ||
    !accounts[3].seed
  ) {
    throw new Error('missing seed from one of the accounts')
  }

  const owner = Wallet.fromSeed(accounts[0].seed)
  const backer1 = Wallet.fromSeed(accounts[1].seed)
  const backer2 = Wallet.fromSeed(accounts[2].seed)
  const backer3 = Wallet.fromSeed(accounts[3].seed)

  const params: CreateCampaignParams = {
    ownerWallet: owner,
    depositInDrops: 100000100n,
    title: 'Revolutionize Your Hydration with the Ultimate Smart Water Bottle',
    description:
      "Our smart water bottle uses advanced sensors and algorithms to track your hydration levels and provide personalized hydration recommendations. With a sleek and modern design, it's perfect for staying hydrated on-the-go.",
    overviewUrl: 'https://www.h2osmartbottle.com/smart-water-bottle-campaign',
    fundRaiseGoalInDrops: 100000000n,
    fundRaiseEndDateInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('1_MONTH_AFTER'),
    milestones: [
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('2_MONTH_AFTER'),
        title: 'Initial funds to cover production costs',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('3_MONTH_AFTER'),
        title: 'Design and prototype smart water bottle',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('5_MONTH_AFTER'),
        title: 'Launch smart water bottle',
        payoutPercent: 50,
      },
    ],
  }

  const campaignId = await Application.createCampaign(client, database, params)

  console.log('campaignId', campaignId)

  const fundCampaignParams1: FundCampaignParams = {
    backerWallet: backer1,
    campaignId,
    fundAmountInDrops: 50000000n + Application.getFundCampaignDepositInDrops(),
  }

  const fundTransactionId1 = await Application.fundCampaign(
    client,
    fundCampaignParams1
  )

  if (fundTransactionId1 === undefined) {
    throw new Error('fundTransactionId1 is undefined')
  }
}

async function inProgressMilestone1of3VoteRejectOpportunity(
  client: Client,
  database: Connection,
  accounts: Wallet[]
): Promise<void> {
  console.log('in-progress-milestone-1-of-3 ; #voteReject-opportunity')

  if (
    !accounts[0].seed ||
    !accounts[1].seed ||
    !accounts[2].seed ||
    !accounts[3].seed
  ) {
    throw new Error('missing seed from one of the accounts')
  }

  const owner = Wallet.fromSeed(accounts[0].seed)
  const backer1 = Wallet.fromSeed(accounts[1].seed)
  const backer2 = Wallet.fromSeed(accounts[2].seed)
  const backer3 = Wallet.fromSeed(accounts[3].seed)

  const params: DevCreateCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('2_MONTH_BEFORE'),
    ownerWallet: owner,
    depositInDrops: 100000100n,
    title: 'Create Your Perfect Watch with the Ultimate Customizable Watch',
    description:
      "Our customizable watch allows you to mix and match different components to create a unique and personalized watch that reflects your style. With high-quality materials and a wide range of options, it's perfect for watch enthusiasts and fashion-forward individuals.",
    overviewUrl: 'https://www.zeitgeistwatches.com/customizable-watch-campaign',
    fundRaiseGoalInDrops: 100000000n,
    fundRaiseEndDateInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('1_MONTH_BEFORE'),
    milestones: [
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('1_MONTH_AFTER'),
        title: 'Initial funds to cover production costs',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('2_MONTH_AFTER'),
        title: 'Design and prototype customizable watch',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('3_MONTH_AFTER'),
        title: 'Launch customizable watch',
        payoutPercent: 50,
      },
    ],
  }

  const campaignId = await DevApplication.createCampaign(
    client,
    database,
    params
  )

  console.log('campaignId', campaignId)

  const fundCampaignParams1: DevFundCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('2_MONTH_BEFORE'),
    backerWallet: backer1,
    campaignId,
    fundAmountInDrops: 50000000n + Application.getFundCampaignDepositInDrops(),
  }

  const fundCampaignParams2: DevFundCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('2_MONTH_BEFORE'),
    backerWallet: backer2,
    campaignId,
    fundAmountInDrops: 50000000n + Application.getFundCampaignDepositInDrops(),
  }

  let fundTransactionId1, fundTransactionId2
  await Promise.all([
    DevApplication.fundCampaign(client, fundCampaignParams1).then((id) => {
      fundTransactionId1 = id
    }),
    DevApplication.fundCampaign(client, fundCampaignParams2).then((id) => {
      fundTransactionId2 = id
    }),
  ])

  if (fundTransactionId1 === undefined) {
    throw new Error('fundTransactionId1 is undefined')
  }
  if (fundTransactionId2 === undefined) {
    throw new Error('fundTransactionId2 is undefined')
  }

  await DevApplication.voteRejectMilestone(client, {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('0_MONTH_AFTER'),
    backerWallet: backer1,
    campaignId,
    fundTransactionId: fundTransactionId1,
  })
}

async function failedMilestone2of3Payout1of3DoneRequestRefundPaymentOpportunity(
  client: Client,
  database: Connection,
  accounts: Wallet[]
): Promise<void> {
  console.log(
    'failed-milestone-2-of-3 ; payout 1 of 3 done ; #requestRefundPayment-opportunity'
  )

  if (
    !accounts[0].seed ||
    !accounts[1].seed ||
    !accounts[2].seed ||
    !accounts[3].seed
  ) {
    throw new Error('missing seed from one of the accounts')
  }

  const owner = Wallet.fromSeed(accounts[0].seed)
  const backer1 = Wallet.fromSeed(accounts[1].seed)
  const backer2 = Wallet.fromSeed(accounts[2].seed)
  const backer3 = Wallet.fromSeed(accounts[3].seed)

  const params: DevCreateCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('3_MONTH_BEFORE'),
    ownerWallet: owner,
    depositInDrops: 100000100n,
    title: 'The Ultimate Multi-Purpose Backpack for All Your Adventures',
    description:
      "Our backpack is designed for all your adventures - whether it's hiking, traveling, or commuting. With multiple compartments and high-quality materials, it's perfect for carrying all your essentials in style.",
    overviewUrl:
      'https://www.adventurebackpackco.com/multi-purpose-backpack-campaign',
    fundRaiseGoalInDrops: 100000000n,
    fundRaiseEndDateInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('2_MONTH_BEFORE'),
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
        title: 'Design and prototype multi-purpose backpack',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('2_MONTH_AFTER'),
        title: 'Launch multi-purpose backpack',
        payoutPercent: 50,
      },
    ],
  }

  const campaignId = await DevApplication.createCampaign(
    client,
    database,
    params
  )

  console.log('campaignId', campaignId)

  const fundCampaignParams1: DevFundCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('3_MONTH_BEFORE'),
    backerWallet: backer1,
    campaignId,
    fundAmountInDrops: 50000000n + Application.getFundCampaignDepositInDrops(),
  }

  const fundCampaignParams2: DevFundCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('3_MONTH_BEFORE'),
    backerWallet: backer2,
    campaignId,
    fundAmountInDrops: 50000000n + Application.getFundCampaignDepositInDrops(),
  }

  let fundTransactionId1, fundTransactionId2
  await Promise.all([
    DevApplication.fundCampaign(client, fundCampaignParams1).then((id) => {
      fundTransactionId1 = id
    }),
    DevApplication.fundCampaign(client, fundCampaignParams2).then((id) => {
      fundTransactionId2 = id
    }),
  ])

  if (fundTransactionId1 === undefined) {
    throw new Error('fundTransactionId1 is undefined')
  }
  if (fundTransactionId2 === undefined) {
    throw new Error('fundTransactionId2 is undefined')
  }

  await Promise.all([
    await DevApplication.voteRejectMilestone(client, {
      mockCurrentTimeInUnixSeconds:
        dateOffsetToUnixTimestampInSeconds('0_MONTH_AFTER'),
      backerWallet: backer1,
      campaignId,
      fundTransactionId: fundTransactionId1,
    }),
    await DevApplication.voteRejectMilestone(client, {
      mockCurrentTimeInUnixSeconds:
        dateOffsetToUnixTimestampInSeconds('0_MONTH_AFTER'),
      backerWallet: backer2,
      campaignId,
      fundTransactionId: fundTransactionId2,
    }),
  ])

  const requestMilestonePayoutPaymentParams: RequestMilestonePayoutPaymentParams =
    {
      ownerWallet: owner,
      campaignId,
      milestoneIndex: 0,
    }

  const payoutAmountInDrops = await Application.requestMilestonePayoutPayment(
    client,
    requestMilestonePayoutPaymentParams
  )

  console.log('payoutAmountInDrops', payoutAmountInDrops)
}

async function inProgressMilestone3of3Payout1of3DonePendingPayout2of3RequestMilestonePayoutPaymentOpportunity(
  client: Client,
  database: Connection,
  accounts: Wallet[]
): Promise<void> {
  console.log(
    'in-progress-milestone-3-of-3 ; payout 1 of 3 done, pending payout 2 of 3 ; #requestMilestonePayoutPayment-opportunity'
  )

  if (
    !accounts[0].seed ||
    !accounts[1].seed ||
    !accounts[2].seed ||
    !accounts[3].seed
  ) {
    throw new Error('missing seed from one of the accounts')
  }

  const owner = Wallet.fromSeed(accounts[0].seed)
  const backer1 = Wallet.fromSeed(accounts[1].seed)
  const backer2 = Wallet.fromSeed(accounts[2].seed)
  const backer3 = Wallet.fromSeed(accounts[3].seed)

  const params: DevCreateCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('4_MONTH_BEFORE'),
    ownerWallet: owner,
    depositInDrops: 100000100n,
    title: 'The Ultimate Fitness Tracker for Achieving Your Goals',
    description:
      "Our fitness tracker uses advanced sensors and algorithms to track your fitness goals and provide personalized recommendations. With a sleek and modern design, it's perfect for staying motivated and reaching your fitness goals.",
    overviewUrl: 'https://www.fittechco.com/fitness-tracker-campaign',
    fundRaiseGoalInDrops: 100000000n,
    fundRaiseEndDateInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('3_MONTH_BEFORE'),
    milestones: [
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('2_MONTH_BEFORE'),
        title: 'Initial funds to cover design and prototype costs',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('1_MONTH_BEFORE'),
        title: 'Design and prototype fitness tracker',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('1_MONTH_AFTER'),
        title: 'Launch fitness tracker on all fitness platforms',
        payoutPercent: 50,
      },
    ],
  }

  const campaignId = await DevApplication.createCampaign(
    client,
    database,
    params
  )

  console.log('campaignId', campaignId)

  const fundCampaignParams1: DevFundCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('5_MONTH_BEFORE'),
    backerWallet: backer1,
    campaignId,
    fundAmountInDrops: 50000000n + Application.getFundCampaignDepositInDrops(),
  }

  const fundCampaignParams2: DevFundCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('5_MONTH_BEFORE'),
    backerWallet: backer2,
    campaignId,
    fundAmountInDrops: 50000000n + Application.getFundCampaignDepositInDrops(),
  }

  let fundTransactionId1, fundTransactionId2
  await Promise.all([
    DevApplication.fundCampaign(client, fundCampaignParams1).then((id) => {
      fundTransactionId1 = id
    }),
    DevApplication.fundCampaign(client, fundCampaignParams2).then((id) => {
      fundTransactionId2 = id
    }),
  ])

  if (fundTransactionId1 === undefined) {
    throw new Error('fundTransactionId1 is undefined')
  }
  if (fundTransactionId2 === undefined) {
    throw new Error('fundTransactionId2 is undefined')
  }

  const requestMilestonePayoutPaymentParams: RequestMilestonePayoutPaymentParams =
    {
      ownerWallet: owner,
      campaignId,
      milestoneIndex: 0,
    }

  const payoutAmountInDrops = await Application.requestMilestonePayoutPayment(
    client,
    requestMilestonePayoutPaymentParams
  )

  console.log('payoutAmountInDrops', payoutAmountInDrops)
}

async function completedAllMilestonePayout1and2of3DonePendingPayout3of3RequestMilestonePayoutPaymentOpportunity(
  client: Client,
  database: Connection,
  accounts: Wallet[]
): Promise<void> {
  console.log(
    'completed-all-milestones; payouts 1 & 2 of 3 done, pending payout 3 of 3 ; #requestMilestonePayoutPayment-opportunity'
  )

  if (
    !accounts[0].seed ||
    !accounts[1].seed ||
    !accounts[2].seed ||
    !accounts[3].seed
  ) {
    throw new Error('missing seed from one of the accounts')
  }

  const owner = Wallet.fromSeed(accounts[0].seed)
  const backer1 = Wallet.fromSeed(accounts[1].seed)
  const backer2 = Wallet.fromSeed(accounts[2].seed)
  const backer3 = Wallet.fromSeed(accounts[3].seed)

  const params: DevCreateCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('5_MONTH_BEFORE'),
    ownerWallet: owner,
    depositInDrops: 100000100n,
    title: 'The Ultimate Wireless Earbuds for Immersive Audio Experience',
    description:
      "Our wireless earbuds use advanced audio technology to provide an immersive audio experience. With high-quality sound and noise-cancellation, it's perfect for music lovers and audiophiles.",
    overviewUrl: 'https://www.audiogearco.com/wireless-earbuds-campaign',
    fundRaiseGoalInDrops: 100000000n,
    fundRaiseEndDateInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('4_MONTH_BEFORE'),
    milestones: [
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('3_MONTH_BEFORE'),
        title: 'Initial funds to cover design and prototype costs',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('2_MONTH_BEFORE'),
        title: 'Design and prototype wireless earbuds',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds:
          dateOffsetToUnixTimestampInSeconds('1_MONTH_BEFORE'),
        title: 'Launch wireless earbuds on Kickstarter',
        payoutPercent: 50,
      },
    ],
  }

  const campaignId = await DevApplication.createCampaign(
    client,
    database,
    params
  )

  console.log('campaignId', campaignId)

  const fundCampaignParams1: DevFundCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('6_MONTH_BEFORE'),
    backerWallet: backer1,
    campaignId,
    fundAmountInDrops: 50000000n + Application.getFundCampaignDepositInDrops(),
  }

  const fundCampaignParams2: DevFundCampaignParams = {
    mockCurrentTimeInUnixSeconds:
      dateOffsetToUnixTimestampInSeconds('6_MONTH_BEFORE'),
    backerWallet: backer2,
    campaignId,
    fundAmountInDrops: 50000000n + Application.getFundCampaignDepositInDrops(),
  }

  let fundTransactionId1, fundTransactionId2
  await Promise.all([
    DevApplication.fundCampaign(client, fundCampaignParams1).then((id) => {
      fundTransactionId1 = id
    }),
    DevApplication.fundCampaign(client, fundCampaignParams2).then((id) => {
      fundTransactionId2 = id
    }),
  ])

  if (fundTransactionId1 === undefined) {
    throw new Error('fundTransactionId1 is undefined')
  }
  if (fundTransactionId2 === undefined) {
    throw new Error('fundTransactionId2 is undefined')
  }

  const requestMilestonePayoutPaymentParams1: RequestMilestonePayoutPaymentParams =
    {
      ownerWallet: owner,
      campaignId,
      milestoneIndex: 0,
    }
  const requestMilestonePayoutPaymentParams2: RequestMilestonePayoutPaymentParams =
    {
      ownerWallet: owner,
      campaignId,
      milestoneIndex: 1,
    }

  const [payoutAmountInDrops1, payoutAmountInDrops2] = await Promise.all([
    await Application.requestMilestonePayoutPayment(
      client,
      requestMilestonePayoutPaymentParams1
    ),
    await Application.requestMilestonePayoutPayment(
      client,
      requestMilestonePayoutPaymentParams2
    ),
  ])

  console.log('payoutAmountInDrops1', payoutAmountInDrops1)
  console.log('payoutAmountInDrops2', payoutAmountInDrops2)
}

async function run() {
  await connectClient()
  const database = await connectDatabase()
  await CampaignDatabaseModel.deleteMany({})

  const accounts = await setupAccounts(client)

  const promises = []
  promises.push(
    historicalFailedFundraise(
      client,
      database,
      accounts['historical-failed-fundraise']
    ),
    historicalFailedMilestone2of3(
      client,
      database,
      accounts['historical-failed-milestone-2-of-3']
    ),
    historicalSucceeded(client, database, accounts['historical-succeeded']),
    inProgressFundraise(client, database, accounts['in-progress-fundraise']),
    inProgressMilestone1of3VoteRejectOpportunity(
      client,
      database,
      accounts['in-progress-milestone-1-of-3 ; #voteReject-opportunity']
    ),
    inProgressMilestone3of3Payout1of3DonePendingPayout2of3RequestMilestonePayoutPaymentOpportunity(
      client,
      database,
      accounts[
        'in-progress-milestone-3-of-3 ; payout 1 of 3 done, pending payout 2 of 3 ; #requestMilestonePayoutPayment-opportunity'
      ]
    ),
    completedAllMilestonePayout1and2of3DonePendingPayout3of3RequestMilestonePayoutPaymentOpportunity(
      client,
      database,
      accounts[
        'completed-all-milestones; payouts 1 & 2 of 3 done, pending payout 3 of 3 ; #requestMilestonePayoutPayment-opportunity'
      ]
    ),
    failedMilestone2of3Payout1of3DoneRequestRefundPaymentOpportunity(
      client,
      database,
      accounts[
        'failed-milestone-2-of-3 ; payout 1 of 3 done ; #requestRefundPayment-opportunity'
      ]
    )
  )

  await Promise.all(promises)

  await disconnectClient()
  database.close()
}

run()
