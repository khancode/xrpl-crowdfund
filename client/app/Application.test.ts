import { Wallet } from 'xrpl'
import { Application, CreateCampaignParams } from './Application'

describe('Application', () => {
  describe('createCampaign', () => {
    describe('_validateCreateCampaignParams', () => {
      let ownerWallet: Wallet
      let params: CreateCampaignParams

      beforeAll(() => {
        ownerWallet = Wallet.generate()
      })

      beforeEach(() => {
        params = {
          ownerWallet,
          destinationTag: 0,
          title: 'title',
          description: 'description',
          overviewURL: 'overviewURL',
          fundRaiseGoalInDrops: BigInt(25000000000),
          fundRaiseEndDateInUnixSeconds: Math.floor(Date.now() / 1000) + 1000, // next month
          milestones: [
            {
              endDateInUnixSeconds: Math.floor(Date.now() / 1000) + 2000, // next 2 month
              title: 'milestoneTitle',
              payoutPercent: 25,
            },
            {
              endDateInUnixSeconds: Math.floor(Date.now() / 1000) + 3000, // next 3 months
              title: 'milestoneTitle',
              payoutPercent: 25,
            },
            {
              endDateInUnixSeconds: Math.floor(Date.now() / 1000) + 5000, // next 5 months
              title: 'milestoneTitle',
              payoutPercent: 50,
            },
          ],
        }
      })

      it('should not throw', () => {
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).not.toThrow()
      })

      it('should throw if destinationTag is negative', () => {
        params.destinationTag = -1
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow('Invalid destinationTag -1. Must be between 0 and 2^32 - 1')
      })

      it('should throw if destinationTag is greater than 2^32 - 1', () => {
        params.destinationTag = 2 ** 32
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow(
          'Invalid destinationTag 4294967296. Must be between 0 and 2^32 - 1'
        )
      })

      it('should throw if title is too short', () => {
        params.title = ''
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow('Invalid title length 0. Must be between 1 and 75')
      })

      it('should throw if title is too long', () => {
        params.title = 'a'.repeat(76)
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow('Invalid title length 76. Must be between 1 and 75')
      })

      it('should throw if description is too short', () => {
        params.description = ''
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow('Invalid description length 0. Must be between 1 and 2500')
      })

      it('should throw if description is too long', () => {
        params.description = 'a'.repeat(2501)
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow('Invalid description length 2501. Must be between 1 and 2500')
      })

      it('should throw if overviewURL is too short', () => {
        params.overviewURL = ''
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow('Invalid overviewURL length 0. Must be between 1 and 2300')
      })

      it('should throw if overviewURL is too long', () => {
        params.overviewURL = 'a'.repeat(2301)
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow('Invalid overviewURL length 2301. Must be between 1 and 2300')
      })

      it('should throw if fundRaiseGoalInDrops is greater than the max value allowed', () => {
        params.fundRaiseGoalInDrops = BigInt(2 ** 64)
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow(
          'Invalid fundRaiseGoalInDrops 18446744073709551616. Must be between 1 and 2^64 - 1'
        )
      })

      it('should throw if fundRaiseEndDateInUnixSeconds is less than now', () => {
        params.fundRaiseEndDateInUnixSeconds = Math.floor(Date.now() / 1000) - 1
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow(
          `Invalid fundRaiseEndDateInUnixSeconds ${params.fundRaiseEndDateInUnixSeconds} is a past date. Must be a future date`
        )
      })

      it('should throw if fundRaiseEndDateInUnixSeconds is greater than the max value allowed', () => {
        params.fundRaiseEndDateInUnixSeconds = 2 ** 32
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow(
          `Invalid fundRaiseEndDateInUnixSeconds ${params.fundRaiseEndDateInUnixSeconds} exceeds max value. Must be less than 2^32 - 1`
        )
      })

      it('should throw if milestones is empty', () => {
        params.milestones = []
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow('Invalid milestones length 0. Must be between 1 and 10')
      })

      it('should throw if milestones is greater than the max value allowed', () => {
        params.milestones = Array(11).fill({
          endDateInUnixSeconds: Math.floor(Date.now() / 1000) + 2000, // next 2 month
          title: 'milestoneTitle',
          payoutPercent: 25,
        })
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow('Invalid milestones length 11. Must be between 1 and 10')
      })

      it('should throw if milestone.endDateInUnixSeconds is less than now', () => {
        params.milestones[0].endDateInUnixSeconds =
          Math.floor(Date.now() / 1000) - 1
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow(
          `Invalid milestone.endDateInUnixSeconds ${params.milestones[0].endDateInUnixSeconds} is a past date. Must be a future date`
        )
      })

      it('should throw if milestone.endDateInUnixSeconds is greater than the max value allowed', () => {
        params.milestones[0].endDateInUnixSeconds = 2 ** 32
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow(
          `Invalid milestone.endDateInUnixSeconds ${params.milestones[0].endDateInUnixSeconds} exceeds max value. Must be less than 2^32 - 1`
        )
      })

      it('should throw if milestone.title is too short', () => {
        params.milestones[0].title = ''
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow('Invalid milestone.title length 0. Must be between 1 and 75')
      })

      it('should throw if milestone.title is too long', () => {
        params.milestones[0].title = 'a'.repeat(76)
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow('Invalid milestone.title length 76. Must be between 1 and 75')
      })

      it('should throw if milestone.payoutPercent is less than 1', () => {
        params.milestones[0].payoutPercent = 0
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow(
          'Invalid milestone.payoutPercent 0. Must be between 1 and 100'
        )
      })

      it('should throw if milestone.payoutPercent is greater than 100', () => {
        params.milestones[0].payoutPercent = 101
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow(
          'Invalid milestone.payoutPercent 101. Must be between 1 and 100'
        )
      })

      it('should throw if milestones are not in ascending order', () => {
        params.milestones[0].endDateInUnixSeconds =
          Math.floor(Date.now() / 1000) + 4000
        params.milestones[1].endDateInUnixSeconds =
          Math.floor(Date.now() / 1000) + 1000
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow('Milestone end dates must be in ascending order')
      })

      it('should throw if milestones payoutPercent is not 100', () => {
        params.milestones[0].payoutPercent = 50
        params.milestones[1].payoutPercent = 50
        expect(() =>
          // @ts-expect-error - we're testing the private method
          Application._validateCreateCampaignParams(params)
        ).toThrow(
          'Invalid milestone payoutPercent(s) sum 150. All milestone payoutPercent(s) must sum to exactly 100'
        )
      })
    })
  })
})
