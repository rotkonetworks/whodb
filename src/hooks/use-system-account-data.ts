import { ApiPromise } from "@polkadot/api";
import { SS58String } from "polkadot-api";
import { useEffect, useState } from "react";

/**
 * Custom React hook that fetches and manages system account data for a given address.
 * 
 * This hook subscribes to account information from the Substrate chain and automatically
 * updates when the account data changes. It calculates the available balance by subtracting
 * frozen and reserved amounts from the free balance.
 * 
 * @param address - The SS58 formatted address to query account data for
 * @param typedApi - The Polkadot API instance used to query the chain
 * 
 * @returns An object containing:
 *   - `nonce`: The current account nonce as a number, or null if not yet loaded
 *   - `balance`: The available balance as a BigNumber (free - frozen - reserved), or null if not yet loaded
 * 
 * @example
 * ```typescript
 * const { nonce, balance } = useSystemAccountData(userAddress, api);
 * 
 * if (balance && nonce !== null) {
 *   console.log(`Available balance: ${balance.toString()}, Nonce: ${nonce}`);
 * }
 * ```
 */
export const useSystemAccountData = (address?: SS58String, typedApi?: ApiPromise) => {
  const [nonce, setNonce] = useState<number | null>(null);
  const [balance, setBalance] = useState<BigNumber | null>(null);

  useEffect(() => {
    if (typedApi && address) {
      typedApi.query.system.account(address, (result) => {
        const availableBalance = BigNumber(result.data.free)
          .minus(BigNumber(result.data.frozen))
          .minus(BigNumber(result.data.reserved))
        ;
        setBalance(availableBalance);
        const nonce = result.nonce.toNumber();
        setNonce(nonce);
        console.debug("AccountData for ", address, " balance:", availableBalance.toString(), " nonce:", nonce);
      });
    }
  }, [typedApi, address]);

  return { nonce, balance, };
};
