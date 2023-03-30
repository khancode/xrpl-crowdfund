export class Milestone {
  state: number // TODO - define possible states
  endDateInUnixSeconds: BigInt
  payoutPercent: number
  rejectVotes: number
  title: string // Max length 75 utf-8 characters
}
