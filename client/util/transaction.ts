import { encode } from 'ripple-binary-codec'
import { Transaction } from 'xrpl'
import { BaseResponse } from 'xrpl/dist/npm/models/methods/baseMethod'

import { client } from './xrpl-client'

interface FeeRPCResult {
  drops: {
    base_fee: string
  }
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

export { prepareTransactionV3 }
