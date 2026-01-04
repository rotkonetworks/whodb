/**
 * Script to check test wallet balance on Paseo
 * Run with: bunx tsx e2e/check-balance.ts
 */

import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { ApiPromise, WsProvider } from '@polkadot/api'

const ENDPOINTS = {
  paseo: 'wss://paseo.rpc.amforc.com',
  paseo_people: 'wss://people-paseo.rpc.amforc.com',
}

// Well-known dev accounts
const DEV_SEEDS = {
  alice: '//Alice',
  bob: '//Bob',
  charlie: '//Charlie',
}

async function main() {
  console.log('Initializing crypto...')
  await cryptoWaitReady()

  const keyring = new Keyring({ type: 'sr25519', ss58Format: 0 })

  // Create accounts from seeds
  const accounts = Object.entries(DEV_SEEDS).map(([name, seed]) => ({
    name,
    account: keyring.addFromUri(seed),
  }))

  console.log('\n📍 Dev Account Addresses:')
  for (const { name, account } of accounts) {
    console.log(`  ${name.padEnd(10)}: ${account.address}`)
  }

  // Check balances on Paseo People chain
  console.log('\n🔗 Connecting to Paseo People chain...')
  const provider = new WsProvider(ENDPOINTS.paseo_people)
  const api = await ApiPromise.create({ provider })
  await api.isReady

  const chainInfo = await api.rpc.system.chain()
  console.log(`   Connected to: ${chainInfo}`)

  console.log('\n💰 Balances on Paseo People chain:')
  for (const { name, account } of accounts) {
    const { data } = await api.query.system.account(account.address) as any
    const free = BigInt(data.free.toString())
    const reserved = BigInt(data.reserved.toString())

    const freeFormatted = (Number(free) / 1e10).toFixed(4)
    const reservedFormatted = (Number(reserved) / 1e10).toFixed(4)

    const status = free > 0n ? '✅' : '❌'
    console.log(`  ${status} ${name.padEnd(10)}: ${freeFormatted} PAS (free) + ${reservedFormatted} PAS (reserved)`)
  }

  // Also check relay chain
  console.log('\n🔗 Connecting to Paseo Relay chain...')
  const relayProvider = new WsProvider(ENDPOINTS.paseo)
  const relayApi = await ApiPromise.create({ provider: relayProvider })
  await relayApi.isReady

  console.log('\n💰 Balances on Paseo Relay chain:')
  for (const { name, account } of accounts) {
    const { data } = await relayApi.query.system.account(account.address) as any
    const free = BigInt(data.free.toString())

    const freeFormatted = (Number(free) / 1e10).toFixed(4)

    const status = free > 0n ? '✅' : '❌'
    console.log(`  ${status} ${name.padEnd(10)}: ${freeFormatted} PAS`)
  }

  console.log('\n📝 To fund accounts, use the Paseo faucet:')
  console.log('   https://faucet.polkadot.io/ (select Paseo)')

  await api.disconnect()
  await relayApi.disconnect()

  console.log('\n✅ Done!')
}

main().catch(console.error)
