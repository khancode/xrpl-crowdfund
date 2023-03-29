import fs from 'fs'
import path from 'path'
import { dropsToXrp, Payment, Wallet } from 'xrpl'

import { client, connectClient, disconnectClient } from '../util/xrplClient'
import {
  accountReserveFee,
  ownerReserveFee,
  prepareTransactionV3,
} from '../util/transaction'

import config from '../../config.json'
import { fundWallet } from '../util/fundWallet'

async function run() {
  await connectClient()

  // 1. Fund new v3 account
  const angelWallet = await fundWallet()
  const hookWallet = Wallet.generate()

  console.log(`\n1. Funded new wallet to send funds to hook wallet:`)
  console.log(angelWallet)

  console.log(
    `\n2. Generated new hook wallet that will receive funds from angelWallet:`
  )
  console.log(hookWallet)

  await sleep(2000)

  // 3. Get account reserve fee
  const accReserveFee = await accountReserveFee()
  const ownReserveFee = await ownerReserveFee()
  const starterSetHookFee = 1300000000 // 124520 // TODO: dynamically get this fee
  const totalAmount = (
    accReserveFee +
    ownReserveFee +
    starterSetHookFee
  ).toString()
  console.log(`\n3. Fetched current Account Reserve Fee:`)
  console.log(`\t- drops: ${accReserveFee}`)
  console.log(`\t- XRP: ${dropsToXrp(accReserveFee)}`)

  // 3. Fund hook wallet with account reserve fee - now it's on the ledger
  const tx: Payment = {
    Account: angelWallet.address,
    TransactionType: `Payment`,
    Destination: hookWallet.address,
    Amount: totalAmount,
  }

  await prepareTransactionV3(tx)

  console.log(
    `\n4. Funding hook wallet with Account Reserve Fee (before autofill):`
  )
  console.log(JSON.stringify(tx, null, 2))

  console.log(`\n5. Submitting transaction...`)

  const result = await client.submitAndWait(tx, {
    autofill: true,
    wallet: angelWallet,
  })

  console.log(`\n6. Transaction result:`)
  console.log(result)

  const updateConfig = JSON.parse(JSON.stringify(config))
  updateConfig.HOOK_ACCOUNT.seed = hookWallet.seed
  await fs.writeFileSync(
    path.resolve(__dirname, '../../config.json'),
    JSON.stringify(updateConfig, null, 2)
  )
  console.log(`\n7. Updated HOOK_ACCOUNT in config.json:`)
  console.log(`\t- seed: ${updateConfig.HOOK_ACCOUNT.seed}`)

  await disconnectClient()
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

run()
