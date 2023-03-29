import { connectClient, disconnectClient } from './client/util/xrplClient'

import { serverStateRPC } from './client/util/transaction'

async function run() {
  await connectClient()

  const { result } = await serverStateRPC()
  console.log(result)

  await disconnectClient()
}

run()
