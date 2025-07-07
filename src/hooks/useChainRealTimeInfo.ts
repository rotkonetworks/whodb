import { ChainDescriptorOf, Chains } from "@reactive-dot/core/internal.js";
import BigNumber from "bignumber.js";
import { SS58String, TypedApi } from "polkadot-api";
import { useEffect, useMemo, useState } from "react";

import { ApiStorage } from "@/types/api";

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
  const [constants, setConstants] = useState<Record<string, bigint | BigNumber | string>>({});
  useEffect(() => {
    console.log(constants)
  }, [constants])

  useEffect(() => {
    if (typedApi) {
      (async () => {
        try {
          const constants = {
            byteDeposit: await typedApi.constants.Identity.ByteDeposit(),
            basicDeposit: await typedApi.constants.Identity.BasicDeposit(),
            existentialDeposit: await typedApi.constants.Balances.ExistentialDeposit(),
          }
          console.log({ constants })
          setConstants(constants)
        } catch (e) {
          console.error(e)
        }
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
