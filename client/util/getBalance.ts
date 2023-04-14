import { AccountInfoRequest, AccountInfoResponse, Client } from 'xrpl'

async function accountInfo(
  client: Client,
  address: string
): Promise<AccountInfoResponse> {
  const request: AccountInfoRequest = {
    command: 'account_info',
    account: address,
  }
  const response = await client.request(request)
  return response
}

export async function getBalance(
  client: Client,
  address: string
): Promise<bigint> {
  const response = await accountInfo(client, address)
  return BigInt(response.result.account_data.Balance)
}
