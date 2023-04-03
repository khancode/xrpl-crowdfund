import { Application } from '../app/Application'
import { client, connectClient, disconnectClient } from '../util/xrplClient'

describe.skip('Application.viewCampaigns', () => {
  beforeAll(async () => {
    await connectClient()
  })

  afterAll(async () => {
    await disconnectClient()
  })

  // NOTE: this isn't a test, only used to view campaigns
  it('should view all campaigns', async () => {
    const campaigns = await Application.viewCampaigns(client)

    // console.log(`campaigns:`)
    // console.log(campaigns)

    // console.log(`campaigns[0].milestones:`)
    // console.log(campaigns[0].milestones)

    // const campaignAfterFund = campaigns.find(
    //   (campaign) => campaign.id === 1792894561
    // )

    // console.log(`campaignAfterFund:`)
    // console.log(campaignAfterFund)

    expect(true).toBe(true)
  })
})
