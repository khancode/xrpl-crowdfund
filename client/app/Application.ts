/*
Contains the operations that can are performed by the application.

Here are the operations that are required by the application:
1. Create Campaign
2. View Campaigns
3. Fund Campaign
4. Vote Reject Milestone
5. Vote Approve Milestone
6. Request Refund Payment
7. Request Milestone Payout Payment
*/

import { Client, convertStringToHex, Payment, validate, Wallet } from 'xrpl'
import { StateUtility } from '../util/StateUtility'
import {
  generateRandomDestinationTag,
  prepareTransactionV3,
} from '../util/transaction'
import {
  CREATE_CAMPAIGN_DEPOSIT_IN_DROPS,
  DESCRIPTION_MAX_LENGTH,
  FUND_CAMPAIGN_DEPOSIT_IN_DROPS,
  HOOK_ACCOUNT_WALLET,
  MILESTONES_MAX_LENGTH,
  OVERVIEW_URL_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from './constants'
import { CreateCampaignPayload } from './models/CreateCampaignPayload'
import { FundCampaignPayload } from './models/FundCampaignPayload'
import { MilestonePayload } from './models/MilestonePayload'
import { Campaign } from './models/Campaign'

export interface CreateCampaignParams {
  ownerWallet: Wallet
  depositInDrops: bigint
  title: string
  description: string
  overviewURL: string
  fundRaiseGoalInDrops: bigint
  fundRaiseEndDateInUnixSeconds: bigint
  milestones: Array<{
    endDateInUnixSeconds: bigint
    title: string
    payoutPercent: number
  }>
}

export interface FundCampaignParams {
  backerWallet: Wallet
  campaignId: number
  fundAmountInDrops: bigint
}

export class Application {
  static getCreateCampaignDepositInDrops(): bigint {
    return CREATE_CAMPAIGN_DEPOSIT_IN_DROPS
  }

  static getFundCampaignDepositInDrops(): bigint {
    return FUND_CAMPAIGN_DEPOSIT_IN_DROPS
  }

  static async createCampaign(
    client: Client,
    params: CreateCampaignParams
  ): Promise<number> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }

    const {
      ownerWallet,
      depositInDrops,
      title,
      description,
      overviewURL,
      fundRaiseGoalInDrops,
      fundRaiseEndDateInUnixSeconds,
      milestones,
    } = params

    // Step 1. Input validation
    this._validateCreateCampaignParams(params)

    // Step 3. Generate a random unique campaign ID
    const campaigns = await Application.viewCampaigns(client)
    let destinationTag: number
    do {
      destinationTag = generateRandomDestinationTag()
    } while (campaigns.find((campaign) => campaign.id === destinationTag))

    const campaignId = destinationTag

    // Step 3. Create transaction payloads
    const milestonePayloads = milestones.map((milestone) => {
      return new MilestonePayload(
        milestone.endDateInUnixSeconds,
        milestone.payoutPercent
      )
    })
    const createCampaignPayload = new CreateCampaignPayload(
      fundRaiseGoalInDrops,
      fundRaiseEndDateInUnixSeconds,
      milestonePayloads
    )

    // Step 4. submit Payment transaction with CreateCampaignPayload
    const createCampaignPartA: Payment = {
      TransactionType: 'Payment',
      Account: ownerWallet.address,
      Amount: depositInDrops.toString(),
      Destination: HOOK_ACCOUNT_WALLET.address, // TODO: replace with Hook Account address
      DestinationTag: campaignId,
      Memos: [
        {
          Memo: {
            MemoData: createCampaignPayload.encode(),
            MemoFormat: convertStringToHex(`signed/payload+1`),
            MemoType: convertStringToHex(`liteacc/payment`),
          },
        },
      ],
    }

    await prepareTransactionV3(createCampaignPartA)

    // Step 5. submit Payment transaction with CreateCampaignPayload
    // @ts-expect-error - this is functional
    validate(createCampaignPartA)
    const paymentResponse = await client.submitAndWait(createCampaignPartA, {
      autofill: true,
      wallet: ownerWallet,
    })

    // @ts-expect-error - this is defined
    const paymentTxResult = paymentResponse?.result?.meta?.TransactionResult
    if (paymentTxResult !== 'tesSUCCESS') {
      throw Error(
        `CreateCampaignPartA Payment transaction failed with ${paymentTxResult}`
      )
    }

    // TODO: Step 6. Add title(campaign & milestones), description, overviewURL fields to an off-ledger database (e.g. MongoDB)

    return campaignId
  }

  static async viewCampaigns(client: Client): Promise<Campaign[]> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }

    const applicationState = await StateUtility.getApplicationState(client)
    return applicationState.campaigns
  }

  static async fundCampaign(
    client: Client,
    params: FundCampaignParams
  ): Promise<void> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }

    // Step 1. Input validation
    this._validateFundCampaignParams(params)

    const { backerWallet, campaignId, fundAmountInDrops } = params

    // Step 3. Create transaction payloads
    const fundCampaignPayload = new FundCampaignPayload()

    // Step 4. submit Payment transaction with FundCampaignPayload
    const fundCampaign: Payment = {
      TransactionType: 'Payment',
      Account: backerWallet.address,
      Amount: fundAmountInDrops.toString(),
      Destination: HOOK_ACCOUNT_WALLET.address, // TODO: replace with Hook Account address
      DestinationTag: campaignId,
      Memos: [
        {
          Memo: {
            MemoData: fundCampaignPayload.encode(),
            MemoFormat: convertStringToHex(`signed/payload+1`),
            MemoType: convertStringToHex(`liteacc/payment`),
          },
        },
      ],
    }

    await prepareTransactionV3(fundCampaign)

    // Step 5. submit Payment transaction with CreateCampaignPayload
    // @ts-expect-error - this is functional
    validate(fundCampaign)
    const paymentResponse = await client.submitAndWait(fundCampaign, {
      autofill: true,
      wallet: backerWallet,
    })

    // @ts-expect-error - this is defined
    const paymentTxResult = paymentResponse?.result?.meta?.TransactionResult
    if (paymentTxResult !== 'tesSUCCESS') {
      throw Error(
        `FundCampaign Payment transaction failed with ${paymentTxResult}`
      )
    }
  }

  static async voteRejectMilestone(client: Client): Promise<void> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }
    // TODO: implement
    throw Error('Not implemented')
  }

  static async voteApproveMilestone(client: Client): Promise<void> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }
    // TODO: implement
    throw Error('Not implemented')
  }

  static async requestRefundPayment(client: Client): Promise<void> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }
    // TODO: implement
    throw Error('Not implemented')
  }

  static async requestMilestonePayoutPayment(client: Client): Promise<void> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }
    // TODO: implement
    throw Error('Not implemented')
  }

  private static _validateCreateCampaignParams(params: CreateCampaignParams) {
    const {
      ownerWallet,
      depositInDrops,
      title,
      description,
      overviewURL,
      fundRaiseGoalInDrops,
      fundRaiseEndDateInUnixSeconds,
      milestones,
    } = params

    const currentTimeUnixInSeconds = Math.floor(Date.now() / 1000)

    if (ownerWallet instanceof Wallet === false) {
      throw Error(
        `Invalid ownerWallet ${ownerWallet}. Must be an instance of Wallet`
      )
    }
    if (depositInDrops < CREATE_CAMPAIGN_DEPOSIT_IN_DROPS) {
      throw Error(
        `Invalid depositInDrops ${depositInDrops}. Must be at least the create campaign deposit of ${CREATE_CAMPAIGN_DEPOSIT_IN_DROPS} drops`
      )
    }
    if (depositInDrops > 2n ** 64n - 1n) {
      throw Error(
        `Invalid depositInDrops ${depositInDrops}. Must be less than 2^64 - 1 drops`
      )
    }
    if (title.length < 1 || title.length > TITLE_MAX_LENGTH) {
      throw Error(
        `Invalid title length ${title.length}. Must be between 1 and ${TITLE_MAX_LENGTH}`
      )
    }
    if (description.length < 1 || description.length > DESCRIPTION_MAX_LENGTH) {
      throw Error(
        `Invalid description length ${description.length}. Must be between 1 and ${DESCRIPTION_MAX_LENGTH}`
      )
    }
    if (
      overviewURL.length < 1 ||
      overviewURL.length > OVERVIEW_URL_MAX_LENGTH
    ) {
      throw Error(
        `Invalid overviewURL length ${overviewURL.length}. Must be between 1 and ${OVERVIEW_URL_MAX_LENGTH}`
      )
    }
    if (fundRaiseGoalInDrops < 1 || fundRaiseGoalInDrops > 2n ** 64n - 1n) {
      throw Error(
        `Invalid fundRaiseGoalInDrops ${fundRaiseGoalInDrops}. Must be between 1 and 2^64 - 1`
      )
    }
    if (fundRaiseEndDateInUnixSeconds <= currentTimeUnixInSeconds) {
      throw Error(
        `Invalid fundRaiseEndDateInUnixSeconds ${fundRaiseEndDateInUnixSeconds} is a past date. Must be a future date`
      )
    }
    if (fundRaiseEndDateInUnixSeconds > 2 ** 32 - 1) {
      throw Error(
        `Invalid fundRaiseEndDateInUnixSeconds ${fundRaiseEndDateInUnixSeconds} exceeds max value. Must be less than 2^32 - 1`
      )
    }
    if (milestones.length < 1 || milestones.length > MILESTONES_MAX_LENGTH) {
      throw Error(
        `Invalid milestones length ${milestones.length}. Must be between 1 and ${MILESTONES_MAX_LENGTH}`
      )
    }
    for (const milestone of milestones) {
      if (milestone.endDateInUnixSeconds <= currentTimeUnixInSeconds) {
        throw Error(
          `Invalid milestone.endDateInUnixSeconds ${milestone.endDateInUnixSeconds} is a past date. Must be a future date`
        )
      }
      if (milestone.endDateInUnixSeconds > 2 ** 32 - 1) {
        throw Error(
          `Invalid milestone.endDateInUnixSeconds ${milestone.endDateInUnixSeconds} exceeds max value. Must be less than 2^32 - 1`
        )
      }
      if (milestone.title.length < 1 || milestone.title.length > 75) {
        throw Error(
          `Invalid milestone.title length ${milestone.title.length}. Must be between 1 and 75`
        )
      }
      if (milestone.payoutPercent < 1 || milestone.payoutPercent > 100) {
        throw Error(
          `Invalid milestone.payoutPercent ${milestone.payoutPercent}. Must be between 1 and 100`
        )
      }
    }
    const sumMilestonePayoutPercent = milestones.reduce(
      (acc, cur) => acc + cur.payoutPercent,
      0
    )
    if (sumMilestonePayoutPercent !== 100) {
      throw Error(
        `Invalid milestone payoutPercent(s) sum ${sumMilestonePayoutPercent}. All milestone payoutPercent(s) must sum to exactly 100`
      )
    }
    if (
      milestones.some(
        (milestone, index) =>
          index > 0 &&
          milestone.endDateInUnixSeconds <=
            milestones[index - 1].endDateInUnixSeconds
      )
    ) {
      throw Error('Milestone end dates must be in ascending order')
    }
  }

  private static _validateFundCampaignParams(params: FundCampaignParams) {
    const { backerWallet, campaignId, fundAmountInDrops } = params

    if (backerWallet instanceof Wallet === false) {
      throw Error(
        `Invalid backerWallet ${backerWallet}. Must be an instance of Wallet`
      )
    }
    if (campaignId < 0 || campaignId > 2 ** 32 - 1) {
      throw Error(
        `Invalid campaignId ${campaignId}. Must be between 0 and 2^32 - 1`
      )
    }
    if (fundAmountInDrops <= FUND_CAMPAIGN_DEPOSIT_IN_DROPS) {
      throw Error(
        `Invalid fundAmountInDrops ${fundAmountInDrops}. Must be more than the fund campaign deposit of ${FUND_CAMPAIGN_DEPOSIT_IN_DROPS} drops`
      )
    }
    if (fundAmountInDrops > 2n ** 64n - 1n) {
      throw Error(
        `Invalid fundAmountInDrops ${fundAmountInDrops}. Must be less than 2^64 - 1 drops`
      )
    }
  }
}
