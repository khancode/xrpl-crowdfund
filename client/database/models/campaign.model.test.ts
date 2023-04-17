import { CampaignDatabaseModel } from './campaign.model'
import connectDatabase from '..'
import { Connection } from 'mongoose'

describe('Campaign model', () => {
  let database: Connection

  // Establish a database connection before running the tests
  beforeAll(async () => {
    database = await connectDatabase()
  })

  // Close the database connection after running the tests
  afterAll(async () => {
    await database.close()
  })

  it('should save a campaign with valid data', async () => {
    const campaignData = {
      id: 1,
      title: 'My Campaign',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      overviewUrl: 'https://example.com/my-campaign',
      milestones: [
        { endDateInUnixSeconds: 1642435200n, title: 'Milestone 1' },
        { endDateInUnixSeconds: 1643521600n, title: 'Milestone 2' },
      ],
    }

    const campaign = new CampaignDatabaseModel(campaignData)
    const savedCampaign = await campaign.save()

    expect(savedCampaign._id).toBeDefined()
    expect(savedCampaign.id).toBe(campaignData.id)
    expect(savedCampaign.title).toBe(campaignData.title)
    expect(savedCampaign.description).toBe(campaignData.description)
    expect(savedCampaign.overviewUrl).toBe(campaignData.overviewUrl)
    expect(savedCampaign.milestones.length).toBe(campaignData.milestones.length)

    await CampaignDatabaseModel.deleteOne({ _id: savedCampaign._id })
  })

  it('should not save a campaign without required fields', async () => {
    const campaignData = {
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      overviewUrl: 'https://example.com/my-campaign',
      milestones: [
        { endDateInUnixSeconds: 1642435200, title: 'Milestone 1' },
        { endDateInUnixSeconds: 1643521600, title: 'Milestone 2' },
      ],
    }

    const campaign = new CampaignDatabaseModel(campaignData)

    await expect(campaign.save()).rejects.toThrow()
  })

  // Add more test cases as needed
})
