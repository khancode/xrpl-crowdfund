import { client, connectClient, disconnectClient } from './xrplClient'

describe('xrplClient', () => {
  it('connect/disconnect client', async () => {
    expect(client.isConnected()).toBe(false)
    await connectClient()
    expect(client.isConnected()).toBe(true)
    await disconnectClient()
    expect(client.isConnected()).toBe(false)
  })
})
