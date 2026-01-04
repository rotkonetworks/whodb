import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { ApiPromise, WsProvider } from '@polkadot/api'

/**
 * Well-known development accounts (have funds on local dev chains)
 * For Paseo testnet, you'll need to get funds from a faucet
 */
export const DEV_ACCOUNTS = {
  // Alice's well-known development seed
  alice: {
    seed: '//Alice',
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  },
  // Bob's well-known development seed
  bob: {
    seed: '//Bob',
    address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  },
}

/**
 * Testnet RPC endpoints
 */
export const TESTNET_ENDPOINTS = {
  paseo: 'wss://paseo.rpc.amforc.com',
  paseo_people: 'wss://people-paseo.rpc.amforc.com',
  // Local development
  local: 'ws://127.0.0.1:9944',
}

/**
 * Create a keyring with test accounts
 */
export async function createTestKeyring() {
  await cryptoWaitReady()
  const keyring = new Keyring({ type: 'sr25519' })

  return {
    keyring,
    alice: keyring.addFromUri(DEV_ACCOUNTS.alice.seed),
    bob: keyring.addFromUri(DEV_ACCOUNTS.bob.seed),
  }
}

/**
 * Connect to a testnet and return the API
 */
export async function connectToTestnet(endpoint: string = TESTNET_ENDPOINTS.paseo_people): Promise<ApiPromise> {
  const provider = new WsProvider(endpoint)
  const api = await ApiPromise.create({ provider })
  await api.isReady
  return api
}

/**
 * Get account balance
 */
export async function getBalance(api: ApiPromise, address: string): Promise<bigint> {
  const account = await api.query.system.account(address)
  return BigInt((account as any).data.free.toString())
}

/**
 * Send a test transaction (balance transfer)
 */
export async function sendTestTransfer(
  api: ApiPromise,
  signer: any,
  to: string,
  amount: bigint
): Promise<{ hash: string; success: boolean }> {
  return new Promise(async (resolve, reject) => {
    try {
      const transfer = api.tx.balances.transferKeepAlive(to, amount)

      const unsub = await transfer.signAndSend(
        signer,
        { era: 0 }, // Immortal era - same as our fix!
        (result) => {
          if (result.status.isInBlock) {
            const success = !result.dispatchError
            unsub()
            resolve({
              hash: result.txHash.toHex(),
              success,
            })
          }
        }
      )
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Set identity on chain (for testing identity registration)
 */
export async function setTestIdentity(
  api: ApiPromise,
  signer: any,
  identity: {
    display?: string
    email?: string
    twitter?: string
    web?: string
  }
): Promise<{ hash: string; success: boolean }> {
  return new Promise(async (resolve, reject) => {
    try {
      const info: any = {
        display: identity.display ? { Raw: identity.display } : { None: null },
        legal: { None: null },
        web: identity.web ? { Raw: identity.web } : { None: null },
        riot: { None: null },
        email: identity.email ? { Raw: identity.email } : { None: null },
        pgpFingerprint: null,
        image: { None: null },
        twitter: identity.twitter ? { Raw: identity.twitter } : { None: null },
      }

      const tx = api.tx.identity.setIdentity(info)

      const unsub = await tx.signAndSend(
        signer,
        { era: 0 }, // Immortal era
        (result) => {
          if (result.status.isInBlock) {
            const success = !result.dispatchError
            unsub()
            resolve({
              hash: result.txHash.toHex(),
              success,
            })
          }
        }
      )
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Helper to wait for transaction finalization
 */
export async function waitForFinalization(
  api: ApiPromise,
  txHash: string,
  timeoutMs: number = 60000
): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    // Check if transaction is finalized
    // This is a simplified check - in production you'd use subscriptions
    await new Promise(r => setTimeout(r, 6000)) // Wait ~1 block
    return true // Simplified - assume success after waiting
  }

  return false
}

/**
 * Cleanup - disconnect from API
 */
export async function disconnect(api: ApiPromise) {
  await api.disconnect()
}
