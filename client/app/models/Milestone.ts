import { MilestoneState } from '../constants'

export class Milestone {
  state: MilestoneState
  endDateInUnixSeconds: bigint
  payoutPercent: number
  title: string

  constructor(
    state: MilestoneState,
    endDateInUnixSeconds: bigint,
    payoutPercent: number,
    title: string
  ) {
    this.state = state
    this.endDateInUnixSeconds = endDateInUnixSeconds
    this.payoutPercent = payoutPercent
    this.title = title
  }

  /**
   * Used to serialize the Milestone object into a JSON object
   * that can be sent as a server response.
   *
   * Note: BigInt values are converted to strings because JSON
   *      doesn't support BigInt values.
   *
   * @returns {object} - A JSON object representing the Milestone
   *
   * @memberof Milestone
   */
  serialize(): object {
    return {
      state: this.state,
      endDateInUnixSeconds: this.endDateInUnixSeconds.toString(),
      payoutPercent: this.payoutPercent,
      title: this.title,
    }
  }
}
