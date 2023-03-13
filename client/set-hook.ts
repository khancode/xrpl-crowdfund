import fs from 'fs'
import path from 'path'

import { SHA256 } from 'crypto-js';
import { Transaction, Wallet } from 'xrpl'
import { prepareTransactionV3 } from './util/transaction'

import config from '../config.json'
import { client, connectClient, disconnectClient } from './util/xrpl-client'


const hookFilename = config.HOOK_C_FILENAME
const HOOK_ACCOUNT = Wallet.fromSecret(config.HOOK_ACCOUNT.secret)
const hsfOVERRIDE = 1
const wasm = fs.readFileSync(path.resolve(__dirname, `../build/${hookFilename}.wasm`))
const hookNamespace = SHA256(hookFilename).toString().toUpperCase()


async function run() {
  await connectClient()

  const tx: Transaction = {
    // @ts-expect-error -- SetHook is a new transaction type not added to xrpl.js yet
    TransactionType: `SetHook`,
    Account: HOOK_ACCOUNT.address,
    Hooks: [        
      {                        
        Hook: {                
          CreateCode: wasm.toString(`hex`).toUpperCase(),
          HookOn: `0000000000000000000000000000000000000000000000000000000000000000`,
          Flags: hsfOVERRIDE,
          HookNamespace: hookNamespace,
          HookApiVersion: 0,
        },
      },
    ],
  }

  await prepareTransactionV3(tx)

  console.log(`1. Transaction to submit (before autofill):`)
  console.log(JSON.stringify(tx, null, 2))
  console.log(`\n2. Submitting transaction...`)

  const result = await client.submitAndWait(
    tx, 
    { autofill: true, wallet: HOOK_ACCOUNT }
  )

  console.log(`\n3. Transaction result:`)
  console.log(result)

  // @ts-expect-error -- this is expected to be defined
  const txResult = result.result.meta.TransactionResult
  if (txResult === 'tesSUCCESS') {
    console.log(`\n4. SetHook transaction succeeded!`)
  } else {
    console.log(`\n4. SetHook transaction failed with ${txResult}!`)
  }

  await disconnectClient()
}

run()
