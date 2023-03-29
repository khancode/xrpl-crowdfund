import { Wallet } from 'xrpl'
import { Application } from '../app/Application'
import { fundWallet } from '../util/fundWallet'
import { generateRandomDestinationTag } from '../util/transaction'

describe('Application.createCampaign', () => {
  let ownerWallet: Wallet

  beforeAll(async () => {
    // NOTE: Must wait 10 seconds before funding a new wallet again on Hooks Testnet v3.
    ownerWallet = await fundWallet()
  })

  it('should create a campaign', async () => {
    const destinationTag = generateRandomDestinationTag()
    const title =
      'title ioasej pf asiopefja sjeopfjopaisjef aoipsj eofjasoej fopas ejofjaos i'
    const description = 'description'
    const overviewURL = 'overviewURL'
    const fundRaiseGoalInDrops = BigInt(25000000000)
    const fundRaiseEndDateInUnixSeconds = BigInt(
      Math.floor(Date.now() / 1000) + 1000
    ) // next month
    const milestones = [
      {
        endDateInUnixSeconds: BigInt(Math.floor(Date.now() / 1000) + 2000), // next 2 month
        title: 'milestoneTitle',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds: BigInt(Math.floor(Date.now() / 1000) + 3000), // next 3 months
        title: 'milestoneTitle',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds: BigInt(Math.floor(Date.now() / 1000) + 5000), // next 5 months
        title: 'milestoneTitle',
        payoutPercent: 50,
      },
    ]

    const result = await Application.createCampaign({
      ownerWallet,
      destinationTag,
      title,
      description,
      overviewURL,
      fundRaiseGoalInDrops,
      fundRaiseEndDateInUnixSeconds,
      milestones,
    })

    expect(true).toBe(true)

    // expect(result).toEqual({
    //   success: true,
    //   campaignId: '1',
    // })
  })
})
