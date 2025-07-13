import { ChainDescriptorOf, Chains } from "@reactive-dot/core/internal.js";
import { SS58String, TypedApi } from "polkadot-api";
import { useEffect, useMemo, useState } from "react";

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
  chainId: string | number | symbol;
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
              byteDeposit: await typedApi.constants.Identity.ByteDeposit(),
              basicDeposit: await typedApi.constants.Identity.BasicDeposit(),
              existentialDeposit: await typedApi.constants.Balances.ExistentialDeposit(),
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
    const systemEventsSub = (typedApi.query.System.Events as ApiStorage)
      .watchValue("best").subscribe({
        next: (events) => {
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
        },
        error: (error) => {
          console.error("Error fetching events", error)
        },
        complete: () => {
          console.log({ event: "complete fetching events" })
        }
      })
    return () => {
      systemEventsSub.unsubscribe?.()
    }
  }, [typedApi, address, handlerEntries, handlers])

  return { constants, }
}
