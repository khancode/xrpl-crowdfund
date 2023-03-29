import { SHA256 } from 'crypto-js'
import { encode } from 'ripple-binary-codec'
import { Transaction } from 'xrpl'
import { BaseResponse } from 'xrpl/dist/npm/models/methods/baseMethod'
import { UInt32 } from './types'

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

function generateRandomDestinationTag(): UInt32 {
  return Math.floor(Math.random() * 4294967295)
}

async function serverStateRPC(): Promise<BaseResponse> {
  const request = {
    command: 'server_state',
  }
  return await client.request(request)
}

async function accountReserveFee(): Promise<number> {
  const { result } = await serverStateRPC()
  return (result as ServerStateRPCResult).state.validated_ledger?.reserve_base
}

async function ownerReserveFee(): Promise<number> {
  const { result } = await serverStateRPC()
  return (result as ServerStateRPCResult).state.validated_ledger?.reserve_inc
}

async function feeRPC(tx_blob: string): Promise<BaseResponse> {
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

function deriveHookNamespace(hookNamespaceSeed: string): string {
  return SHA256(hookNamespaceSeed).toString().toUpperCase()
}

export {
  accountReserveFee,
  deriveHookNamespace,
  generateRandomDestinationTag,
  ownerReserveFee,
  prepareTransactionV3,
  serverStateRPC,
}
