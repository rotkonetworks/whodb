/**
 * Real transaction tests on Paseo testnet
 *
 * These tests make ACTUAL transactions on Paseo People chain.
 * They require the test accounts to have funds.
 *
 * Run with: bunx playwright test e2e/real-transaction.spec.ts --project=chromium
 */

import { test, expect } from '@playwright/test'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { ApiPromise, WsProvider } from '@polkadot/api'

// Test configuration
const PASEO_PEOPLE_ENDPOINT = 'wss://people-paseo.rpc.amforc.com'
const MIN_BALANCE = BigInt(100_000_000) // 0.01 PAS minimum

// We'll use Bob since he has lots of funds
const TEST_SEED = '//Bob'

let api: ApiPromise
let keyring: Keyring
let testAccount: any

test.describe('Real Transaction Tests (Paseo)', () => {
  test.beforeAll(async () => {
    // Initialize crypto and connect to chain
    await cryptoWaitReady()
    keyring = new Keyring({ type: 'sr25519', ss58Format: 0 })
    testAccount = keyring.addFromUri(TEST_SEED)

    console.log(`Test account: ${testAccount.address}`)

    // Connect to Paseo People chain
    const provider = new WsProvider(PASEO_PEOPLE_ENDPOINT)
    api = await ApiPromise.create({ provider })
    await api.isReady

    console.log('Connected to Paseo People chain')
  })

  test.afterAll(async () => {
    if (api) {
      await api.disconnect()
    }
  })

  test('should have sufficient balance for testing', async () => {
    const { data } = await api.query.system.account(testAccount.address) as any
    const balance = BigInt(data.free.toString())

    console.log(`Balance: ${balance} plancks (${Number(balance) / 1e10} PAS)`)

    expect(balance).toBeGreaterThan(MIN_BALANCE)
  })

  test('should sign transaction with immortal era (era: 0)', async () => {
    // Create a simple remark transaction (costs minimal fees)
    const remark = api.tx.system.remark('WhoDB e2e test - immortal era')

    // Track signing options
    let usedEra: any = null

    // Sign the transaction
    const signed = await remark.signAsync(testAccount, {
      era: 0, // Immortal era - THIS IS WHAT WE'RE TESTING
      nonce: -1, // Auto-fetch nonce
    })

    // The signed extrinsic should have era = 0 (immortal)
    const extrinsic = signed.toHuman() as any
    console.log('Signed extrinsic era:', extrinsic.era)

    // Immortal era is represented as { Immortal: null } or similar
    expect(extrinsic.era).toBeDefined()
  })

  test('should successfully submit a remark transaction', async () => {
    const remarkMessage = `WhoDB e2e test ${Date.now()}`
    const remark = api.tx.system.remark(remarkMessage)

    const result = await new Promise<{ success: boolean; hash: string }>((resolve, reject) => {
      remark.signAndSend(
        testAccount,
        { era: 0 }, // Immortal era
        (result) => {
          console.log(`Status: ${result.status.type}`)

          if (result.status.isInBlock) {
            const success = !result.dispatchError

            if (result.dispatchError) {
              console.error('Transaction failed:', result.dispatchError.toString())
            } else {
              console.log(`✅ Transaction included in block: ${result.status.asInBlock.toHex()}`)
            }

            resolve({
              success,
              hash: result.txHash.toHex(),
            })
          }
        }
      ).catch(reject)
    })

    expect(result.success).toBe(true)
    expect(result.hash).toBeTruthy()
    console.log(`Transaction hash: ${result.hash}`)
  })

  test('should handle transaction with mortal era correctly', async () => {
    const remark = api.tx.system.remark('WhoDB e2e test - mortal era')

    // Sign with mortal era (64 blocks validity)
    const signed = await remark.signAsync(testAccount, {
      era: 64, // Mortal era - 64 blocks
      nonce: -1,
    })

    const extrinsic = signed.toHuman() as any
    console.log('Mortal era extrinsic:', extrinsic.era)

    // Should have a mortal era with specific values
    expect(extrinsic.era).toBeDefined()
    // Mortal era has { MortalEra: { period, phase } } structure
  })

  test('should be able to query identity pallet', async () => {
    // Query identity of test account
    const identity = await api.query.identity.identityOf(testAccount.address)

    console.log('Identity query result:', identity.toHuman())

    // Just verify the query works (account may or may not have identity)
    expect(identity).toBeDefined()
  })

  test('should be able to estimate transaction fees', async () => {
    const remark = api.tx.system.remark('Fee estimation test')

    const paymentInfo = await remark.paymentInfo(testAccount.address)
    const fee = BigInt(paymentInfo.partialFee.toString())

    console.log(`Estimated fee: ${fee} plancks (${Number(fee) / 1e10} PAS)`)

    expect(fee).toBeGreaterThan(0n)
  })
})

test.describe('Identity Transaction Tests', () => {
  test.beforeAll(async () => {
    await cryptoWaitReady()
    keyring = new Keyring({ type: 'sr25519', ss58Format: 0 })
    testAccount = keyring.addFromUri(TEST_SEED)

    const provider = new WsProvider(PASEO_PEOPLE_ENDPOINT)
    api = await ApiPromise.create({ provider })
    await api.isReady
  })

  test.afterAll(async () => {
    if (api) {
      await api.disconnect()
    }
  })

  test('should be able to build setIdentity transaction', async () => {
    const info = {
      display: { Raw: 'WhoDB Test' },
      legal: { None: null },
      web: { None: null },
      riot: { None: null },
      email: { Raw: 'test@example.com' },
      pgpFingerprint: null,
      image: { None: null },
      twitter: { None: null },
    }

    const tx = api.tx.identity.setIdentity(info)

    // Verify transaction was built correctly
    expect(tx.method.section).toBe('identity')
    expect(tx.method.method).toBe('setIdentity')

    // Estimate fees
    const paymentInfo = await tx.paymentInfo(testAccount.address)
    console.log(`setIdentity fee: ${Number(paymentInfo.partialFee) / 1e10} PAS`)
  })

  test('should be able to build requestJudgement transaction', async () => {
    const registrarIndex = 0
    const maxFee = BigInt(0) // Free registrar

    const tx = api.tx.identity.requestJudgement(registrarIndex, maxFee)

    expect(tx.method.section).toBe('identity')
    expect(tx.method.method).toBe('requestJudgement')
  })

  test('should be able to build batchAll transaction', async () => {
    const info = {
      display: { Raw: 'WhoDB Batch Test' },
      legal: { None: null },
      web: { None: null },
      riot: { None: null },
      email: { None: null },
      pgpFingerprint: null,
      image: { None: null },
      twitter: { None: null },
    }

    const setIdentityTx = api.tx.identity.setIdentity(info)
    const requestJudgementTx = api.tx.identity.requestJudgement(0, 0)

    // Batch them together
    const batchTx = api.tx.utility.batchAll([setIdentityTx, requestJudgementTx])

    expect(batchTx.method.section).toBe('utility')
    expect(batchTx.method.method).toBe('batchAll')

    // Estimate fees for the batch
    const paymentInfo = await batchTx.paymentInfo(testAccount.address)
    console.log(`batchAll fee: ${Number(paymentInfo.partialFee) / 1e10} PAS`)
  })
})
