import { deriveMilestonesStates } from './constants'
import { HSVMilestone } from './models/HSVMilestone'

describe('constants', () => {
  describe('deriveMilestonesStates', () => {
    it('should return unstarted state for all milestones', () => {
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

      const fundRaiseEndDateInUnixSeconds = nextMonthInUnixSeconds
      const milestones: HSVMilestone[] = [
        new HSVMilestone(0, next2MonthsInUnixSeconds, 25),
        new HSVMilestone(0, next3MonthsInUnixSeconds, 25),
        new HSVMilestone(0, next5MonthsInUnixSeconds, 25),
      ]

      const milestonesStates = deriveMilestonesStates(
        'fundRaise',
        fundRaiseEndDateInUnixSeconds,
        milestones
      )

      expect(milestonesStates).toEqual(['unstarted', 'unstarted', 'unstarted'])
    })
  })
})
