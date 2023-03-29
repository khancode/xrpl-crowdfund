import axios from 'axios'
import { Wallet } from 'xrpl'

const URL = `https://hooks-testnet-v3.xrpl-labs.com/accounts`

/**
 * This function will fund a new wallet on the Hooks Testnet v3.
 *
 * IMPORTANT: Must wait 10 seconds before funding a new wallet again on Hooks Testnet v3.
 *
 * @returns {Wallet}
 */
export async function fundWallet(): Promise<Wallet> {
  // Fund new Hook Testnet account
  const res = await axios.post(URL)
  if (res.data.error) {
    // NOTE: error is probably due to not waiting 10 seconds before requesting a new wallet again
    throw new Error(`fundWallet error: ${res.data.error}`)
  }
  return Wallet.fromSecret(res.data.account.secret)
}
