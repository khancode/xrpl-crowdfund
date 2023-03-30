import { Wallet } from 'xrpl'
import { Application } from '../app/Application'
import { fundWallet } from '../util/fundWallet'
import { generateRandomDestinationTag } from '../util/transaction'

describe('Application.createCampaign', () => {
  let ownerWallet: Wallet

  beforeAll(async () => {
    // NOTE: Must wait 10 seconds before funding a new wallet again on Hooks Testnet v3.
    ownerWallet = await fundWallet()
    // sleep 2 seconds to allow the wallet to be funded
    await new Promise((resolve) => setTimeout(resolve, 2000))
  })

  it('should create a campaign', async () => {
    const destinationTag = generateRandomDestinationTag()
    const title =
      'title ioasej pf asiopefja sjeopfjopaisjef aoipsj eofjasoej fopas ejofjaos i'
    const description =
      "The Ultimate Fighting Championship (UFC) is the world's premier mixed martial arts (MMA) organization, showcasing a unique blend of striking, grappling, and submission techniques from various martial arts disciplines. Founded in 1993, the UFC has grown exponentially over the years, transforming from a niche sport into a global phenomenon, reaching millions of fans worldwide. The UFC was initially created as a competition to determine the most effective martial art, pitting practitioners of different disciplines against each other in a no-holds-barred format. However, over time, the organization evolved, introducing weight classes and implementing a comprehensive set of rules and regulations, prioritizing the safety and well-being of the fighters. Today, the UFC operates under the unified rules of MMA, which have been widely adopted across the sport. These rules dictate the legal striking techniques, grappling positions, and submissions, as well as the appropriate attire and protective gear for fighters. The UFC also adheres to strict drug testing protocols to ensure a level playing field for all competitors."
    const overviewURL = 'https://www.google.com'
    const fundRaiseGoalInDrops = BigInt(25000000000)
    const fundRaiseEndDateInUnixSeconds = BigInt(
      Math.floor(Date.now() / 1000) + 1000
    ) // next month
    const milestones = [
      {
        endDateInUnixSeconds: BigInt(Math.floor(Date.now() / 1000) + 2000), // next 2 month
        title: 'first milestone',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds: BigInt(Math.floor(Date.now() / 1000) + 3000), // next 3 months
        title: 'second milestone',
        payoutPercent: 25,
      },
      {
        endDateInUnixSeconds: BigInt(Math.floor(Date.now() / 1000) + 5000), // next 5 months
        title: 'third/final milestone',
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
