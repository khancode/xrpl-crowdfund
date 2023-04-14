import fs from 'fs'

import { fundWallet } from '../util/fundWallet'
import { Wallet } from 'xrpl'
import { client, connectClient, disconnectClient } from '../util/xrplClient'
import { getBalance } from '../util/getBalance'

const WALLETS_PER_TEST_GROUP = 4
const RESERVE_AMOUNT = 200000000n
const PADDING_AMOUNT = 300000000n
const MINIMUM_BALANCE = RESERVE_AMOUNT + PADDING_AMOUNT

export default async (): Promise<void> => {
  /*
    Strategy:
    1. Check current directory for .test.ts files and add them to testGroups
    2. If accounts.json is empty, generate 4 wallets for each test group
    3. Update accounts.json with the new wallet addresses
    4. Check if each wallet has at least 500 XRP (200 Reserve Amount + 300 padding), if not add each one to a list of wallets to refund
    5. Fund a new wallet for each one in the list synchronously waiting 10 seconds (rate-limit) between each refund
  */

  await connectClient()

  /* 1. Check current directory for .test.ts files and add them to testGroups */
  const testGroups: string[] = []
  const files = fs.readdirSync(__dirname)
  // Filenames in current directory
  files.forEach((file) => {
    if (file.endsWith('.test.ts')) {
      testGroups.push(file.replace('.test.ts', ''))
    }
  })

  /* 2. If accounts.json is empty, initialize it with 4 wallets for each test group */
  let accounts: Record<string, Wallet[]>
  try {
    const accountsData = (await import('./accounts.json')) as any
    accounts = accountsData.default
  } catch (err: any) {
    if (err.code === 'MODULE_NOT_FOUND') {
      accounts = {}
    } else {
      throw err
    }
  }

  // check if keys in accounts match testGroups
  let reintAccounts = false
  if (Object.keys(accounts).length !== testGroups.length) {
    reintAccounts = true
  } else {
    for (const testGroup of testGroups) {
      if (!(testGroup in accounts)) {
        reintAccounts = true
        break
      }
    }
  }

  const updatedAccounts: Record<string, Wallet[]> = {}
  if (reintAccounts) {
    console.log('initializing accounts.json...')
    for (const testGroup of testGroups) {
      updatedAccounts[testGroup] = []
    }

    for (let i = 0; i < testGroups.length; i++) {
      for (let j = 0; j < WALLETS_PER_TEST_GROUP; j++) {
        const wallet = Wallet.generate()
        updatedAccounts[testGroups[i]].push(wallet)
      }
    }

    /* 3. Update accounts.json with the new wallet addresses */
    const accountsJSON = JSON.stringify(updatedAccounts, null, 2)
    fs.writeFileSync(`${__dirname}/accounts.json`, accountsJSON)
  }

  const resultAccounts = reintAccounts ? updatedAccounts : accounts

  /* 4. Check if each wallet has at least 500 XRP (200 Reserve amount + 300 padding), if not add each one to a list of wallets to fund */
  const promises = []
  const walletsToFund: Wallet[] = []
  // console.log('checking wallet balances...')
  for (const testGroup of testGroups) {
    for (const wallet of resultAccounts[testGroup]) {
      promises.push(
        getBalance(client, wallet.classicAddress)
          .then((balance) => {
            // console.log(`\t${testGroup} ${wallet.classicAddress}: ${balance}`)
            if (balance <= MINIMUM_BALANCE) {
              // 500 XRP
              walletsToFund.push(wallet)
            }
          })
          .catch((err: any) => {
            if (err.data.error === 'actNotFound') {
              // console.log(
              //   `\t${testGroup} ${wallet.classicAddress}: 0 (not found)`
              // )
              walletsToFund.push(wallet)
            } else {
              throw err
            }
          })
      )
    }
  }

  await Promise.all(promises)

  /* 5. Fund a wallet for each one in the list synchronously waiting 10 second between each fund */
  for (const wallet of walletsToFund) {
    console.log(`refunding wallet ${wallet.classicAddress}...`)
    try {
      await fundWallet(wallet)
    } catch (err: any) {
      if (err?.message.includes('fundWallet error: you must wait ')) {
        const seconds = parseInt(
          err.message.split('fundWallet error: you must wait ')[1]
        )
        await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
        await fundWallet(wallet)
      } else {
        throw err
      }
    }
  }

  await disconnectClient()
}
