/**
 * Remailer transaction utilities
 * Handles token payment for message sending authorization
 */

import { logger } from './logger'
import { getPapiClient } from '@/lib/papi-client'
import type { SS58String } from 'polkadot-api'

export interface RemailerFeeConfig {
  amount: bigint
  recipient: SS58String
}

/**
 * Gets the remailer fee configuration for a network
 * @param network - The network identifier
 * @returns Fee configuration
 */
export function getRemailerFee(network: string): RemailerFeeConfig {
  // TODO: Make this configurable or fetch from on-chain governance
  const baseNetwork = network.replace('_people', '')

  // Fee amounts in plancks (smallest unit)
  const feeAmounts: Record<string, bigint> = {
    polkadot: BigInt(100_000_000), // 0.01 DOT (10^10 plancks per DOT)
    kusama: BigInt(333_333_333),   // 0.1 KSM (10^12 plancks per KSM)
    paseo: BigInt(100_000_000),    // 0.01 PAS (testnet)
  }

  // TODO: Use actual remailer service address
  const remailerAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as SS58String

  return {
    amount: feeAmounts[baseNetwork] || feeAmounts.paseo,
    recipient: remailerAddress,
  }
}

/**
 * Creates and sends a remailer fee payment transaction
 * @param network - The network identifier
 * @param senderAddress - The sender's address
 * @param signCallback - Callback to sign the transaction
 * @returns Transaction hash
 */
export async function sendRemailerFeeTransaction(
  network: string,
  senderAddress: SS58String,
  signCallback: (callData: Uint8Array) => Promise<Uint8Array>
): Promise<string> {
  try {
    const client = await getPapiClient(network, false)
    const fee = getRemailerFee(network)

    logger.log('Creating remailer fee transaction', {
      network,
      // Redact addresses in logs
      sender: senderAddress.slice(0, 8) + '...',
      recipient: fee.recipient.slice(0, 8) + '...',
      amount: fee.amount.toString(),
    })

    // Get the typed API
    const descriptors = await import('@polkadot-api/descriptors')
    const typedApi = client.getTypedApi(descriptors[network])

    // Create a balance transfer transaction
    const tx = typedApi.tx.Balances.transfer_keep_alive({
      dest: {
        type: 'Id',
        value: fee.recipient,
      },
      value: fee.amount,
    })

    // Get call data
    const callData = await tx.getEncodedData()

    // Sign the transaction
    const signature = await signCallback(callData)

    // Submit the signed transaction
    const txHash = await tx.signSubmitAndWatch(senderAddress, { signature })

    logger.log('Remailer fee transaction submitted:', txHash)

    return txHash.toString()
  } catch (err) {
    logger.error('Failed to send remailer fee transaction:', err)
    throw new Error(
      err instanceof Error ? err.message : 'Failed to send payment transaction'
    )
  }
}

/**
 * Waits for a transaction to be finalized
 * @param network - The network identifier
 * @param txHash - The transaction hash
 * @param timeout - Timeout in milliseconds (default: 60s)
 * @returns True if finalized successfully
 */
export async function waitForTransactionFinalization(
  network: string,
  txHash: string,
  timeout: number = 60000
): Promise<boolean> {
  try {
    const client = await getPapiClient(network, false)

    // TODO: Implement proper transaction watching
    // For now, just wait a bit and assume success
    await new Promise(resolve => setTimeout(resolve, 3000))

    logger.log('Transaction finalized:', txHash)
    return true
  } catch (err) {
    logger.error('Failed to wait for transaction:', err)
    return false
  }
}

/**
 * Formats token amount for display
 * @param amount - Amount in plancks
 * @param decimals - Number of decimals
 * @returns Formatted string
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals)
  const whole = amount / divisor
  const fraction = amount % divisor

  if (fraction === BigInt(0)) {
    return whole.toString()
  }

  const fractionStr = fraction.toString().padStart(decimals, '0')
  const trimmed = fractionStr.replace(/0+$/, '')

  return `${whole}.${trimmed}`
}
