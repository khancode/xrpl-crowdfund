import { MilestoneState } from '../constants'

export class Milestone {
  state: MilestoneState
  endDateInUnixSeconds: bigint
  payoutPercent: number
  rejectVotes: number
  title: string

  constructor(
    state: MilestoneState,
    endDateInUnixSeconds: bigint,
    payoutPercent: number,
    rejectVotes: number,
    title: string
  ) {
    this.state = state
    this.endDateInUnixSeconds = endDateInUnixSeconds
    this.payoutPercent = payoutPercent
    this.rejectVotes = rejectVotes
    this.title = title
  }
}
