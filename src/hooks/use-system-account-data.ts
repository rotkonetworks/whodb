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
  const [isLoading, setIsLoading] = useState(true);

  const subscription = useRef<any>(null)

  useEffect(() => {
    console.log("🔍 useSystemAccountData effect:", {
      hasApi: !!typedApi,
      address,
      apiReady: typedApi?.isReady,
      apiType: typedApi?.constructor?.name
    });

    // Reset state when dependencies change
    setIsLoading(true);
    setBalance(null);
    setNonce(null);

    if (!typedApi || !address) {
      console.log("⚠️ Missing typedApi or address, skipping balance subscription");
      setIsLoading(false);
      return;
    }

    console.log("✅ Setting up balance subscription for:", address);

    let mounted = true;

    (async () => {
      try {
        // Wait for API to be ready
        await typedApi.isReady;

        if (!mounted) return;

        subscription.current = await typedApi.query.system.account(address, (result) => {
          if (!mounted) return;

          const free = BigNumber(result.data.free.toString());
          const frozen = BigNumber(result.data.frozen.toString());
          const reserved = BigNumber(result.data.reserved.toString());

          // Available = free - max(frozen, reserved)
          // This matches Polkadot.js Apps calculation
          const availableBalance = free.minus(BigNumber.max(frozen, reserved));

          setBalance(availableBalance);
          const nonce = result.nonce.toNumber();
          setNonce(nonce);
          setIsLoading(false);

          console.log("💰 Balance update for", address, ":", {
            free: free.toString(),
            frozen: frozen.toString(),
            reserved: reserved.toString(),
            available: availableBalance.toString(),
            nonce
          });
        });
      } catch (error) {
        console.error("❌ Failed to set up balance subscription:", error);
        setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (subscription.current) {
        console.log("🧹 Cleaning up balance subscription for:", address);
        subscription.current();
        subscription.current = null;
      }
    };
  }, [typedApi, address]);

  return { nonce, balance, isLoading };
};
