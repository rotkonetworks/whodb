import { createClient, PolkadotClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { startFromWorker } from "polkadot-api/smoldot/from-worker";
import { getMetadata } from "@polkadot-api/descriptors";

const clients = new Map<string, PolkadotClient>();

const DOTTERS_ENDPOINTS = {
  polkadot: "wss://polkadot.dotters.network",
  polkadot_people: "wss://people-polkadot.dotters.network",
  polkadot_assethub: "wss://asset-hub-polkadot.dotters.network",
  kusama: "wss://kusama.dotters.network",
  kusama_people: "wss://people-kusama.dotters.network",
  kusama_assethub: "wss://asset-hub-kusama.dotters.network",
  paseo: "wss://paseo.dotters.network",
  paseo_people: "wss://people-paseo.dotters.network",
  paseo_assethub: "wss://asset-hub-paseo.dotters.network",
} as const;

export const getPapiClient = async (
  chainId: string,
  useLightClient: boolean = false
): Promise<PolkadotClient> => {
  const cacheKey = `${chainId}-${useLightClient ? 'light' : 'ws'}`;

  if (clients.has(cacheKey)) {
    return clients.get(cacheKey)!;
  }

  let client: PolkadotClient;

  if (useLightClient) {
    const smoldot = startFromWorker(
      new Worker(new URL("polkadot-api/smoldot/worker", import.meta.url), {
        type: "module",
      })
    );

    throw new Error("Light client requires chain specs - use WebSocket by default");
  } else {
    const endpoint = DOTTERS_ENDPOINTS[chainId] || chainId;
    const provider = getWsProvider(endpoint);
    client = createClient(provider, { getMetadata });
  }

  clients.set(cacheKey, client);
  return client;
};

export const cleanupPapiClients = () => {
  for (const [endpoint, client] of clients.entries()) {
    client.destroy();
    clients.delete(endpoint);
  }
};

export const queryIdentity = async (
  chainId: string,
  address: string,
  useLightClient: boolean = false
) => {
  const client = await getPapiClient(chainId, useLightClient);

  const identity = await client.request("state_call", [
    "Identity_identity_of",
    address,
  ]);

  return identity;
};
