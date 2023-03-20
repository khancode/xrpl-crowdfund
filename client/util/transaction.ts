import { encode } from 'ripple-binary-codec'
import { Transaction } from 'xrpl'
import { BaseResponse } from 'xrpl/dist/npm/models/methods/baseMethod'

import { client } from './xrplClient'

interface ServerStateRPCResult {
  state: {
    validated_ledger: {
      reserve_base: number // Account Reserve fee
      reserve_inc: number // Owner Reserve fee
    }
  }
}

interface FeeRPCResult {
  drops: {
    base_fee: string
  }
}

async function accountReserveFee(): Promise<number> {
  const request = {
    command: 'server_state',
  }
  const { result } = await client.request(request)
  return (result as ServerStateRPCResult).state.validated_ledger?.reserve_base
}

async function ownerReserveFee(): Promise<number> {
  const request = {
    command: 'server_state',
  }
  const { result } = await client.request(request)
  return (result as ServerStateRPCResult).state.validated_ledger?.reserve_inc
}

async function feeRPC(tx_blob: string): Promise<BaseResponse> {
  console.log(`dat tx_blob`)
  console.log(tx_blob)
  const request = {
    command: 'fee',
    tx_blob,
  }
  return await client.request(request)
}

async function getTransactionFee(transaction: Transaction): Promise<string> {
  const copyTx = JSON.parse(JSON.stringify(transaction))
  copyTx.Fee = `0`
  copyTx.SigningPubKey = ``

  const preparedTx = await client.autofill(copyTx)

  const tx_blob = encode(preparedTx)

  const { result } = await feeRPC(tx_blob)

  return (result as FeeRPCResult).drops.base_fee
}

async function prepareTransactionV3(transaction: Transaction) {
  // @ts-expect-error -- necessary to submit transactions on Hooks Testnet v3
  transaction.NetworkID = 21338
  transaction.Fee = await getTransactionFee(transaction)
}

export { accountReserveFee, ownerReserveFee, prepareTransactionV3 }
