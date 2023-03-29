import { BaseModel } from './BaseModel'
import { CreateCampaignPayloadPartB } from './CreateCampaignPayloadPartB'
import { MilestonePayload } from './MilestonePayload'

describe('CreateCampaignPayloadPartB', () => {
  it('encodes and decodes a model with one milestone', () => {
    const description = 'this is a brief description'
    const overviewURL = 'https://www.google.com'
    const nextMonthDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000)
    )
    const milestones: MilestonePayload[] = [
      new MilestonePayload('only milestone', nextMonthDateInUnixSeconds, 50),
    ]
    const payload = new CreateCampaignPayloadPartB(
      description,
      overviewURL,
      milestones
    )

    const payloadEncoded = payload.encode()
    const payloadDecoded = BaseModel.decode(
      payloadEncoded,
      CreateCampaignPayloadPartB
    )

    expect(payloadDecoded).toEqual(payload)
  })

  it('encodes and decodes a model', () => {
    const description = 'this is a brief description'
    const overviewURL = 'https://www.google.com'
    const nextMonthDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000)
    )
    const next3MonthsDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30 * 3) / 1000)
    )
    const milestones: MilestonePayload[] = [
      new MilestonePayload('first milestone', nextMonthDateInUnixSeconds, 50),
      new MilestonePayload('last milestone', next3MonthsDateInUnixSeconds, 50),
    ]
    const payload = new CreateCampaignPayloadPartB(
      description,
      overviewURL,
      milestones
    )

    const payloadEncoded = payload.encode()

    const payloadDecoded = BaseModel.decode(
      payloadEncoded,
      CreateCampaignPayloadPartB
    )

    expect(payloadDecoded).toEqual(payload)
  })

  it('encodes and decodes a model with max milestones', () => {
    const description = 'this is a brief description'
    const overviewURL = 'https://www.google.com'
    const nextMonthDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000)
    )
    const milestones: MilestonePayload[] = []
    for (let i = 0; i < 10; i++) {
      milestones.push(
        new MilestonePayload(
          `milestone ${i}`,
          nextMonthDateInUnixSeconds + BigInt(i * 1000),
          50
        )
      )
    }

    const payload = new CreateCampaignPayloadPartB(
      description,
      overviewURL,
      milestones
    )

    const payloadEncoded = payload.encode()

    const payloadDecoded = BaseModel.decode(
      payloadEncoded,
      CreateCampaignPayloadPartB
    )

    expect(payloadDecoded).toEqual(payload)
  })

  it('throws error when encoding a model with too many milestones', () => {
    const description = 'this is a brief description'
    const overviewURL = 'https://www.google.com'
    const nextMonthDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000)
    ) // 30 days from now
    const milestones: MilestonePayload[] = []
    for (let i = 0; i < 11; i++) {
      milestones.push(
        new MilestonePayload(
          `milestone ${i}`,
          nextMonthDateInUnixSeconds + BigInt(i * 1000),
          50
        )
      )
    }

    const payload = new CreateCampaignPayloadPartB(
      description,
      overviewURL,
      milestones
    )

    const errorMessage =
      'milestones varModelArray length 11 exceeds maxArrayLength 10 for model MilestonePayload'
    expect(() => payload.encode()).toThrow(errorMessage)
  })

  it('encodes and decodes a model with a long description', () => {
    const description = 'a'.repeat(2500)
    const overviewURL = 'https://www.google.com'
    const nextMonthDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000)
    )
    const next3MonthsDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30 * 3) / 1000)
    )
    const milestones: MilestonePayload[] = [
      new MilestonePayload('first milestone', nextMonthDateInUnixSeconds, 50),
      new MilestonePayload('last milestone', next3MonthsDateInUnixSeconds, 50),
    ]
    const payload = new CreateCampaignPayloadPartB(
      description,
      overviewURL,
      milestones
    )

    const payloadEncoded = payload.encode()

    const payloadDecoded = BaseModel.decode(
      payloadEncoded,
      CreateCampaignPayloadPartB
    )

    expect(payloadDecoded).toEqual(payload)
  })

  it('encodes and decodes a model with a long overviewURL', () => {
    const description = 'this is a brief description'
    const overviewURL = 'a'.repeat(2300)
    const nextMonthDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000)
    )
    const next3MonthsDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30 * 3) / 1000)
    )
    const milestones: MilestonePayload[] = [
      new MilestonePayload('first milestone', nextMonthDateInUnixSeconds, 50),
      new MilestonePayload('last milestone', next3MonthsDateInUnixSeconds, 50),
    ]
    const payload = new CreateCampaignPayloadPartB(
      description,
      overviewURL,
      milestones
    )

    const payloadEncoded = payload.encode()

    const payloadDecoded = BaseModel.decode(
      payloadEncoded,
      CreateCampaignPayloadPartB
    )

    expect(payloadDecoded).toEqual(payload)
  })

  it('encodes and decodes a model with a long milestone title', () => {
    const description = 'this is a brief description'
    const overviewURL = 'https://www.google.com'
    const nextMonthDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000)
    )
    const next3MonthsDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30 * 3) / 1000)
    )
    const milestones: MilestonePayload[] = [
      new MilestonePayload('a'.repeat(75), nextMonthDateInUnixSeconds, 50),
      new MilestonePayload('last milestone', next3MonthsDateInUnixSeconds, 50),
    ]
    const payload = new CreateCampaignPayloadPartB(
      description,
      overviewURL,
      milestones
    )

    const payloadEncoded = payload.encode()

    const payloadDecoded = BaseModel.decode(
      payloadEncoded,
      CreateCampaignPayloadPartB
    )

    expect(payloadDecoded).toEqual(payload)
  })

  it('errors when description is too long', () => {
    const description = 'a'.repeat(2501)
    const overviewURL = 'https://www.google.com'
    const nextMonthDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000)
    )
    const next3MonthsDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30 * 3) / 1000)
    )
    const milestones: MilestonePayload[] = [
      new MilestonePayload('first milestone', nextMonthDateInUnixSeconds, 50),
      new MilestonePayload('last milestone', next3MonthsDateInUnixSeconds, 50),
    ]
    const payload = new CreateCampaignPayloadPartB(
      description,
      overviewURL,
      milestones
    )

    const errorMessage = 'String length 2501 exceeds max length of 2500'
    expect(() => payload.encode()).toThrow(errorMessage)
  })

  it('errors when overviewURL is too long', () => {
    const description = 'this is a brief description'
    const overviewURL = 'a'.repeat(2301)
    const nextMonthDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000)
    )
    const next3MonthsDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30 * 3) / 1000)
    )
    const milestones: MilestonePayload[] = [
      new MilestonePayload('first milestone', nextMonthDateInUnixSeconds, 50),
      new MilestonePayload('last milestone', next3MonthsDateInUnixSeconds, 50),
    ]
    const payload = new CreateCampaignPayloadPartB(
      description,
      overviewURL,
      milestones
    )

    const errorMessage = 'String length 2301 exceeds max length of 2300'
    expect(() => payload.encode()).toThrow(errorMessage)
  })

  it('errors when milestone title is too long', () => {
    const description = 'this is a brief description'
    const overviewURL = 'https://www.google.com'
    const nextMonthDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000)
    )
    const next3MonthsDateInUnixSeconds = BigInt(
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30 * 3) / 1000)
    )
    const milestones: MilestonePayload[] = [
      new MilestonePayload('a'.repeat(76), nextMonthDateInUnixSeconds, 50),
      new MilestonePayload('last milestone', next3MonthsDateInUnixSeconds, 50),
    ]
    const payload = new CreateCampaignPayloadPartB(
      description,
      overviewURL,
      milestones
    )

    const errorMessage = 'String length 76 exceeds max length of 75'
    expect(() => payload.encode()).toThrow(errorMessage)
  })
})
