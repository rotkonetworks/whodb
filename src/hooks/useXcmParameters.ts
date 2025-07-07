import { ChainId, } from "@reactive-dot/core";
import { ChainDescriptorOf, Chains } from "@reactive-dot/core/internal.js";
import { useTypedApi } from "@reactive-dot/react";
import BigNumber from "bignumber.js";
import _ from "lodash";
import { TypedApi } from "polkadot-api";
import { Binary } from "polkadot-api";
import { useCallback, useDeferredValue, useEffect, useMemo } from "react";
import { useProxy } from "valtio/utils";

import { CHAIN_CONFIG } from "@/polkadot-api/chain-config";
import { AccountData } from "@/store/AccountStore";
import { xcmParameters as _xcmParams } from "@/store/XcmParameters";

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
  const relayChainId = useMemo<keyof Chains>(
    () => (chainId as string).replace("_people", "") as keyof Chains,
    [chainId]
  );

  // Get list of relay and parachains
  const relayAndParachains = useMemo(() =>
    Object.entries(CHAIN_CONFIG.chains)
      .filter(([id]) => id.includes(relayChainId) && id !== chainId)
      .map(([id, chain]) => ({ id, name: chain.name })),
    [relayChainId, chainId]
  );

  // Setup fromChain when relayChainId changes
  useEffect(() => {
    xcmParams.fromChain.id = relayChainId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relayChainId]);

  // Get typed API for from chain
  const fromTypedApi = useTypedApi({
    chainId: xcmParams.fromChain.id || relayChainId as ChainId
  });

  // Function to get parachain ID
  const getParachainId = useCallback(async (typedApi: TypedApi<ChainDescriptorOf<keyof Chains>>) => {
    if (typedApi) {
      try {
        const paraId = await typedApi.constants.ParachainSystem.SelfParaId();
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
    signer,
    parachainId
  }: {
    amount: BigNumber;
    fromApi: TypedApi<ChainDescriptorOf<keyof Chains>>;
    signer: AccountData['polkadotSigner'];
    parachainId?: number;
  }) => {
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
                id: Binary.fromBytes(signer.publicKey),
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
    return fromApi.tx.XcmPallet.limited_teleport_assets(txArguments);
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
