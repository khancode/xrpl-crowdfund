import { Client } from 'xrpl'

const client = new Client(`wss://hooks-testnet-v3.xrpl-labs.com`)

async function connectClient(): Promise<void> {
  console.log('\nclient connecting...')
  await client.connect()
  console.log('client connected!\n')
}

async function disconnectClient() {
  console.log('\nclient disconnecting...')
  await client.disconnect()
  console.log('client connected!')
}

export { client, connectClient, disconnectClient }
