import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { ApiPromise, WsProvider } from '@polkadot/api'
import type { Page } from '@playwright/test'

/**
 * Test wallet configuration
 *
 * This is a DEDICATED TEST ACCOUNT - fund it on Paseo testnet for e2e testing
 * Get PAS tokens from: https://faucet.polkadot.io/ (select Paseo)
 *
 * NEVER use this seed for real funds!
 */
export const TEST_WALLET = {
  // Fixed seed for reproducible testing - ONLY FOR TESTNET
  seed: 'bottom drive obey lake curtain smoke basket hold race lonely fit walk//test//whodb',
  name: 'WhoDB Test Account',
}

/**
 * Testnet endpoints
 */
export const ENDPOINTS = {
  paseo: 'wss://paseo.rpc.amforc.com',
  paseo_people: 'wss://people-paseo.rpc.amforc.com',
  paseo_asset_hub: 'wss://asset-hub-paseo.rpc.amforc.com',
}

let _keyring: Keyring | null = null
let _testAccount: any = null
let _testAddress: string | null = null

/**
 * Initialize the test wallet
 * Returns the address that needs to be funded
 */
export async function initTestWallet(): Promise<{
  address: string
  publicKey: string
  name: string
}> {
  await cryptoWaitReady()

  if (!_keyring) {
    _keyring = new Keyring({ type: 'sr25519', ss58Format: 0 })
  }

  if (!_testAccount) {
    _testAccount = _keyring.addFromUri(TEST_WALLET.seed)
    _testAddress = _testAccount.address
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log('TEST WALLET ADDRESS (fund this on Paseo):')
  console.log(`  ${_testAddress}`)
  console.log('═══════════════════════════════════════════════════════════')

  return {
    address: _testAddress!,
    publicKey: Buffer.from(_testAccount.publicKey).toString('hex'),
    name: TEST_WALLET.name,
  }
}

/**
 * Get the test signer for signing transactions
 */
export function getTestSigner() {
  if (!_testAccount) {
    throw new Error('Test wallet not initialized. Call initTestWallet() first.')
  }
  return _testAccount
}

/**
 * Get the test address
 */
export function getTestAddress(): string {
  if (!_testAddress) {
    throw new Error('Test wallet not initialized. Call initTestWallet() first.')
  }
  return _testAddress
}

/**
 * Connect to Paseo People chain
 */
export async function connectToPaseo(): Promise<ApiPromise> {
  const provider = new WsProvider(ENDPOINTS.paseo_people)
  const api = await ApiPromise.create({ provider })
  await api.isReady
  return api
}

/**
 * Get balance of test account
 */
export async function getTestAccountBalance(api: ApiPromise): Promise<{
  free: bigint
  reserved: bigint
  total: bigint
}> {
  const address = getTestAddress()
  const account = await api.query.system.account(address)
  const data = (account as any).data

  return {
    free: BigInt(data.free.toString()),
    reserved: BigInt(data.reserved.toString()),
    total: BigInt(data.free.toString()) + BigInt(data.reserved.toString()),
  }
}

/**
 * Check if test account has enough balance for testing
 */
export async function hasEnoughBalance(api: ApiPromise, minBalance: bigint = BigInt(1_000_000_000_000)): Promise<boolean> {
  const { free } = await getTestAccountBalance(api)
  return free >= minBalance
}

/**
 * Inject test wallet into Playwright page (for e2e tests)
 * This makes the test wallet available as a browser extension mock
 */
export async function injectTestWalletIntoPage(page: Page): Promise<void> {
  const { address, publicKey, name } = await initTestWallet()
  const signer = getTestSigner()

  await page.addInitScript(({ address, publicKey, name }) => {
    // Track transactions for test assertions
    (window as any).__testTransactions = []

    const mockWallet = {
      enable: async () => ({
        accounts: {
          get: async () => [{
            address,
            name,
            type: 'sr25519',
          }],
          subscribe: (cb: Function) => {
            cb([{ address, name, type: 'sr25519' }])
            return () => {}
          },
        },
        signer: {
          signPayload: async (payload: any) => {
            // Record for test assertions
            (window as any).__testTransactions.push({
              type: 'signPayload',
              payload,
              timestamp: Date.now(),
            })

            // In a real implementation, we'd sign here
            // For now, return a mock that the test will intercept
            return {
              id: 1,
              signature: '0x__NEEDS_REAL_SIGNING__',
              __payload: payload,
            }
          },
          signRaw: async (raw: any) => {
            (window as any).__testTransactions.push({
              type: 'signRaw',
              raw,
              timestamp: Date.now(),
            })
            return { id: 1, signature: '0x__NEEDS_REAL_SIGNING__' }
          },
        },
      }),
      version: '0.0.1-test',
    }

    ;(window as any).injectedWeb3 = {
      'polkadot-js': mockWallet,
      'test-wallet': mockWallet,
    }
  }, { address, publicKey, name })
}

/**
 * Sign and submit a transaction using the test wallet
 * This bypasses the browser and signs directly
 */
export async function signAndSubmitTransaction(
  api: ApiPromise,
  tx: any,
  options: { era?: number; nonce?: number } = {}
): Promise<{
  hash: string
  success: boolean
  blockHash?: string
  error?: string
}> {
  const signer = getTestSigner()

  return new Promise(async (resolve, reject) => {
    try {
      const unsub = await tx.signAndSend(
        signer,
        {
          era: options.era ?? 0, // Default to immortal era (our fix!)
          nonce: options.nonce ?? -1, // Auto-fetch nonce
        },
        (result: any) => {
          console.log(`Transaction status: ${result.status.type}`)

          if (result.status.isInBlock) {
            const success = !result.dispatchError

            if (result.dispatchError) {
              let errorMsg = 'Unknown error'
              if (result.dispatchError.isModule) {
                const decoded = api.registry.findMetaError(result.dispatchError.asModule)
                errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`
              }
              console.error('Transaction failed:', errorMsg)
            }

            unsub()
            resolve({
              hash: result.txHash.toHex(),
              success,
              blockHash: result.status.asInBlock.toHex(),
              error: result.dispatchError ? 'Transaction failed' : undefined,
            })
          }

          if (result.status.isFinalized) {
            console.log(`Finalized in block: ${result.status.asFinalized.toHex()}`)
          }
        }
      )
    } catch (error: any) {
      reject({
        hash: '',
        success: false,
        error: error.message,
      })
    }
  })
}

/**
 * Test helper: Set identity using test wallet
 */
export async function setIdentityWithTestWallet(
  api: ApiPromise,
  identity: {
    display?: string
    email?: string
    twitter?: string
  }
): Promise<{ hash: string; success: boolean }> {
  const info: any = {
    display: identity.display ? { Raw: identity.display } : { None: null },
    legal: { None: null },
    web: { None: null },
    riot: { None: null },
    email: identity.email ? { Raw: identity.email } : { None: null },
    pgpFingerprint: null,
    image: { None: null },
    twitter: identity.twitter ? { Raw: identity.twitter } : { None: null },
  }

  const tx = api.tx.identity.setIdentity(info)
  return signAndSubmitTransaction(api, tx)
}

/**
 * Test helper: Clear identity using test wallet
 */
export async function clearIdentityWithTestWallet(
  api: ApiPromise
): Promise<{ hash: string; success: boolean }> {
  const tx = api.tx.identity.clearIdentity()
  return signAndSubmitTransaction(api, tx)
}

/**
 * Test helper: Request judgement using test wallet
 */
export async function requestJudgementWithTestWallet(
  api: ApiPromise,
  registrarIndex: number,
  maxFee: bigint
): Promise<{ hash: string; success: boolean }> {
  const tx = api.tx.identity.requestJudgement(registrarIndex, maxFee)
  return signAndSubmitTransaction(api, tx)
}

/**
 * Cleanup: Disconnect from API
 */
export async function cleanup(api: ApiPromise): Promise<void> {
  await api.disconnect()
}

/**
 * Print test wallet info (for setup)
 */
export async function printTestWalletInfo(): Promise<void> {
  const { address, publicKey } = await initTestWallet()

  console.log('\n')
  console.log('╔═══════════════════════════════════════════════════════════════╗')
  console.log('║           WHODB E2E TEST WALLET                               ║')
  console.log('╠═══════════════════════════════════════════════════════════════╣')
  console.log('║ Address:                                                      ║')
  console.log(`║   ${address}  ║`)
  console.log('║                                                               ║')
  console.log('║ To fund this wallet:                                          ║')
  console.log('║   1. Go to https://faucet.polkadot.io/                        ║')
  console.log('║   2. Select "Paseo" network                                   ║')
  console.log('║   3. Paste the address above                                  ║')
  console.log('║   4. Request tokens                                           ║')
  console.log('║                                                               ║')
  console.log('║ ⚠️  NEVER use this wallet for real funds!                      ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝')
  console.log('\n')
}
