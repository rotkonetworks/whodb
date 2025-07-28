import { ChainDescriptorOf, Chains } from "@reactive-dot/core/internal.js";
import { SS58String, TypedApi } from "polkadot-api";
import { useEffect, useMemo, useState } from "react";

import { Network } from "@/contexts/network-context";
import { ApiStorage } from "@/types/api";

/**
 * Chain constants retrieved from the Substrate runtime metadata.
 * These values are essential for calculating transaction fees and account requirements.
 * 
 * @interface ChainConstants
 * @property {bigint} byteDeposit - From Identity pallet: deposit required per byte of additional information stored on-chain for identity records
 * @property {bigint} basicDeposit - From Identity pallet: base deposit required to set an identity on-chain
 * @property {bigint} existentialDeposit - From Balances pallet: minimum balance that must be kept in an account to prevent it from being reaped
 */
// TODO Add to ChainStore
export interface ChainConstants {
  byteDeposit: bigint;
  basicDeposit: bigint;
  existentialDeposit: bigint;
}

export const useChainRealTimeInfo = ({ typedApi, address, handlers }: {
  typedApi: TypedApi<ChainDescriptorOf<keyof Chains>>;
  chainId: Network;
  address: SS58String;
  handlers: Record<string, {
    onEvent: (data: object) => void;
    onError?: (error: Error) => void;
    priority: number;
  }>
}) => {
  const [constants, setConstants] = useState<ChainConstants | null>(null);

  useEffect(() => {
    if (typedApi) {
      (async () => {
        console.log("Fetching chain constants...");
        const fetchConstants = async (retryCount = 0): Promise<void> => {
          try {
            const constants = {
              byteDeposit: await typedApi.consts.identity.byteDeposit.toNumber(),
              basicDeposit: await typedApi.consts.identity.basicDeposit.toNumber(),
              existentialDeposit: await typedApi.consts.balances.existentialDeposit.toNumber(),
            }
            
            // Validate all constants are present
            if (!constants.byteDeposit || !constants.basicDeposit || !constants.existentialDeposit) {
              throw new Error('Missing required constants')
            }
            
            console.log({ constants })
            setConstants(constants)
          } catch (e) {
            console.error(`Attempt ${retryCount + 1} failed:`, e)
            
            if (retryCount < 3) {
              const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
              setTimeout(() => fetchConstants(retryCount + 1), delay)
            } else {
              throw new Error('Failed to fetch constants after 4 attempts')
            }
          }
        }
        
        fetchConstants()
      })()
    }
  }, [typedApi])

  // Convert handlers to array and memoize
  const handlerEntries = useMemo(() =>
    Object.entries(handlers).map(([key, handler]) => {
      const [pallet, call] = key.split('.')
      return { pallet, call, handler }
    }),
    [handlers]
  )

  useEffect(() => {
    let systemEventsSub: Observable<any> | null = null;

    const cleanUp = () => {
      if (systemEventsSub) {
      }
      systemEventsSub?.unsubscribe?.();
    };
    
    if (!typedApi) {
      return cleanUp;
    }

    systemEventsSub = (typedApi.query.system.events as ApiStorage)((events) => {
      console.log({ events });
      events
        .filter(({
          event: {
            type: _pallet,
            value: {
              type: _type,
              value: { who, target },
            }
          }
        }) =>
          handlerEntries.some(({ pallet, call }) => pallet === _pallet && call === _type)
          && [who, target].includes(address)
        )
        .map(({
          event: {
            type: _pallet,
            value: {
              type: _type,
              value: { who, target },
            }
          }
        }) => {
          const type = `${_pallet}.${_type}`
          const data = { type, who: who || target, priority: handlers[type].priority }
          return data
        })
        .sort((b1, b2) => b2.priority - b1.priority)
        .forEach(data => {
          const { onEvent, onError } = handlers[data.type]
          try {
            onEvent(data)
          } catch (error) {
            onError?.(error)
            console.error(`Error processing ${data.type}`, error);
          }
        })
    })
    return cleanUp
  }, [typedApi, address, handlerEntries, handlers])

  return { constants, }
}
