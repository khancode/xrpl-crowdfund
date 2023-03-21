import { XRPAddress } from '../../util/types'
import { BaseModel } from './BaseModel'
import { Metadata } from './types'

describe('BaseModel', () => {
  it('encodes and decodes a model', () => {
    const SampleModel = class extends BaseModel {
      owner: XRPAddress

      constructor(owner: XRPAddress) {
        super()
        this.owner = owner
      }

      getMetadata(): Metadata {
        return [{ field: 'owner', type: 'xrpAddress' }]
      }
    }

    const owner = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'
    const sample = new SampleModel(owner)

    const sampleEncoded = sample.encode()
    const sampleDecoded = BaseModel.decode(sampleEncoded, SampleModel)
    expect(sample.owner).toBe(sampleDecoded.owner)
  })
})
