import { proxy } from "valtio"
import { SS58String } from "polkadot-api"

export interface ActingAsState {
  // The account we're acting as (could be our own, a proxied account, or a multisig)
  targetAddress: SS58String | null
  // Whether we're using a proxy
  isProxy: boolean
  // Whether we're using a multisig
  isMultisig: boolean
  // The proxy type if using proxy
  proxyType?: string
  // Multisig threshold and signatories if using multisig
  multisigThreshold?: number
  multisigSignatories?: SS58String[]
}

export const actingAsStore = proxy<ActingAsState>({
  targetAddress: null,
  isProxy: false,
  isMultisig: false,
})

// Actions
export const setActingAs = (
  address: SS58String | null,
  isProxy: boolean = false,
  isMultisig: boolean = false,
  options?: {
    proxyType?: string
    multisigThreshold?: number
    multisigSignatories?: SS58String[]
  }
) => {
  actingAsStore.targetAddress = address
  actingAsStore.isProxy = isProxy
  actingAsStore.isMultisig = isMultisig
  actingAsStore.proxyType = options?.proxyType
  actingAsStore.multisigThreshold = options?.multisigThreshold
  actingAsStore.multisigSignatories = options?.multisigSignatories
}

export const clearActingAs = () => {
  actingAsStore.targetAddress = null
  actingAsStore.isProxy = false
  actingAsStore.isMultisig = false
  actingAsStore.proxyType = undefined
  actingAsStore.multisigThreshold = undefined
  actingAsStore.multisigSignatories = undefined
}

/**
 * Get the effective address for transactions
 * Returns the target address if acting as someone else, otherwise null
 */
export const getEffectiveAddress = (
  connectedAddress: SS58String | null
): SS58String | null => {
  if (actingAsStore.targetAddress && actingAsStore.targetAddress !== connectedAddress) {
    return actingAsStore.targetAddress
  }
  return connectedAddress
}

/**
 * Check if we need to wrap a call in proxy.proxy()
 */
export const needsProxyWrapper = (): boolean => {
  return actingAsStore.isProxy && actingAsStore.targetAddress !== null
}

/**
 * Check if we need to use multisig.asMulti()
 */
export const needsMultisigWrapper = (): boolean => {
  return actingAsStore.isMultisig && actingAsStore.targetAddress !== null
}
