import { SS58String } from "polkadot-api";
import { useEffect, useMemo, useState } from "react";

// import { Network } from "@/contexts/network-context";
import { ApiPromise } from "@polkadot/api";

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
  typedApi: ApiPromise | null | undefined;
  chainId: string;
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
        const fetchConstants = async (retryCount = 0): Promise<void> => {
          try {
            const constants = {
              byteDeposit: await (typedApi.consts.identity.byteDeposit as any).toNumber(),
              basicDeposit: await (typedApi.consts.identity.basicDeposit as any).toNumber(),
              existentialDeposit: await (typedApi.consts.balances.existentialDeposit as any).toNumber(),
            }

            // Validate all constants are present
            if (!constants.byteDeposit || !constants.basicDeposit || !constants.existentialDeposit) {
              throw new Error('Missing required constants')
            }

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
    let systemEventsSub: any = null;

    const cleanUp = () => {
      systemEventsSub?.unsubscribe?.();
    };

    if (!typedApi) {
      return cleanUp;
    }

    (async () => {
      systemEventsSub = await typedApi.query.system.events((events: any) => {
        events
          .filter(({ event }: any) => {
            // Get the section (pallet) and method from the event
            const section = event.section;
            const method = event.method;

            // Check if this event type is in our handlers
            if (!handlerEntries.some(({ pallet, call }) => pallet === section && call === method)) {
              return false;
            }

            // Check if the event data contains our address
            const eventData = event.data;
            if (!eventData) return false;

            // Look for address in various possible fields (who, target, account, etc.)
            const addressFound = eventData.some((data: any) => {
              const dataStr = data.toString();
              return dataStr === address;
            });

            return addressFound;
          })
          .map(({ event }: any) => {
            const section = event.section;
            const method = event.method;
            const eventKey = `${section}.${method}`;
            const eventData = event.data;

            // Extract relevant address from event data
            let relevantAddress = address;
            if (eventData && eventData.length > 0) {
              // Try to find the address in the event data
              const foundAddress = eventData.find((data: any) => data.toString() === address);
              if (foundAddress) {
                relevantAddress = foundAddress.toString();
              }
            }

            const data = {
              type: eventKey,
              who: relevantAddress,
              priority: handlers[eventKey]?.priority || 0,
              eventData: eventData?.map((d: any) => d.toHuman()) || []
            };
            return data;
          })
          .sort((b1: any, b2: any) => b2.priority - b1.priority)
          .forEach((data: any) => {
            const handler = handlers[data.type];
            if (!handler) {
              console.warn(`No handler found for event type: ${data.type}`);
              return;
            }

            const { onEvent, onError } = handler;
            try {
              onEvent(data);
            } catch (error) {
              onError?.(error as Error);
              console.error(`Error processing ${data.type}`, error);
            }
          });
      });
    })();

    return cleanUp
  }, [typedApi, address, handlerEntries, handlers])

  return { constants, }
}
