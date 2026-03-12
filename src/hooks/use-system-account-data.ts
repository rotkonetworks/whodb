import { ApiPromise } from "@polkadot/api";
import { SS58String } from "polkadot-api";
import { useEffect, useRef, useState } from "react";
import BigNumber from "bignumber.js";

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
 */
export const useSystemAccountData = (address?: SS58String, typedApi?: ApiPromise) => {
  const [nonce, setNonce] = useState<number | null>(null);
  const [balance, setBalance] = useState<BigNumber | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const subscription = useRef<any>(null)

  useEffect(() => {
    // Reset state when dependencies change
    setIsLoading(true);
    setBalance(null);
    setNonce(null);

    if (!typedApi || !address) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        await typedApi.isReady;

        if (!mounted) return;

        subscription.current = await typedApi.query.system.account(address, (result: any) => {
          if (!mounted) return;

          const free = BigNumber(result.data.free.toString());
          const frozen = BigNumber(result.data.frozen.toString());
          const reserved = BigNumber(result.data.reserved.toString());

          // Available = free - max(frozen, reserved)
          const availableBalance = free.minus(BigNumber.max(frozen, reserved));

          setBalance(availableBalance);
          setNonce(result.nonce.toNumber());
          setIsLoading(false);
        });
      } catch {
        setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (subscription.current) {
        subscription.current();
        subscription.current = null;
      }
    };
  }, [typedApi, address]);

  return { nonce, balance, isLoading };
};
