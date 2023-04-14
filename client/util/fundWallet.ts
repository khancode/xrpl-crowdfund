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
export async function fundWallet(wallet?: Wallet): Promise<Wallet> {
  const fullURL = wallet ? `${URL}?account=${wallet.classicAddress}` : URL

  // Fund new Hook Testnet account
  const res = await axios.post(fullURL)
  if (res.data.error) {
    // NOTE: error is probably due to not waiting 10 seconds before requesting a new wallet again
    throw new Error(`fundWallet error: ${res.data.error}`)
  }

  if (wallet) {
    return wallet
  }
  return Wallet.fromSecret(res.data.account.secret)
}
