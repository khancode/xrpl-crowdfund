import { BaseModel } from './BaseModel'
import { CreateCampaignPayload } from './CreateCampaignPayload'
import { MilestonePayload } from './MilestonePayload'

describe('CreateCampaignPayload', () => {
  it('encodes and decodes a model', () => {
    const fundRaiseGoalInDrops = BigInt(1000000000000000000)
    const nextMonthDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000)
    )
    const milestones: MilestonePayload[] = [
      new MilestonePayload(BigInt(Math.floor(Date.now() / 1000) + 2000), 25), // next 2 months
      new MilestonePayload(BigInt(Math.floor(Date.now() / 1000) + 3000), 25), // next 3 months
      new MilestonePayload(BigInt(Math.floor(Date.now() / 1000) + 5000), 50), // next 5 months
    ]
    const payload = new CreateCampaignPayload(
      fundRaiseGoalInDrops,
      nextMonthDateInUnixSeconds,
      milestones
    )

    const payloadEncoded = payload.encode()

    const payloadDecoded = BaseModel.decode(
      payloadEncoded,
      CreateCampaignPayload
    )

    expect(payloadDecoded).toEqual(payload)
  })
})
