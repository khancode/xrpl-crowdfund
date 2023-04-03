import { BaseModel } from './BaseModel'
import { CreateCampaignPayload } from './CreateCampaignPayload'
import { MilestonePayload } from './MilestonePayload'

describe('CreateCampaignPayload', () => {
  it('encodes and decodes a model', () => {
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

    const fundRaiseGoalInDrops = BigInt(1000000000000000000)
    const fundRaiseEndDateInUnixSeconds = nextMonthInUnixSeconds
    const milestones: MilestonePayload[] = [
      new MilestonePayload(next2MonthsInUnixSeconds, 25),
      new MilestonePayload(next3MonthsInUnixSeconds, 25),
      new MilestonePayload(next5MonthsInUnixSeconds, 50),
    ]
    const payload = new CreateCampaignPayload(
      fundRaiseGoalInDrops,
      fundRaiseEndDateInUnixSeconds,
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
