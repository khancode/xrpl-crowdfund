import { BaseModel } from './BaseModel'
import { CreateCampaignPayloadPartA } from './CreateCampaignPayloadPartA'

describe('CreateCampaignPayloadPartA', () => {
  it('encodes and decodes a model', () => {
    const title = 'this is a brief title'
    const fundRaiseGoalInDrops = BigInt(1000000000000000000)
    const nextMonthDateInUnixSeconds = Math.floor(
      (Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000
    )
    const totalMilestones = 5
    const payload = new CreateCampaignPayloadPartA(
      title,
      fundRaiseGoalInDrops,
      nextMonthDateInUnixSeconds,
      totalMilestones
    )

    const payloadEncoded = payload.encode()

    const payloadDecoded = BaseModel.decode(
      payloadEncoded,
      CreateCampaignPayloadPartA
    )

    expect(payloadDecoded).toEqual(payload)
  })
})
