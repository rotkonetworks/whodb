/**
 * Full Registration Flow Test
 *
 * Tests the complete identity registration flow against the real registrar backend:
 * 1. Set identity on Paseo People chain
 * 2. Request judgement from registrar #1
 * 3. Connect to verification WebSocket
 * 4. Complete field verifications
 *
 * Run with: bunx playwright test e2e/full-registration.spec.ts --project=chromium
 */

import { test, expect } from '@playwright/test'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { ApiPromise, WsProvider } from '@polkadot/api'
import WebSocket from 'ws'

// Configuration
const PASEO_PEOPLE_ENDPOINT = 'wss://people-paseo.dotters.network'
const CHALLENGES_API_URL = 'wss://sapi.w3reg.org'
const REGISTRAR_INDEX = 1 // Paseo registrar
const REGISTRAR_FEE = BigInt(0) // Free on Paseo

// Use Bob for testing (has funds)
const TEST_SEED = '//Bob'

// Test identity data
const TEST_IDENTITY = {
  display: `WhoDB_Test_${Date.now()}`,
  email: 'test@example.com',
  twitter: 'whodb_test',
  // Don't set web/matrix/discord to keep it simple
}

let api: ApiPromise
let keyring: Keyring
let testAccount: any
let testAddress: string

test.describe.serial('Full Registration Flow', () => {
  test.beforeAll(async () => {
    console.log('🔧 Initializing test environment...')

    await cryptoWaitReady()
    keyring = new Keyring({ type: 'sr25519', ss58Format: 0 })
    testAccount = keyring.addFromUri(TEST_SEED)
    testAddress = testAccount.address

    console.log(`📍 Test account: ${testAddress}`)

    // Connect to Paseo People chain
    console.log('🔗 Connecting to Paseo People chain...')
    const provider = new WsProvider(PASEO_PEOPLE_ENDPOINT)
    api = await ApiPromise.create({ provider })
    await api.isReady

    console.log('✅ Connected to Paseo People chain')
  })

  test.afterAll(async () => {
    if (api) {
      await api.disconnect()
    }
  })

  test('1. Check account balance', async () => {
    const { data } = await api.query.system.account(testAddress) as any
    const balance = BigInt(data.free.toString())

    console.log(`💰 Balance: ${Number(balance) / 1e10} PAS`)

    // Need at least 0.5 PAS for identity deposit + fees
    expect(balance).toBeGreaterThan(BigInt(5_000_000_000))
  })

  test('2. Clear existing identity (if any)', async () => {
    // Check if identity exists
    const existingIdentity = await api.query.identity.identityOf(testAddress)

    if (existingIdentity.isSome) {
      console.log('🧹 Clearing existing identity...')

      const result = await new Promise<{ success: boolean }>((resolve, reject) => {
        api.tx.identity.clearIdentity()
          .signAndSend(testAccount, { era: 0 }, (result) => {
            if (result.status.isInBlock) {
              resolve({ success: !result.dispatchError })
            }
          })
          .catch(reject)
      })

      expect(result.success).toBe(true)
      console.log('✅ Identity cleared')

      // Wait a bit for chain state to update
      await new Promise(r => setTimeout(r, 6000))
    } else {
      console.log('ℹ️ No existing identity to clear')
    }
  })

  test('3. Set new identity', async () => {
    console.log(`📝 Setting identity: ${TEST_IDENTITY.display}`)

    const info = {
      display: { Raw: TEST_IDENTITY.display },
      legal: { None: null },
      web: { None: null },
      riot: { None: null },
      email: { Raw: TEST_IDENTITY.email },
      pgpFingerprint: null,
      image: { None: null },
      twitter: { Raw: TEST_IDENTITY.twitter },
    }

    const tx = api.tx.identity.setIdentity(info)

    const result = await new Promise<{ success: boolean; hash: string }>((resolve, reject) => {
      tx.signAndSend(testAccount, { era: 0 }, (result) => {
        console.log(`  Status: ${result.status.type}`)

        if (result.status.isInBlock) {
          if (result.dispatchError) {
            console.error('❌ setIdentity failed:', result.dispatchError.toString())
          }
          resolve({
            success: !result.dispatchError,
            hash: result.txHash.toHex(),
          })
        }
      }).catch(reject)
    })

    expect(result.success).toBe(true)
    console.log(`✅ Identity set! Tx: ${result.hash}`)

    // Wait for chain state to update
    await new Promise(r => setTimeout(r, 6000))
  })

  test('4. Verify identity was set correctly', async () => {
    const identity = await api.query.identity.identityOf(testAddress)

    expect(identity.isSome).toBe(true)

    // The structure can be either [registration, deposits] or just registration
    const unwrapped = identity.unwrap()
    const registration = Array.isArray(unwrapped) ? unwrapped[0] : unwrapped
    const info = (registration.info || registration).toHuman() as any

    console.log('📋 Identity on chain:', info)

    // Check the display name (might be nested under Raw or directly)
    const display = info.display?.Raw || info.display
    const email = info.email?.Raw || info.email
    const twitter = info.twitter?.Raw || info.twitter

    expect(display).toBe(TEST_IDENTITY.display)
    expect(email).toBe(TEST_IDENTITY.email)
    expect(twitter).toBe(TEST_IDENTITY.twitter)
  })

  test('5. Request judgement from registrar', async () => {
    console.log(`🔍 Requesting judgement from registrar #${REGISTRAR_INDEX}...`)

    // First check if there's already a pending request
    const identity = await api.query.identity.identityOf(testAddress)
    const unwrapped = identity.unwrap()
    const registration = Array.isArray(unwrapped) ? unwrapped[0] : unwrapped
    const judgements = registration.judgements.toHuman() as any[]

    const hasPendingRequest = judgements.some(
      ([regIdx, status]: [string, any]) =>
        Number(regIdx) === REGISTRAR_INDEX &&
        (status === 'FeePaid' || status.hasOwnProperty('FeePaid'))
    )

    if (hasPendingRequest) {
      console.log('ℹ️ Judgement already requested')
      return
    }

    const tx = api.tx.identity.requestJudgement(REGISTRAR_INDEX, REGISTRAR_FEE)

    const result = await new Promise<{ success: boolean; hash: string }>((resolve, reject) => {
      tx.signAndSend(testAccount, { era: 0 }, (result) => {
        console.log(`  Status: ${result.status.type}`)

        if (result.status.isInBlock) {
          if (result.dispatchError) {
            const decoded = api.registry.findMetaError(result.dispatchError.asModule)
            console.error('❌ requestJudgement failed:', `${decoded.section}.${decoded.name}`)
          }
          resolve({
            success: !result.dispatchError,
            hash: result.txHash.toHex(),
          })
        }
      }).catch(reject)
    })

    expect(result.success).toBe(true)
    console.log(`✅ Judgement requested! Tx: ${result.hash}`)
  })

  test('6. Verify judgement request is pending', async () => {
    // Wait for chain state
    await new Promise(r => setTimeout(r, 6000))

    const identity = await api.query.identity.identityOf(testAddress)
    expect(identity.isSome).toBe(true)

    const unwrapped = identity.unwrap()
    const registration = Array.isArray(unwrapped) ? unwrapped[0] : unwrapped
    const judgements = registration.judgements.toHuman() as any[]
    console.log('📋 Judgements:', judgements)

    // Should have a pending judgement for registrar #1
    const hasRequest = judgements.some(
      ([regIdx]: [string, any]) => Number(regIdx) === REGISTRAR_INDEX
    )

    expect(hasRequest).toBe(true)
    console.log('✅ Judgement request confirmed on chain')
  })

  test('7. Connect to verification WebSocket and get challenges', async () => {
    console.log(`🔌 Connecting to verification backend: ${CHALLENGES_API_URL}`)

    const result = await new Promise<{ connected: boolean; challenges: any }>((resolve) => {
      const ws = new WebSocket(CHALLENGES_API_URL)
      let challengeData: any = null

      const timeout = setTimeout(() => {
        ws.close()
        resolve({ connected: false, challenges: null })
      }, 15000)

      ws.on('open', () => {
        console.log('✅ WebSocket connected')

        // Send subscription message with correct format (version 1.1)
        const subscribeMsg = {
          type: 'SubscribeAccountState',
          payload: {
            account: testAddress,
            network: 'paseo', // Just 'paseo', not 'paseo_people'
          },
          version: '1.1',
        }
        ws.send(JSON.stringify(subscribeMsg))
        console.log('📤 Sent subscription:', JSON.stringify(subscribeMsg, null, 2))
      })

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString())
        console.log('📥 Received:', JSON.stringify(msg, null, 2))

        if (msg.type === 'JsonResult' && msg.payload?.type === 'ok') {
          const accountState = msg.payload.message?.AccountState
          if (accountState) {
            console.log('✅ Got AccountState!')
            console.log('  - Account:', accountState.account)
            console.log('  - Network:', accountState.network)
            console.log('  - Hashed Info:', accountState.hashed_info)
            console.log('  - Pending Challenges:', accountState.pending_challenges?.length || 0)
            console.log('  - Verification State:', accountState.verification_state)
            challengeData = accountState
          }
        }

        // Wait a bit for all messages then close
        setTimeout(() => {
          clearTimeout(timeout)
          ws.close()
          resolve({ connected: true, challenges: challengeData })
        }, 3000)
      })

      ws.on('error', (err) => {
        console.error('❌ WebSocket error:', err.message)
        clearTimeout(timeout)
        resolve({ connected: false, challenges: null })
      })
    })

    expect(result.connected).toBe(true)
    expect(result.challenges).toBeTruthy()
    console.log('✅ Successfully received challenge data from backend')
  })

  test('8. Query registrar info', async () => {
    const registrars = await api.query.identity.registrars()
    const registrarArray = registrars.toHuman() as any[]

    console.log(`📋 Registrar #${REGISTRAR_INDEX}:`, registrarArray[REGISTRAR_INDEX])

    expect(registrarArray[REGISTRAR_INDEX]).toBeTruthy()

    const registrar = registrarArray[REGISTRAR_INDEX]
    console.log(`  Account: ${registrar.account}`)
    console.log(`  Fee: ${registrar.fee}`)
    console.log(`  Fields: ${registrar.fields}`)
  })
})

test.describe('Batch Transaction Test', () => {
  test.beforeAll(async () => {
    await cryptoWaitReady()
    keyring = new Keyring({ type: 'sr25519', ss58Format: 0 })
    testAccount = keyring.addFromUri(TEST_SEED)
    testAddress = testAccount.address

    const provider = new WsProvider(PASEO_PEOPLE_ENDPOINT)
    api = await ApiPromise.create({ provider })
    await api.isReady
  })

  test.afterAll(async () => {
    if (api) {
      await api.disconnect()
    }
  })

  test('should build and estimate batch transaction (setIdentity + requestJudgement)', async () => {
    const uniqueName = `BatchTest_${Date.now()}`

    const info = {
      display: { Raw: uniqueName },
      legal: { None: null },
      web: { None: null },
      riot: { None: null },
      email: { Raw: 'batch@test.com' },
      pgpFingerprint: null,
      image: { None: null },
      twitter: { None: null },
    }

    const setIdentityTx = api.tx.identity.setIdentity(info)
    const requestJudgementTx = api.tx.identity.requestJudgement(REGISTRAR_INDEX, REGISTRAR_FEE)

    // Create batch
    const batchTx = api.tx.utility.batchAll([setIdentityTx, requestJudgementTx])

    // Estimate fees
    const paymentInfo = await batchTx.paymentInfo(testAddress)
    const fee = Number(paymentInfo.partialFee) / 1e10

    console.log(`📊 Batch transaction fee: ${fee.toFixed(6)} PAS`)

    expect(fee).toBeGreaterThan(0)
    expect(fee).toBeLessThan(0.1) // Should be less than 0.1 PAS

    // Verify the batch contains our transactions
    const batchHuman = batchTx.method.toHuman() as any
    expect(batchHuman.args.calls).toHaveLength(2)
    console.log('✅ Batch transaction built successfully')
  })
})
