import { SS58String } from "polkadot-api"
import { actingAsStore } from "@/store/ActingAsStore"

/**
 * Proxy types that can be used for identity operations
 */
export const IDENTITY_PROXY_TYPES = ["Any", "NonTransfer", "IdentityJudgement"]

/**
 * Wrap a call with proxy.proxy() if acting as a proxied account
 *
 * @param api - The polkadot-api instance
 * @param innerCall - The call to wrap (e.g., identity.setIdentity)
 * @param realAddress - The address being proxied (optional, uses actingAsStore if not provided)
 * @returns The wrapped call or the original call if not using proxy
 */
export function wrapWithProxy(
  api: any,
  innerCall: any,
  realAddress?: SS58String
): any {
  const { isProxy, targetAddress, proxyType } = actingAsStore

  if (!isProxy || !targetAddress) {
    return innerCall
  }

  const target = realAddress || targetAddress

  // Wrap with proxy.proxy call
  // proxy.proxy(real, forceProxyType, call)
  return api.tx.proxy.proxy(
    target,
    proxyType || null, // null = Any type
    innerCall
  )
}

/**
 * Wrap a call with multisig.asMulti() if acting as a multisig account
 *
 * @param api - The polkadot-api instance
 * @param innerCall - The call to wrap
 * @param otherSignatories - Array of other signatory addresses (excluding the caller)
 * @param threshold - The multisig threshold
 * @param maybeTimepoint - The timepoint if this is an approval of an existing call
 * @param maxWeight - Maximum weight for the call
 * @returns The wrapped multisig call
 */
export function wrapWithMultisig(
  api: any,
  innerCall: any,
  otherSignatories: SS58String[],
  threshold: number,
  maybeTimepoint?: { height: number; index: number } | null,
  maxWeight?: { refTime: bigint; proofSize: bigint }
): any {
  const { isMultisig, targetAddress } = actingAsStore

  if (!isMultisig || !targetAddress) {
    return innerCall
  }

  // Sort other signatories alphabetically (required by the runtime)
  const sortedOtherSignatories = [...otherSignatories].sort()

  // Default max weight if not provided
  const weight = maxWeight || {
    refTime: BigInt(1_000_000_000), // 1 second
    proofSize: BigInt(1_000_000),
  }

  // If this is the first approval, use null timepoint
  // If this is an approval of an existing call, provide the timepoint
  return api.tx.multisig.asMulti(
    threshold,
    sortedOtherSignatories,
    maybeTimepoint || null,
    innerCall,
    weight
  )
}

/**
 * Approve an existing multisig call (without providing full call data)
 */
export function approveMultisigCall(
  api: any,
  otherSignatories: SS58String[],
  threshold: number,
  timepoint: { height: number; index: number },
  callHash: string,
  maxWeight?: { refTime: bigint; proofSize: bigint }
): any {
  const sortedOtherSignatories = [...otherSignatories].sort()

  const weight = maxWeight || {
    refTime: BigInt(1_000_000_000),
    proofSize: BigInt(1_000_000),
  }

  return api.tx.multisig.approveAsMulti(
    threshold,
    sortedOtherSignatories,
    timepoint,
    callHash,
    weight
  )
}

/**
 * Cancel a multisig call
 */
export function cancelMultisigCall(
  api: any,
  otherSignatories: SS58String[],
  threshold: number,
  timepoint: { height: number; index: number },
  callHash: string
): any {
  const sortedOtherSignatories = [...otherSignatories].sort()

  return api.tx.multisig.cancelAsMulti(
    threshold,
    sortedOtherSignatories,
    timepoint,
    callHash
  )
}

/**
 * Determine how to wrap a call based on current acting-as state
 */
export function wrapCall(
  api: any,
  innerCall: any,
  options?: {
    otherSignatories?: SS58String[]
    maybeTimepoint?: { height: number; index: number } | null
    maxWeight?: { refTime: bigint; proofSize: bigint }
  }
): any {
  const { isProxy, isMultisig, multisigThreshold, multisigSignatories } = actingAsStore

  if (isProxy) {
    return wrapWithProxy(api, innerCall)
  }

  if (isMultisig && multisigSignatories && multisigThreshold) {
    // Filter out caller from signatories
    const otherSignatories = options?.otherSignatories || multisigSignatories
    return wrapWithMultisig(
      api,
      innerCall,
      otherSignatories,
      multisigThreshold,
      options?.maybeTimepoint,
      options?.maxWeight
    )
  }

  return innerCall
}

/**
 * Get information about what type of transaction will be created
 */
export function getTransactionType(): {
  type: "direct" | "proxy" | "multisig"
  description: string
} {
  const { isProxy, isMultisig, proxyType, multisigThreshold, multisigSignatories } = actingAsStore

  if (isProxy) {
    return {
      type: "proxy",
      description: `Proxy call (${proxyType || "Any"})`,
    }
  }

  if (isMultisig && multisigThreshold) {
    const sigCount = multisigSignatories?.length || 0
    return {
      type: "multisig",
      description: `Multisig (${multisigThreshold}/${sigCount} signatures required)`,
    }
  }

  return {
    type: "direct",
    description: "Direct transaction",
  }
}
