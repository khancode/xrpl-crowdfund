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

import { spawnSync } from 'child_process'
import {
  Client,
  convertStringToHex,
  Payment,
  Transaction,
  TxResponse,
  validate,
  Wallet,
} from 'xrpl'
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
import { VoteRejectMilestonePayload } from './models/VoteRejectMilestonePayload'
import { VoteApproveMilestonePayload } from './models/VoteApproveMilestonePayload'
import { RequestRefundPaymentPayload } from './models/RequestRefundPaymentPayload'
import { RequestMilestonePayoutPaymentPayload } from './models/RequestMilestonePayoutPaymentPayload'
import {
  CampaignDatabaseModel,
  ICampaignDatabaseModel,
} from '../database/models/campaign.model'
import { Connection } from 'mongoose'

export interface CreateCampaignParams {
  ownerWallet: Wallet
  depositInDrops: bigint
  title: string
  description: string
  overviewUrl: string
  imageUrl: string
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

interface InvokeCampaignParams {
  backerWallet: Wallet
  campaignId: number
  fundTransactionId: number
}

export type VoteRejectMilestoneParams = InvokeCampaignParams

export type VoteApproveMilestoneParams = InvokeCampaignParams

export type RequestRefundPaymentParams = InvokeCampaignParams

export interface RequestMilestonePayoutPaymentParams {
  ownerWallet: Wallet
  campaignId: number
  milestoneIndex: number
}

export class Application {
  static init(): void {
    const command1 = 'npm'
    const args1 = ['run', 'app:setup-hook-account']

    const result1 = spawnSync(command1, args1, { stdio: 'inherit' })

    if (result1.status !== 0) {
      console.error(`Error running command1: ${result1.stderr}`)
      process.exit(result1.status)
    }

    const command2 = 'npm'
    const args2 = ['run', 'build-set-hooks']

    const result2 = spawnSync(command2, args2, { stdio: 'inherit' })

    if (result2.status !== 0) {
      console.error(`Error running command2: ${result2.stderr}`)
      process.exit(result2.status)
    }

    console.log('All commands completed successfully.')
  }

  static getCreateCampaignDepositInDrops(): bigint {
    return CREATE_CAMPAIGN_DEPOSIT_IN_DROPS
  }

  static getFundCampaignDepositInDrops(): bigint {
    return FUND_CAMPAIGN_DEPOSIT_IN_DROPS
  }

  static async createCampaign(
    client: Client,
    database: Connection,
    params: CreateCampaignParams
  ): Promise<number> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }
    if (database.readyState !== 1) {
      throw new Error('MongoDB database is not connected')
    }

    const {
      ownerWallet,
      depositInDrops,
      title,
      description,
      overviewUrl,
      imageUrl,
      fundRaiseGoalInDrops,
      fundRaiseEndDateInUnixSeconds,
      milestones,
    } = params

    /* Step 1. Input validation */
    this._validateCreateCampaignParams(params)

    /* Step 2. Generate a random unique campaign ID */
    const campaigns = await Application.viewCampaigns(client, database)
    let destinationTag: number
    do {
      destinationTag = generateRandomDestinationTag()
    } while (campaigns.find((campaign) => campaign.id === destinationTag))

    const campaignId = destinationTag

    /* Step 3. Create transaction Memo payloads */
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

    /* Step 4. Submit Payment transaction with CreateCampaignPayload */
    const createCampaignTx: Payment = {
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

    await prepareTransactionV3(createCampaignTx)

    /* Step 6. submit Payment transaction with CreateCampaignPayload */
    // @ts-expect-error - this is functional
    validate(createCampaignTx)
    const paymentResponse = await client.submitAndWait(createCampaignTx, {
      autofill: true,
      wallet: ownerWallet,
    })

    /* Step 7. Check Payment transaction result */
    this._validateTxResponse(paymentResponse, 'createCampaign')

    /* Step 8. Add title(campaign & milestones), description, overviewUrl, imageUrl fields to an off-ledger database (e.g. MongoDB) */
    const campaignData: ICampaignDatabaseModel = {
      id: campaignId,
      title,
      description,
      overviewUrl,
      imageUrl,
      milestones: milestones.map((milestone) => {
        return {
          endDateInUnixSeconds: milestone.endDateInUnixSeconds.toString(),
          title: milestone.title,
        }
      }),
    }
    const campaign = new CampaignDatabaseModel(campaignData)
    try {
      await campaign.save()
    } catch (error) {
      throw new Error(`Error saving campaign to database: ${error}`)
    }

    return campaignId
  }

  static async viewCampaigns(
    client: Client,
    database: Connection
  ): Promise<Campaign[]> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }

    const applicationState = await StateUtility.getApplicationState(
      client,
      database
    )
    return applicationState.campaigns
  }

  static async getCampaignById(
    client: Client,
    database: Connection,
    campaignId: number
  ): Promise<Campaign> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }
    if (database.readyState !== 1) {
      throw new Error('MongoDB database is not connected')
    }

    const campaigns = await Application.viewCampaigns(client, database)
    const campaign = campaigns.find((campaign) => campaign.id === campaignId)
    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found`)
    }
    return campaign
  }

  static async fundCampaign(
    client: Client,
    params: FundCampaignParams
  ): Promise<number> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }

    /* Step 1. Input validation */
    this._validateFundCampaignParams(params)

    const { backerWallet, campaignId, fundAmountInDrops } = params

    /* Step 2. Create transaction Memo payload */
    const fundCampaignPayload = new FundCampaignPayload()

    // Step 3. Submit Payment transaction with FundCampaignPayload
    const fundCampaignTx: Payment = {
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

    await prepareTransactionV3(fundCampaignTx)

    /* Step 4. Submit Payment transaction with CreateCampaignPayload */
    // @ts-expect-error - this is functional
    validate(fundCampaignTx)
    const paymentResponse = await client.submitAndWait(fundCampaignTx, {
      autofill: true,
      wallet: backerWallet,
    })

    /* Step 5. Check Payment transaction result */
    const acceptMessageHex = this._validateTxResponse(
      paymentResponse,
      'fundCampaign'
    )

    /* Step 6. Return fundTransactionId from transaction response */
    const fundTransactionId = parseInt(acceptMessageHex, 16)
    return fundTransactionId
  }

  static async voteRejectMilestone(
    client: Client,
    params: VoteRejectMilestoneParams
  ): Promise<void> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }

    /* Step 1. Input validation */
    this._validateInvokeCampaignParams(params)

    const { backerWallet, campaignId, fundTransactionId } = params

    /* Step 2. Create transaction Blob payload */
    const voteRejectMilestonePayload = new VoteRejectMilestonePayload(
      fundTransactionId
    )

    /* Step 3. Submit Invoke transaction with VoteRejectMilestonePayload */
    const voteRejectMilestoneTx: Transaction = {
      // @ts-expect-error - Invoke transaction type is supported in Hooks Testnet v3
      TransactionType: 'Invoke',
      Account: backerWallet.address,
      Destination: HOOK_ACCOUNT_WALLET.address,
      DestinationTag: campaignId,
      Blob: voteRejectMilestonePayload.encode(),
    }

    await prepareTransactionV3(voteRejectMilestoneTx)

    const voteRejectMilestoneTxResponse = await client.submitAndWait(
      voteRejectMilestoneTx,
      {
        autofill: true,
        wallet: backerWallet,
      }
    )

    /* Step 4. Check Invoke transaction result */
    this._validateTxResponse(
      voteRejectMilestoneTxResponse,
      'voteRejectMilestone'
    )
  }

  static async voteApproveMilestone(
    client: Client,
    params: VoteApproveMilestoneParams
  ): Promise<void> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }

    /* Step 1. Input validation */
    this._validateInvokeCampaignParams(params)

    const { backerWallet, campaignId, fundTransactionId } = params

    /* Step 2. Create transaction Blob payload */
    const voteApproveMilestonePayload = new VoteApproveMilestonePayload(
      fundTransactionId
    )

    /* Step 3. Submit Invoke transaction with VoteApproveMilestonePayload */
    const voteApproveMilestoneTx: Transaction = {
      // @ts-expect-error - Invoke transaction type is supported in Hooks Testnet v3
      TransactionType: 'Invoke',
      Account: backerWallet.address,
      Destination: HOOK_ACCOUNT_WALLET.address,
      DestinationTag: campaignId,
      Blob: voteApproveMilestonePayload.encode(),
    }

    await prepareTransactionV3(voteApproveMilestoneTx)

    const voteApproveMilestoneTxResponse = await client.submitAndWait(
      voteApproveMilestoneTx,
      {
        autofill: true,
        wallet: backerWallet,
      }
    )

    /* Step 4. Check Invoke transaction result */
    this._validateTxResponse(
      voteApproveMilestoneTxResponse,
      'voteApproveMilestone'
    )
  }

  static async requestRefundPayment(
    client: Client,
    params: RequestRefundPaymentParams
  ): Promise<bigint> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }

    /* Step 1. Input validation */
    this._validateInvokeCampaignParams(params)

    const { backerWallet, campaignId, fundTransactionId } = params

    /* Step 2. Create transaction Blob payload */
    const requestRefundPaymentPayload = new RequestRefundPaymentPayload(
      fundTransactionId
    )

    /* Step 3. Submit Invoke transaction with RequestRefundPaymentPayload */
    const requestRefundPaymentTx: Transaction = {
      // @ts-expect-error - Invoke transaction type is supported in Hooks Testnet v3
      TransactionType: 'Invoke',
      Account: backerWallet.address,
      Destination: HOOK_ACCOUNT_WALLET.address,
      DestinationTag: campaignId,
      Blob: requestRefundPaymentPayload.encode(),
    }

    await prepareTransactionV3(requestRefundPaymentTx)

    const requestRefundPaymentTxResponse = await client.submitAndWait(
      requestRefundPaymentTx,
      {
        autofill: true,
        wallet: backerWallet,
      }
    )

    /* Step 4. Check Invoke transaction result */
    const acceptMessageHex = this._validateTxResponse(
      requestRefundPaymentTxResponse,
      'requestRefundPayment'
    )

    /* Step 5. Return refundAmountInDrops from transaction response */
    const refundAmountInDrops = BigInt('0x' + acceptMessageHex)
    return refundAmountInDrops
  }

  static async requestMilestonePayoutPayment(
    client: Client,
    params: RequestMilestonePayoutPaymentParams
  ): Promise<bigint> {
    if (!client.isConnected()) {
      throw new Error('xrpl Client is not connected')
    }

    /* Step 1. Input validation */
    this._validateRequestMilestonePayoutPaymentParams(params)

    const { ownerWallet, campaignId, milestoneIndex } = params

    /* Step 2. Create transaction Blob payload */
    const requestMilestonePayoutPaymentPayload =
      new RequestMilestonePayoutPaymentPayload(milestoneIndex)

    /* Step 3. Submit Invoke transaction with RequestMilestonePayoutPaymentPayload */
    const requestMilestonePaymentTx: Transaction = {
      // @ts-expect-error - Invoke transaction type is supported in Hooks Testnet v3
      TransactionType: 'Invoke',
      Account: ownerWallet.address,
      Destination: HOOK_ACCOUNT_WALLET.address,
      DestinationTag: campaignId,
      Blob: requestMilestonePayoutPaymentPayload.encode(),
    }

    await prepareTransactionV3(requestMilestonePaymentTx)

    const requestMilestonePayoutPaymentTxResponse = await client.submitAndWait(
      requestMilestonePaymentTx,
      {
        autofill: true,
        wallet: ownerWallet,
      }
    )

    /* Step 4. Check Invoke transaction result */
    const acceptMessageHex = this._validateTxResponse(
      requestMilestonePayoutPaymentTxResponse,
      'requestMilestonePayoutPayment'
    )

    /* Step 5. Return payoutAmountInDrops from transaction response */
    const payoutAmountInDrops = BigInt('0x' + acceptMessageHex)
    return payoutAmountInDrops
  }

  private static _validateTxResponse(
    txResponse: TxResponse,
    operationName: string
  ): string {
    const { meta, TransactionType } = txResponse?.result
    // @ts-expect-error - this can exists
    const { TransactionResult } = meta
    const hookReturnString =
      // @ts-expect-error - this is defined here
      meta.HookExecutions[0].HookExecution.HookReturnString
    if (TransactionResult === 'tecHOOK_REJECTED') {
      const rollbackMessageHex = hookReturnString
      const rollbackMessage = Buffer.from(rollbackMessageHex, 'hex').toString(
        'utf8'
      )
      throw new Error(
        `${operationName} ${TransactionType} transaction rejected by hook with error: "${rollbackMessage}"`
      )
    } else if (TransactionResult !== 'tesSUCCESS') {
      throw new Error(
        `${operationName} ${TransactionType} transaction failed with ${TransactionResult}`
      )
    }

    const acceptMessageHex = hookReturnString
    return acceptMessageHex
  }

  private static _validateCreateCampaignParams(params: CreateCampaignParams) {
    const {
      ownerWallet,
      depositInDrops,
      title,
      description,
      overviewUrl,
      fundRaiseGoalInDrops,
      fundRaiseEndDateInUnixSeconds,
      milestones,
    } = params

    const currentTimeUnixInSeconds = Math.floor(Date.now() / 1000)

    if (ownerWallet instanceof Wallet === false) {
      throw new Error(
        `Invalid ownerWallet ${ownerWallet}. Must be an instance of Wallet`
      )
    }
    if (depositInDrops < CREATE_CAMPAIGN_DEPOSIT_IN_DROPS) {
      throw new Error(
        `Invalid depositInDrops ${depositInDrops}. Must be at least the create campaign deposit of ${CREATE_CAMPAIGN_DEPOSIT_IN_DROPS} drops`
      )
    }
    if (depositInDrops > 2n ** 64n - 1n) {
      throw new Error(
        `Invalid depositInDrops ${depositInDrops}. Must be less than 2^64 - 1 drops`
      )
    }
    if (title.length < 1 || title.length > TITLE_MAX_LENGTH) {
      throw new Error(
        `Invalid title length ${title.length}. Must be between 1 and ${TITLE_MAX_LENGTH}`
      )
    }
    if (description.length < 1 || description.length > DESCRIPTION_MAX_LENGTH) {
      throw new Error(
        `Invalid description length ${description.length}. Must be between 1 and ${DESCRIPTION_MAX_LENGTH}`
      )
    }
    if (
      overviewUrl.length < 1 ||
      overviewUrl.length > OVERVIEW_URL_MAX_LENGTH
    ) {
      throw new Error(
        `Invalid overviewUrl length ${overviewUrl.length}. Must be between 1 and ${OVERVIEW_URL_MAX_LENGTH}`
      )
    }
    if (fundRaiseGoalInDrops < 1 || fundRaiseGoalInDrops > 2n ** 64n - 1n) {
      throw new Error(
        `Invalid fundRaiseGoalInDrops ${fundRaiseGoalInDrops}. Must be between 1 and 2^64 - 1`
      )
    }
    if (fundRaiseEndDateInUnixSeconds <= currentTimeUnixInSeconds) {
      throw new Error(
        `Invalid fundRaiseEndDateInUnixSeconds ${fundRaiseEndDateInUnixSeconds} is a past date. Must be a future date`
      )
    }
    if (fundRaiseEndDateInUnixSeconds > 2 ** 32 - 1) {
      throw new Error(
        `Invalid fundRaiseEndDateInUnixSeconds ${fundRaiseEndDateInUnixSeconds} exceeds max value. Must be less than 2^32 - 1`
      )
    }
    if (milestones.length < 1 || milestones.length > MILESTONES_MAX_LENGTH) {
      throw new Error(
        `Invalid milestones length ${milestones.length}. Must be between 1 and ${MILESTONES_MAX_LENGTH}`
      )
    }
    for (const milestone of milestones) {
      if (milestone.endDateInUnixSeconds <= currentTimeUnixInSeconds) {
        throw new Error(
          `Invalid milestone.endDateInUnixSeconds ${milestone.endDateInUnixSeconds} is a past date. Must be a future date`
        )
      }
      if (milestone.endDateInUnixSeconds > 2 ** 32 - 1) {
        throw new Error(
          `Invalid milestone.endDateInUnixSeconds ${milestone.endDateInUnixSeconds} exceeds max value. Must be less than 2^32 - 1`
        )
      }
      if (milestone.title.length < 1 || milestone.title.length > 75) {
        throw new Error(
          `Invalid milestone.title length ${milestone.title.length}. Must be between 1 and 75`
        )
      }
      if (milestone.payoutPercent < 1 || milestone.payoutPercent > 100) {
        throw new Error(
          `Invalid milestone.payoutPercent ${milestone.payoutPercent}. Must be between 1 and 100`
        )
      }
    }
    const sumMilestonePayoutPercent = milestones.reduce(
      (acc, cur) => acc + cur.payoutPercent,
      0
    )
    if (sumMilestonePayoutPercent !== 100) {
      throw new Error(
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
      throw new Error('Milestone end dates must be in ascending order')
    }
  }

  private static _validateFundCampaignParams(params: FundCampaignParams) {
    const { backerWallet, campaignId, fundAmountInDrops } = params

    if (backerWallet instanceof Wallet === false) {
      throw new Error(
        `Invalid backerWallet ${backerWallet}. Must be an instance of Wallet`
      )
    }
    if (campaignId === undefined) {
      throw new Error(`Invalid campaignId ${campaignId}. Must be defined`)
    }
    if (campaignId < 0 || campaignId > 2 ** 32 - 1) {
      throw new Error(
        `Invalid campaignId ${campaignId}. Must be between 0 and 2^32 - 1`
      )
    }
    if (fundAmountInDrops <= FUND_CAMPAIGN_DEPOSIT_IN_DROPS) {
      throw new Error(
        `Invalid fundAmountInDrops ${fundAmountInDrops}. Must be more than the fund campaign deposit of ${FUND_CAMPAIGN_DEPOSIT_IN_DROPS} drops`
      )
    }
    if (fundAmountInDrops > 2n ** 64n - 1n) {
      throw new Error(
        `Invalid fundAmountInDrops ${fundAmountInDrops}. Must be less than 2^64 - 1 drops`
      )
    }
  }

  private static _validateInvokeCampaignParams(params: InvokeCampaignParams) {
    const { backerWallet, campaignId, fundTransactionId } = params

    if (backerWallet instanceof Wallet === false) {
      throw new Error(
        `Invalid backerWallet ${backerWallet}. Must be an instance of Wallet`
      )
    }
    if (campaignId < 0 || campaignId > 2 ** 32 - 1) {
      throw new Error(
        `Invalid campaignId ${campaignId}. Must be between 0 and 2^32 - 1`
      )
    }
    if (fundTransactionId < 0 || fundTransactionId > 2 ** 32 - 1) {
      throw new Error(
        `Invalid fundTransactionId ${fundTransactionId}. Must be between 0 and 2^32 - 1`
      )
    }
  }

  private static _validateRequestMilestonePayoutPaymentParams(
    params: RequestMilestonePayoutPaymentParams
  ) {
    const { ownerWallet, campaignId, milestoneIndex } = params

    if (ownerWallet instanceof Wallet === false) {
      throw new Error(
        `Invalid ownerWallet ${ownerWallet}. Must be an instance of Wallet`
      )
    }
    if (campaignId < 0 || campaignId > 2 ** 32 - 1) {
      throw new Error(
        `Invalid campaignId ${campaignId}. Must be between 0 and 2^32 - 1`
      )
    }
    if (milestoneIndex < 0 || milestoneIndex > MILESTONES_MAX_LENGTH - 1) {
      throw new Error(
        `Invalid milestoneIndex ${milestoneIndex}. Must be between 0 and ${
          MILESTONES_MAX_LENGTH - 1
        }`
      )
    }
  }
}
