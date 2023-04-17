import express, { Request, Response } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { Wallet } from 'xrpl'
import {
  CreateCampaignParams,
  FundCampaignParams,
  VoteRejectMilestoneParams,
  VoteApproveMilestoneParams,
  RequestRefundPaymentParams,
  RequestMilestonePayoutPaymentParams,
  Application,
} from '../../client/app/Application'
import {
  client,
  connectClient,
  disconnectClient,
} from '../../client/util/xrplClient'
import connectDatabase from '../../client/database'

const PORT = 3001
const app = express()
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

connectClient()
const database = connectDatabase()

type PostCampaignParams = {
  ownerSeed: string
  depositInDrops: string
  title: string
  description: string
  overviewUrl: string
  fundRaiseGoalInDrops: string
  fundRaiseEndDateInUnixSeconds: string
  milestones: Array<{
    endDateInUnixSeconds: string
    title: string
    payoutPercent: number
  }>
}

type PostCampaignFundTransactionsParams = {
  backerWalletSeed: string
  fundAmountInDrops: string
}

type PostVoteReject = {
  backerWalletSeed: string
}

type PostVoteApprove = {
  backerWalletSeed: string
}

type PostRequestRefundPayment = {
  backerWalletSeed: string
}

type PostRequestMilestonePayoutPayment = {
  ownerWalletSeed: string
}

app.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const campaigns = await Application.viewCampaigns(client, database)
    const serializedCampaigns = campaigns.map((campaign) => {
      return campaign.serialize()
    })

    res.send(serializedCampaigns)
  } catch (err: any) {
    res.status(500).send(err.message)
  }
})

app.get('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const campaign = await Application.getCampaignById(client, database, id)
    const serializedCampaign = campaign.serialize()
    res.send(serializedCampaign)
  } catch (err: any) {
    res.status(500).send(err.message)
  }
})

app.get('/deposit-fee/:operation', async (req: Request, res: Response) => {
  try {
    const operation = req.params.operation
    let depositInDrops

    if (operation === 'create-campaign') {
      depositInDrops = await Application.getCreateCampaignDepositInDrops()
    } else if (operation === 'fund-campaign') {
      depositInDrops = await Application.getFundCampaignDepositInDrops()
    } else {
      return res.status(400).send('Invalid operation specified')
    }

    res.send({ depositInDrops: depositInDrops.toString() })
  } catch (err: any) {
    res.status(500).send(err.message)
  }
})

app.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const params: PostCampaignParams = req.body
    const createCampaignParams: CreateCampaignParams = {
      ownerWallet: Wallet.fromSeed(params.ownerSeed),
      depositInDrops: BigInt(params.depositInDrops),
      title: params.title,
      description: params.description,
      overviewUrl: params.overviewUrl,
      fundRaiseGoalInDrops: BigInt(params.fundRaiseGoalInDrops),
      fundRaiseEndDateInUnixSeconds: BigInt(
        params.fundRaiseEndDateInUnixSeconds
      ),
      milestones: params.milestones.map((milestone) => {
        return {
          endDateInUnixSeconds: BigInt(milestone.endDateInUnixSeconds),
          title: milestone.title,
          payoutPercent: milestone.payoutPercent,
        }
      }),
    }
    const campaignId = await Application.createCampaign(
      client,
      database,
      createCampaignParams
    )
    res.send({ campaignId })
  } catch (err: any) {
    res.status(500).send(err.message)
  }
})

app.post(
  '/campaigns/:id/fund-transactions',
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id)
      const params: PostCampaignFundTransactionsParams = req.body
      const fundCampaignParams: FundCampaignParams = {
        backerWallet: Wallet.fromSeed(params.backerWalletSeed),
        campaignId: id,
        fundAmountInDrops: BigInt(params.fundAmountInDrops),
      }
      const fundTransactionId = await Application.fundCampaign(
        client,
        fundCampaignParams
      )
      res.send({ fundTransactionId })
    } catch (err: any) {
      res.status(500).send(err.message)
    }
  }
)

app.post(
  '/campaigns/:campaignId/fund-transactions/:fundTransactionId/vote-reject',
  async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId)
      const fundTransactionId = parseInt(req.params.fundTransactionId)
      const params: PostVoteReject = req.body
      const voteRejectParams: VoteRejectMilestoneParams = {
        backerWallet: Wallet.fromSeed(params.backerWalletSeed),
        campaignId,
        fundTransactionId,
      }
      await Application.voteRejectMilestone(client, voteRejectParams)
      res.send('OK')
    } catch (err: any) {
      res.status(500).send(err.message)
    }
  }
)

app.post(
  '/campaigns/:campaignId/fund-transactions/:fundTransactionId/vote-approve',
  async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId)
      const fundTransactionId = parseInt(req.params.fundTransactionId)
      const params: PostVoteApprove = req.body
      const voteApproveParams: VoteApproveMilestoneParams = {
        backerWallet: Wallet.fromSeed(params.backerWalletSeed),
        campaignId,
        fundTransactionId,
      }
      await Application.voteApproveMilestone(client, voteApproveParams)
      res.send('OK')
    } catch (err: any) {
      res.status(500).send(err.message)
    }
  }
)

app.post(
  '/campaigns/:campaignId/fund-transactions/:fundTransactionId/request-refund-payment',
  async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId)
      const fundTransactionId = parseInt(req.params.fundTransactionId)
      const params: PostRequestRefundPayment = req.body
      const requestRefundPaymentParams: RequestRefundPaymentParams = {
        backerWallet: Wallet.fromSeed(params.backerWalletSeed),
        campaignId,
        fundTransactionId,
      }
      await Application.requestRefundPayment(client, requestRefundPaymentParams)
      res.send('OK')
    } catch (err: any) {
      res.status(500).send(err.message)
    }
  }
)

app.post(
  '/campaigns/:campaignId/milestones/:milestoneIndex/request-milestone-payout-payment',
  async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId)
      const milestoneIndex = parseInt(req.params.milestoneIndex)
      const params: PostRequestMilestonePayoutPayment = req.body
      const requestMilestonePayoutPaymentParams: RequestMilestonePayoutPaymentParams =
        {
          ownerWallet: Wallet.fromSeed(params.ownerWalletSeed),
          campaignId,
          milestoneIndex,
        }
      await Application.requestMilestonePayoutPayment(
        client,
        requestMilestonePayoutPaymentParams
      )
      res.send('OK')
    } catch (err: any) {
      res.status(500).send(err.message)
    }
  }
)

const server = app.listen(PORT, () => {
  console.log(`xrpl-crowdfund listening at http://localhost:${PORT}`)
})

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down gracefully`)

  server.close(() => {
    console.log('HTTP server closed')
    disconnectClient()
      .then(() => {
        console.log('XRPL client disconnected')
        database.close().then(() => {
          console.log('Database connection closed')
          process.exit(0)
        })
      })
      .catch((error) => {
        console.error('Error during cleanup:', error)
        process.exit(1)
      })
  })

  setTimeout(() => {
    console.error('Shutdown timed out, forcefully terminating process')
    process.exit(1)
  }, 5000)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
