import { ApiPromise } from "@polkadot/api";
import { SS58String } from "polkadot-api";
import { useEffect, useRef, useState } from "react";
import BigNumber from "bignumber.js";
import { getTypedApi } from "@/polkadot-api/chain-config";
import { logger } from "@/utils/logger";

/**
 * Custom React hook that fetches balances from both People chain and AssetHub,
 * then combines them for a total balance view.
 *
 * @param address - The SS58 formatted address to query account data for
 * @param peopleChainApi - The Polkadot API instance for the People chain
 * @param networkId - The network ID (e.g., 'paseo', 'polkadot', 'kusama')
 *
 * @returns An object containing:
 *   - `totalBalance`: Combined balance from both chains as BigNumber
 *   - `peopleChainBalance`: Balance on People chain
 *   - `assetHubBalance`: Balance on AssetHub
 *   - `isLoading`: Loading state
 */
export const useCombinedBalance = (
  address?: SS58String,
  peopleChainApi?: ApiPromise,
  networkId?: string
) => {
  const [peopleChainBalance, setPeopleChainBalance] = useState<BigNumber | null>(null);
  const [assetHubBalance, setAssetHubBalance] = useState<BigNumber | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const peopleSubscription = useRef<any>(null);
  const assetHubSubscription = useRef<any>(null);

  useEffect(() => {
    if (!address || !peopleChainApi || !networkId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Subscribe to People chain balance
    (async () => {
      try {
        peopleSubscription.current = await peopleChainApi.query.system.account(
          address,
          (result: any) => {
            const free = BigNumber(result.data.free.toString());
            const frozen = BigNumber(result.data.frozen.toString());
            const reserved = BigNumber(result.data.reserved.toString());

            // Available = free - max(frozen, reserved)
            // This matches Polkadot.js Apps calculation
            const availableBalance = free.minus(BigNumber.max(frozen, reserved));

            logger.log("People chain balance update:", {
              address,
              free: free.toString(),
              frozen: frozen.toString(),
              reserved: reserved.toString(),
              available: availableBalance.toString()
            });

            setPeopleChainBalance(availableBalance);
          }
        );
      } catch (error) {
        logger.error("Error subscribing to People chain balance:", error);
        setPeopleChainBalance(new BigNumber(0));
      }
    })();

    // Subscribe to AssetHub balance
    (async () => {
      try {
        // Determine AssetHub chain ID based on network
        const baseNetwork = networkId.replace('_people', '');
        const assetHubChainId = `${baseNetwork}_assethub`;

        logger.debug("Fetching AssetHub balance from:", assetHubChainId);

        const assetHubApi = await getTypedApi(assetHubChainId as any);

        assetHubSubscription.current = await assetHubApi.query.system.account(
          address,
          (result: any) => {
            const free = BigNumber(result.data.free.toString());
            const frozen = BigNumber(result.data.frozen.toString());
            const reserved = BigNumber(result.data.reserved.toString());

            // Available = free - max(frozen, reserved)
            const availableBalance = free.minus(BigNumber.max(frozen, reserved));

            logger.log("AssetHub balance update:", {
              address,
              free: free.toString(),
              frozen: frozen.toString(),
              reserved: reserved.toString(),
              available: availableBalance.toString()
            });

            setAssetHubBalance(availableBalance);
          }
        );
      } catch (error) {
        logger.error("Error subscribing to AssetHub balance:", error);
        setAssetHubBalance(new BigNumber(0));
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      if (peopleSubscription.current) {
        peopleSubscription.current();
      }
      if (assetHubSubscription.current) {
        assetHubSubscription.current();
      }
    };
  }, [address, peopleChainApi, networkId]);

  const totalBalance =
    peopleChainBalance && assetHubBalance
      ? peopleChainBalance.plus(assetHubBalance)
      : peopleChainBalance || assetHubBalance || new BigNumber(0);

  return {
    totalBalance,
    peopleChainBalance,
    assetHubBalance,
    isLoading,
  };
};
