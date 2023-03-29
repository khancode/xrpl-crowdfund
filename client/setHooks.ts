import fs from 'fs'
import path from 'path'

import { Transaction, Wallet } from 'xrpl'
import { deriveHookNamespace, prepareTransactionV3 } from './util/transaction'

import config from '../config.json'
import { client, connectClient, disconnectClient } from './util/xrplClient'
import calculateHookOn, { HookOnTransactionType } from './util/calculateHookOn'

type Config = {
  HOOKS: {
    HOOK_C_FILENAME: string
    HookOn: HookOnTransactionType[]
  }[]
  HOOK_ACCOUNT: {
    seed: string
  }
  HOOK_NAMESPACE_SEED: string
}

type HooksPayloadElement = {
  Hook: {
    CreateCode: string
    HookOn: string
    Flags: number
    HookNamespace: string
    HookApiVersion: number
  }
}

type HooksPayload = HooksPayloadElement[]

const hsfOVERRIDE = 1

function createHooksPayload(config: Config): HooksPayload {
  const result: HooksPayload = []

  const { HOOKS, HOOK_NAMESPACE_SEED } = config
  const HookNamespace = deriveHookNamespace(HOOK_NAMESPACE_SEED)
  for (const hook of HOOKS) {
    const { HOOK_C_FILENAME, HookOn } = hook
    const wasm = fs.readFileSync(
      path.resolve(__dirname, `../build/${HOOK_C_FILENAME}.wasm`)
    )

    result.push({
      Hook: {
        CreateCode: wasm.toString(`hex`).toUpperCase(),
        HookOn: calculateHookOn(HookOn), // `0000000000000000000000000000000000000000000000000000000000000000`,
        Flags: hsfOVERRIDE,
        HookNamespace,
        HookApiVersion: 0,
      },
    })
  }

  return result
}

async function run() {
  await connectClient()

  const HOOK_ACCOUNT = Wallet.fromSeed(config.HOOK_ACCOUNT.seed)
  const Hooks = createHooksPayload(config as Config)

  const tx: Transaction = {
    // @ts-expect-error -- SetHook is a new transaction type not added to xrpl.js yet
    TransactionType: `SetHook`,
    Account: HOOK_ACCOUNT.address,
    Hooks,
  }

  await prepareTransactionV3(tx)

  console.log(`1. Transaction to submit (before autofill):`)
  console.log(JSON.stringify(tx, null, 2))
  console.log(`\n2. Submitting transaction...`)

  const result = await client.submitAndWait(tx, {
    autofill: true,
    wallet: HOOK_ACCOUNT,
  })

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
