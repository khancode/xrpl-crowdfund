import { dropsToXrp } from 'xrpl'

import { client, connectClient, disconnectClient } from './util/xrplClient'
import { BaseResponse } from 'xrpl/dist/npm/models/methods/baseMethod'

async function serverState(): Promise<BaseResponse> {
  const request = {
    command: 'server_state',
  }
  return await client.request(request)
}

async function run() {
  await connectClient()

  const response = await serverState()
  // @ts-expect-error -- this is expected to be defined
  const accountReserveFee = response.result.state.validated_ledger?.reserve_base
  // @ts-expect-error -- this is expected to be defined
  const ownerReserveFee = response.result.state.validated_ledger?.reserve_inc

  console.log(`\nserver_state response:`)
  console.log(JSON.stringify(response, null, 2))

  console.log(`\nAccount Reserve Fee:`)
  console.log(`\t- drops: ${accountReserveFee}`)
  console.log(`\t- XRP: ${dropsToXrp(accountReserveFee)}`)

  console.log(`\nOwner Reserve Fee:`)
  console.log(`\t- drops: ${ownerReserveFee}`)
  console.log(`\t- XRP: ${dropsToXrp(ownerReserveFee)}`)

  await disconnectClient()
}

run()
