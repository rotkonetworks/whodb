import BigNumber from "bignumber.js";
import _ from "lodash";
import { Binary } from "polkadot-api";
import { useCallback, useDeferredValue, useEffect, useMemo } from "react";
import { useProxy } from "valtio/utils";

import { CHAINS } from "@/polkadot-api/chain-config";
import { AccountData } from "@/store/AccountStore";
import { xcmParameters as _xcmParams } from "@/store/XcmParameters";
import { Network } from "@/contexts/network-context";
import { ApiPromise } from "@polkadot/api";

interface UseXcmParametersOptions {
  chainId: string | number | symbol;
  estimatedCosts?: Record<string, BigNumber | bigint>;
}

export function useXcmParameters({
  chainId,
  estimatedCosts = {},
}: UseXcmParametersOptions) {
  const __xcmParams = useProxy(_xcmParams);
  const xcmParams = useDeferredValue(__xcmParams);

  // Determine relay chain ID based on current chain
  const relayChainId = useMemo<Network>(
    () => (chainId as string).replace("_people", "") as Network,
    [chainId]
  );

  // Get list of relay and parachains
  const relayAndParachains = useMemo(() =>
    Object.entries(CHAINS)
      .filter(([id]) => id.includes(relayChainId) && id !== chainId)
      .map(([id, chain]) => ({ id, name: chain.name })),
    [relayChainId, chainId]
  );

  // Setup fromChain when relayChainId changes
  useEffect(() => {
    xcmParams.fromChain.id = relayChainId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relayChainId]);

  // TODO Init later when needed
  const fromTypedApi = null;

  // Function to get parachain ID
  const getParachainId = useCallback(async (typedApi: ApiPromise) => {
    if (typedApi) {
      try {
        const paraId = await typedApi.consts.parachainSystem.selfParaId.toNumber();
        console.log({ paraId });
        return paraId;
      } catch (error) {
        console.error("Error getting parachain ID", error);
      }
    }
    return null;
  }, []);

  // Get and set parachain ID for from chain
  useEffect(() => {
    if (fromTypedApi) {
      getParachainId(fromTypedApi).then(id => {
        if (id !== null) {
          xcmParams.fromChain.paraId = id;
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromTypedApi, getParachainId]);

  // Update total transaction cost based on estimated costs
  useEffect(() => {
    const totalCost = Object.values(estimatedCosts)
      .reduce(
        (total: BigNumber, current: BigNumber) => BigNumber(total).plus(BigNumber(current.toString())),
        BigNumber(0)
      ) as BigNumber;
    xcmParams.txTotalCost = totalCost.times(1.1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimatedCosts]);

  // Generate teleport call
  const getTeleportCall = useCallback(({
    amount,
    fromApi,
    toAddress,
    parachainId
  }: {
    amount: BigNumber;
    fromApi: ApiPromise;
    toAddress: AccountData['polkadotSigner'];
    parachainId?: number;
  }) => {
    // TODO Refacror as per PAPI conventions
    const txArguments = ({
      dest: {
        type: "V3",
        value: {
          interior: {
            type: "X1",
            value: {
              type: "Parachain",
              value: parachainId,
            }
          },
          parents: 0,
        },
      },
      beneficiary: {
        type: "V3",
        value: {
          interior: {
            type: "X1",
            value: {
              type: "AccountId32",
              value: {
                id: Binary.fromBytes(toAddress.publicKey),
              },
            },
          },
          parents: 0
        }
      },
      assets: {
        type: "V3",
        value: [{
          fun: {
            type: "Fungible",
            value: BigInt(amount.toString())
          },
          id: {
            type: "Concrete",
            value: xcmParams.fromChain.paraId
              ? {
                interior: {
                  type: "X1",
                  value: xcmParams.fromChain.paraId,
                },
                parents: 1,
              }
              : {
                interior: {
                  type: "Here",
                  value: null
                },
                parents: 0,
              }
          }
        }]
      },
      fee_asset_index: 0,
      weight_limit: {
        type: "Unlimited",
        value: null,
      }
    });

    console.log({ txArguments });
    return fromApi.tx.xcmPallet.limitedTeleportAssets(txArguments);
  }, [xcmParams.fromChain.paraId]);

  // Teleport accordion state
  const teleportExpanded = xcmParams.enabled;
  const setTeleportExpanded = useCallback((nextState: boolean) => {
    xcmParams.enabled = nextState;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    xcmParams,
    relayChainId,
    relayAndParachains,
    fromTypedApi,
    getTeleportCall,
    getParachainId,
    teleportExpanded,
    setTeleportExpanded,
  };
}
