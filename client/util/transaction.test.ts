import { Transaction } from 'xrpl'
import {
  accountReserveFee,
  ownerReserveFee,
  prepareTransactionV3,
} from './transaction'
import { connectClient, disconnectClient } from './xrplClient'

describe('transaction', () => {
  beforeAll(async () => {
    await connectClient()
  })

  afterAll(async () => {
    await disconnectClient()
  })

  it('accountReserveFee should be 200 XRP', async () => {
    const fee = await accountReserveFee()
    expect(fee).toBe(200000000)
  })

  it('ownerReserveFee should be 50 XRP', async () => {
    const fee = await ownerReserveFee()
    expect(fee).toBe(50000000)
  })

  it('prepareTransactionV3', async () => {
    const tx: Transaction = {
      TransactionType: 'Payment',
      Account: 'rsXf1Du7y9Pxd7heVErHfjzrZWXaCrJLKr',
      Destination: 'rN6jkfhnR5RqxpoHtEdwEQ8cqg377SiVv2',
      Amount: '10000000',
    }
    await prepareTransactionV3(tx)
    // @ts-expect-error -- NetworkID is expected for Hooks Testnet V3
    expect(tx.NetworkID).toBe(21338)
    expect(tx.Fee).toBe('52')
  })
})
