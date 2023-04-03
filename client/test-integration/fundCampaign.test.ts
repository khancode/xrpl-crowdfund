import { Wallet } from 'xrpl'
import { Application } from '../app/Application'
import { fundWallet } from '../util/fundWallet'
import { client, connectClient, disconnectClient } from '../util/xrplClient'

describe.skip('Application.fundCampaign', () => {
  let ownerWallet: Wallet
  let backerWallet0: Wallet
  let campaignId: number

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

  it('should fund a new campaign (no backers) with a single backer', async () => {
    const campaignsBeforeFund = await Application.viewCampaigns(client)

    const fundAmountWithoutDepositFeeInDrops = BigInt(50000000)
    const fundAmountInDrops =
      Application.getFundCampaignDepositInDrops() +
      fundAmountWithoutDepositFeeInDrops
    await Application.fundCampaign(client, {
      backerWallet: backerWallet0,
      campaignId,
      fundAmountInDrops,
    })

    const campaignsAfterFund = await Application.viewCampaigns(client)
    const campaignFunded = campaignsAfterFund.find(
      (campaign) => campaign.id === campaignId
    )

    expect(campaignsAfterFund.length).toBe(campaignsBeforeFund.length)
    expect(campaignFunded).toBeDefined()
    expect(campaignFunded?.totalAmountRaisedInDrops.toString()).toBe(
      fundAmountWithoutDepositFeeInDrops.toString()
    )
    expect(campaignFunded?.totalReserveAmountInDrops.toString()).toBe(
      (
        Application.getCreateCampaignDepositInDrops() +
        Application.getFundCampaignDepositInDrops()
      ).toString()
    )
    expect(campaignFunded?.backers.length).toBe(1)
    expect(campaignFunded?.backers[0].account).toBe(backerWallet0.address)
    expect(
      campaignFunded?.backers[0].fundTransactions[0].amountInDrops.toString()
    ).toBe(fundAmountWithoutDepositFeeInDrops.toString())
    expect(campaignFunded?.fundTransactions.length).toBe(1)
    expect(campaignFunded?.fundTransactions[0].id).toBe(0)
    expect(campaignFunded?.fundTransactions[0].account).toBe(
      backerWallet0.address
    )
    expect(campaignFunded?.fundTransactions[0].state).toBe('approve')
    expect(campaignFunded?.fundTransactions[0].amountInDrops.toString()).toBe(
      fundAmountWithoutDepositFeeInDrops.toString()
    )
  })

  it('should fund a new campaign (no backers) with multiple backers', async () => {
    // sleep 10 seconds before funding a new wallet again on Hooks Testnet v3.
    await new Promise((resolve) => setTimeout(resolve, 10000))
    const backerWallet1 = await fundWallet()
    // sleep 10 seconds before funding a new wallet again on Hooks Testnet v3.
    await new Promise((resolve) => setTimeout(resolve, 10000))
    const backerWallet2 = await fundWallet()
    // sleep 10 seconds before funding a new wallet again on Hooks Testnet v3.
    await new Promise((resolve) => setTimeout(resolve, 10000))
    const backerWallets = [backerWallet0, backerWallet1, backerWallet2]
    const backersLength = BigInt(backerWallets.length)

    const campaignsBeforeFund = await Application.viewCampaigns(client)

    const promises: Promise<void>[] = []
    const fundAmountWithoutDepositFeeInDrops = BigInt(50000000)
    backerWallets.forEach((backerWallet) => {
      const fundAmountInDrops =
        Application.getFundCampaignDepositInDrops() +
        fundAmountWithoutDepositFeeInDrops
      promises.push(
        Application.fundCampaign(client, {
          backerWallet,
          campaignId,
          fundAmountInDrops,
        })
      )
    })

    await Promise.all(promises)

    const campaignsAfterFund = await Application.viewCampaigns(client)
    const campaignFunded = campaignsAfterFund.find(
      (campaign) => campaign.id === campaignId
    )

    expect(campaignsAfterFund.length).toBe(campaignsBeforeFund.length)
    expect(campaignFunded).toBeDefined()
    expect(campaignFunded?.totalAmountRaisedInDrops.toString()).toBe(
      (fundAmountWithoutDepositFeeInDrops * backersLength).toString()
    )
    expect(campaignFunded?.totalReserveAmountInDrops.toString()).toBe(
      (
        Application.getCreateCampaignDepositInDrops() +
        Application.getFundCampaignDepositInDrops() * backersLength
      ).toString()
    )
    expect(campaignFunded?.backers.length.toString()).toBe(
      backersLength.toString()
    )

    const expectedBackerWalletAddresses = backerWallets.map(
      (backerWallet) => backerWallet.address
    )
    let backerWalletAddresses: string[] = []
    const expectedFundTransactionIds: number[] = [0, 1, 2]
    let fundTransactionIds: number[] = []

    campaignFunded?.fundTransactions.forEach((fundTransaction) => {
      expect(fundTransaction.state).toBe('approve')
      expect(fundTransaction.amountInDrops.toString()).toBe(
        fundAmountWithoutDepositFeeInDrops.toString()
      )
      backerWalletAddresses.push(fundTransaction.account)
      fundTransactionIds.push(fundTransaction.id)
    })

    expect(backerWalletAddresses).toEqual(
      expect.arrayContaining(expectedBackerWalletAddresses)
    )
    expect(fundTransactionIds).toEqual(
      expect.arrayContaining(expectedFundTransactionIds)
    )

    backerWalletAddresses = []
    fundTransactionIds = []

    campaignFunded?.backers.forEach((backer) => {
      expect(backer.fundTransactions.length).toBe(1)
      expect(backer.fundTransactions[0].state).toBe('approve')
      expect(backer.fundTransactions[0].amountInDrops.toString()).toBe(
        fundAmountWithoutDepositFeeInDrops.toString()
      )
      backerWalletAddresses.push(backer.account)
      fundTransactionIds.push(backer.fundTransactions[0].id)
    })

    expect(backerWalletAddresses).toEqual(
      expect.arrayContaining(expectedBackerWalletAddresses)
    )
    expect(fundTransactionIds).toEqual(
      expect.arrayContaining(expectedFundTransactionIds)
    )

    expect(campaignFunded?.fundTransactions.length.toString()).toBe(
      backersLength.toString()
    )
  })
})
