import mongoose from 'mongoose'

export interface IMilestoneDatabaseModel {
  endDateInUnixSeconds: string
  title: string
}

export interface ICampaignDatabaseModel {
  id: number
  title: string
  description: string
  overviewUrl: string
  milestones: IMilestoneDatabaseModel[]
}

const milestoneSchema = new mongoose.Schema<IMilestoneDatabaseModel>({
  endDateInUnixSeconds: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
})

const campaignSchema = new mongoose.Schema<ICampaignDatabaseModel>({
  id: {
    type: Number,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 75,
  },
  description: {
    type: String,
    required: true,
    maxlength: 2500,
  },
  overviewUrl: {
    type: String,
    required: true,
    maxlength: 2300,
  },
  milestones: [milestoneSchema],
})

export const CampaignDatabaseModel = mongoose.model('Campaign', campaignSchema)
