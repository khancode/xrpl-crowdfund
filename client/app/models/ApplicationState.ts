import { Campaign } from './Campaign'

export class ApplicationState {
  campaigns: Campaign[]

  constructor(campaigns: Campaign[]) {
    this.campaigns = campaigns
  }
}
