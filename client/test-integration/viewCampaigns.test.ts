import { Application } from '../app/Application'

describe.skip('Application.viewCampaigns', () => {
  it('should view all campaigns', async () => {
    const campaigns = await Application.viewCampaigns()

    console.log(`campaigns:`)
    console.log(campaigns)

    console.log(`campaigns[0].milestones:`)
    console.log(campaigns[0].milestones)

    // TODO: Implement test
    expect(true).toBe(true)
  })
})
