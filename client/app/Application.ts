/*
Contains the operations that can are performed by the application.

Here are the operations that are required by the application:
1. Create Campaign
2. View Campaigns
3. Fund Campaign
4. Vote Reject Milestone
5. Vote Approve Milestone
6. Request Refund Payment
7. Request Milestone Payout Payment
*/

import {
  CREATE_CAMPAIGN_DEPOSIT_IN_DROPS,
  DESCRIPTION_MAX_LENGTH,
  MILESTONES_MAX_LENGTH,
  OVERVIEW_URL_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from './constants'

export interface CreateCampaignParams {
  destinationTag: number
  owner: string
  title: string
  description: string
  overviewURL: string
  fundRaiseGoalInDrops: bigint
  fundRaiseEndDateInUnixSeconds: number
  milestones: Array<{
    endDateInUnixSeconds: number
    title: string
    payoutPercent: number
  }>
}

export class Application {
  static createCampaign(params: CreateCampaignParams) {
    const {
      destinationTag,
      owner,
      title,
      description,
      overviewURL,
      fundRaiseGoalInDrops,
      fundRaiseEndDateInUnixSeconds,
      milestones,
    } = params

    // Step 1. Input validation
    if (destinationTag < 0 || destinationTag > 2 ** 32 - 1) {
      throw Error(
        `Invalid destinationTag ${destinationTag}. Must be between 0 and 2^32 - 1`
      )
    }
    if (owner.length < 25 || owner.length > 35) {
      throw Error(
        `Invalid owner xrpAddress length ${owner.length}. Must be between 25 and 35`
      )
    }
    if (title.length < 1 || title.length > TITLE_MAX_LENGTH) {
      throw Error(
        `Invalid title length ${title.length}. Must be between 1 and ${TITLE_MAX_LENGTH}`
      )
    }
    if (description.length < 1 || description.length > DESCRIPTION_MAX_LENGTH) {
      throw Error(
        `Invalid description length ${description.length}. Must be between 1 and ${DESCRIPTION_MAX_LENGTH}`
      )
    }
    if (
      overviewURL.length < 1 ||
      overviewURL.length > OVERVIEW_URL_MAX_LENGTH
    ) {
      throw Error(
        `Invalid overviewURL length ${overviewURL.length}. Must be between 1 and ${OVERVIEW_URL_MAX_LENGTH}`
      )
    }
    if (fundRaiseGoalInDrops < CREATE_CAMPAIGN_DEPOSIT_IN_DROPS) {
      throw Error(
        `Invalid fundRaiseGoalInDrops ${fundRaiseGoalInDrops}. Must be at least ${CREATE_CAMPAIGN_DEPOSIT_IN_DROPS} to cover the create campaign deposit`
      )
    }
    if (fundRaiseGoalInDrops > 2n ** 64n - 1n) {
      throw Error(
        `Invalid fundRaiseGoalInDrops ${fundRaiseGoalInDrops}. Must be between ${CREATE_CAMPAIGN_DEPOSIT_IN_DROPS} (create campaign deposit) and 2^64 - 1`
      )
    }
    if (fundRaiseEndDateInUnixSeconds < Date.now() / 1000) {
      throw Error(
        `Invalid fundRaiseEndDateInUnixSeconds ${fundRaiseEndDateInUnixSeconds} is a past date. Must be a future date`
      )
    }
    if (fundRaiseEndDateInUnixSeconds > 2 ** 32 - 1) {
      throw Error(
        `Invalid fundRaiseEndDateInUnixSeconds ${fundRaiseEndDateInUnixSeconds} exceeds max value. Must be less than 2^32 - 1`
      )
    }
    if (milestones.length < 1 || milestones.length > MILESTONES_MAX_LENGTH) {
      throw Error(
        `Invalid milestones length ${milestones.length}. Must be between 1 and ${MILESTONES_MAX_LENGTH}`
      )
    }
    for (const milestone of milestones) {
      if (milestone.endDateInUnixSeconds < Date.now() / 1000) {
        throw Error(
          `Invalid milestone.endDateInUnixSeconds ${milestone.endDateInUnixSeconds} is a past date. Must be a future date`
        )
      }
      if (milestone.endDateInUnixSeconds > 2 ** 32 - 1) {
        throw Error(
          `Invalid milestone.endDateInUnixSeconds ${milestone.endDateInUnixSeconds} exceeds max value. Must be less than 2^32 - 1`
        )
      }
      if (milestone.title.length < 1 || milestone.title.length > 75) {
        throw Error(
          `Invalid milestone.title length ${milestone.title.length}. Must be between 1 and 75`
        )
      }
      if (milestone.payoutPercent < 1 || milestone.payoutPercent > 100) {
        throw Error(
          `Invalid milestone.payoutPercent ${milestone.payoutPercent}. Must be between 1 and 100`
        )
      }
    }
    const sumMilestonePayoutPercent = milestones.reduce(
      (acc, cur) => acc + cur.payoutPercent,
      0
    )
    if (sumMilestonePayoutPercent !== 100) {
      throw Error(
        `Invalid milestone payoutPercent(s) sum ${sumMilestonePayoutPercent}. All milestone payoutPercent(s) must sum to exactly 100`
      )
    }
    if (
      milestones.some(
        (milestone, index) =>
          index > 0 &&
          milestone.endDateInUnixSeconds <=
            milestones[index - 1].endDateInUnixSeconds
      )
    ) {
      throw Error('Milestone end dates must be in ascending order')
    }

    // TODO: Step 2. create payloads

    // TODO: Step 3. submit Payment transaction with CreateCampaignPayloadPartA

    // TODO: Step 4. submit Invoke transaction with CreateCampaignPayloadPartB

    // TODO: Step 5. return success/failure
  }

  static viewCampaigns() {
    // TODO: implement
    throw Error('Not implemented')
  }

  static fundCampaign() {
    // TODO: implement
    throw Error('Not implemented')
  }

  static voteRejectMilestone() {
    // TODO: implement
    throw Error('Not implemented')
  }

  static voteApproveMilestone() {
    // TODO: implement
    throw Error('Not implemented')
  }

  static requestRefundPayment() {
    // TODO: implement
    throw Error('Not implemented')
  }

  static requestMilestonePayoutPayment() {
    // TODO: implement
    throw Error('Not implemented')
  }
}
