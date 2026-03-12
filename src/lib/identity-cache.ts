import { SS58String, Binary } from "polkadot-api";
import { getPapiClient } from "./papi-client";
import * as descriptors from "@polkadot-api/descriptors";

export interface CachedIdentity {
  address: string;
  network: string;
  display: string | null;
  legal: string | null;
  web: string | null;
  email: string | null;
  twitter: string | null;
  github: string | null;
  discord: string | null;
  matrix: string | null;
  image: string | null;
  pgpFingerprint: string | null;
  isVerified: boolean;
  lastUpdated: number;
}

const DB_NAME = 'whodb-identity-cache';
const DB_VERSION = 1;
const STORE_NAME = 'identities';

let db: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: ['address', 'network'] });
        store.createIndex('network', 'network', { unique: false });
        store.createIndex('display', 'display', { unique: false });
        store.createIndex('email', 'email', { unique: false });
        store.createIndex('twitter', 'twitter', { unique: false });
      }
    };
  });
}

function readIdentityField(field: any): string | null {
  if (!field || field.type === "None" || field.type === "Raw0") return null;
  if (field.type === "Raw1") {
    return Binary.fromBytes(new Uint8Array(field.value)).asText();
  }
  return field.value?.asText?.() || null;
}

export async function cacheIdentity(identity: CachedIdentity): Promise<void> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(identity);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedIdentity(address: string, network: string): Promise<CachedIdentity | null> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get([address, network]);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export interface ScoredIdentity extends CachedIdentity {
  score: number;
}

/**
 * Ranking weights matching backend config
 * See: w3registrar/src/config/mod.rs
 */
const NETWORK_WEIGHTS: Record<string, number> = {
  polkadot: 100,
  kusama: 80,
  paseo: 20,
  unknown: 10,
};

const VERIFICATION_WEIGHTS = {
  verified: 50,      // Verified by any registrar
  unverified: 0,
};

const SIMILARITY_WEIGHT = 200; // Multiplied by 0-1 similarity

/**
 * Lightweight Levenshtein distance (edit distance)
 * Returns number of edits needed to transform a into b
 */
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Use two rows instead of full matrix for memory efficiency
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[b.length];
}

/**
 * Calculate fuzzy string similarity (0-1)
 * Combines exact matching, prefix matching, contains, and typo tolerance
 */
function calculateSimilarity(str: string, query: string): number {
  if (!str || !query) return 0;
  const s = str.toLowerCase().trim();
  const q = query.toLowerCase().trim();

  if (!s || !q) return 0;

  // Exact match
  if (s === q) return 1.0;

  // Starts with (high similarity)
  if (s.startsWith(q)) {
    // Bonus for shorter strings (more complete match)
    return 0.9 + (q.length / s.length) * 0.09;
  }

  // Contains (medium-high similarity)
  if (s.includes(q)) {
    const pos = s.indexOf(q);
    // Earlier position = better, longer match = better
    const positionBonus = 1 - (pos / s.length) * 0.3;
    const lengthBonus = q.length / s.length;
    return 0.6 + positionBonus * 0.15 + lengthBonus * 0.1;
  }

  // Word boundary matching (e.g., "alice" matches "Alice_Smith")
  const words = s.split(/[\s._\-@]+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word === q) return 0.85 - i * 0.05; // Exact word match, earlier = better
    if (word.startsWith(q)) return 0.7 - i * 0.05;
  }

  // Fuzzy matching with Levenshtein distance
  // Only for queries >= 3 chars to avoid too many false positives
  if (q.length >= 3) {
    // Check each word for typo tolerance
    for (const word of words) {
      if (word.length >= q.length - 1 && word.length <= q.length + 2) {
        const distance = levenshtein(word, q);
        const maxDistance = Math.max(1, Math.floor(q.length / 3)); // Allow ~1 typo per 3 chars

        if (distance <= maxDistance) {
          // Convert distance to similarity (0 distance = 1.0, max distance = 0.4)
          return 0.4 + (1 - distance / maxDistance) * 0.3;
        }
      }
    }

    // Check full string for typo tolerance (for single-word names)
    if (s.length >= q.length - 1 && s.length <= q.length + 3) {
      const distance = levenshtein(s, q);
      const maxDistance = Math.max(1, Math.floor(q.length / 3));

      if (distance <= maxDistance) {
        return 0.35 + (1 - distance / maxDistance) * 0.25;
      }
    }

    // Prefix fuzzy: "alic" should match "alice" with 1 typo
    if (s.length > q.length) {
      const prefix = s.substring(0, q.length + 1);
      const distance = levenshtein(prefix, q);
      if (distance <= 1) {
        return 0.5 + (1 - distance) * 0.2;
      }
    }
  }

  // No match
  return 0;
}

/**
 * Calculate relevance score for a search match
 * Mirrors backend ranking: network_weight + verification_bonus + (similarity * similarity_weight)
 */
function calculateScore(identity: CachedIdentity, queryLower: string): number {
  const query = queryLower.trim();

  // Calculate best similarity across all searchable fields
  const similarities = [
    calculateSimilarity(identity.display || '', query) * 1.0,    // Display name most important
    calculateSimilarity(identity.twitter || '', query) * 0.9,
    calculateSimilarity(identity.email || '', query) * 0.9,
    calculateSimilarity(identity.github || '', query) * 0.85,
    calculateSimilarity(identity.legal || '', query) * 0.8,
    calculateSimilarity(identity.web || '', query) * 0.7,
    calculateSimilarity(identity.discord || '', query) * 0.7,
    calculateSimilarity(identity.matrix || '', query) * 0.6,
    calculateSimilarity(identity.address, query) * 0.5,          // Address less relevant for text search
  ];

  const bestSimilarity = Math.max(...similarities);

  // No match = skip
  if (bestSimilarity === 0) return 0;

  // Network weight (polkadot > kusama > paseo)
  const networkWeight = NETWORK_WEIGHTS[identity.network?.toLowerCase() || 'unknown'] || NETWORK_WEIGHTS.unknown;

  // Verification bonus
  const verificationBonus = identity.isVerified ? VERIFICATION_WEIGHTS.verified : VERIFICATION_WEIGHTS.unverified;

  // Combined score: network_weight + verification_bonus + (similarity * similarity_weight)
  const score = networkWeight + verificationBonus + (bestSimilarity * SIMILARITY_WEIGHT);

  return score;
}

export async function searchLocalIdentities(
  query: string,
  network?: string,
  limit: number = 50
): Promise<ScoredIdentity[]> {
  const database = await getDB();
  const queryLower = query.toLowerCase().trim();

  if (!queryLower) return [];

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const results: ScoredIdentity[] = [];

    let request: IDBRequest;
    if (network) {
      const index = store.index('network');
      request = index.openCursor(IDBKeyRange.only(network));
    } else {
      request = store.openCursor();
    }

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const identity = cursor.value as CachedIdentity;
        const score = calculateScore(identity, queryLower);

        // Only include if there's a match (score > 0)
        if (score > 0) {
          results.push({ ...identity, score });
        }
        cursor.continue();
      } else {
        // Sort by score descending, then by display name
        results.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return (a.display || '').localeCompare(b.display || '');
        });

        // Return top results
        resolve(results.slice(0, limit));
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function fetchAndCacheIdentity(
  address: SS58String,
  chainId: string
): Promise<CachedIdentity | null> {
  try {
    const client = await getPapiClient(chainId, false);
    const descriptor = (descriptors as any)[chainId];
    if (!descriptor) return null;

    const typedApi = client.getTypedApi(descriptor);

    // Check which Identity pallet is available
    let identityQuery: any = null;
    if (typedApi.query?.Identity?.IdentityOf) {
      identityQuery = typedApi.query.Identity.IdentityOf;
    } else if (typedApi.query?.PeopleIdentity?.IdentityOf) {
      identityQuery = typedApi.query.PeopleIdentity.IdentityOf;
    }

    if (!identityQuery) return null;

    const identityData = await identityQuery.getValue(address);

    if (!identityData) return null;

    const baseNetwork = chainId.split('_')[0];
    const cached: CachedIdentity = {
      address,
      network: baseNetwork,
      display: readIdentityField(identityData.info.display),
      legal: readIdentityField(identityData.info.legal),
      web: readIdentityField(identityData.info.web),
      email: readIdentityField(identityData.info.email),
      twitter: readIdentityField(identityData.info.twitter),
      github: readIdentityField(identityData.info.github),
      discord: readIdentityField(identityData.info.discord),
      matrix: readIdentityField(identityData.info.matrix),
      image: readIdentityField(identityData.info.image),
      pgpFingerprint: identityData.info.pgp_fingerprint
        ? Array.from(identityData.info.pgp_fingerprint).map((b: any) => b.toString(16).padStart(2, '0')).join('')
        : null,
      isVerified: identityData.judgements?.some(
        ([, j]: [number, { type: string }]) => j.type === "Reasonable" || j.type === "KnownGood"
      ) || false,
      lastUpdated: Date.now(),
    };

    await cacheIdentity(cached);
    return cached;
  } catch (err) {
    console.error('Failed to fetch identity from chain:', err);
    return null;
  }
}

export async function syncAllIdentities(
  chainId: string,
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  try {
    const client = await getPapiClient(chainId, false);
    const descriptor = (descriptors as any)[chainId];
    if (!descriptor) return 0;

    const typedApi = client.getTypedApi(descriptor);

    // Fetch all identities using getEntries
    // People chains use Identity pallet, but we need to check available pallets
    let identityQuery: any = null;
    if (typedApi.query?.Identity?.IdentityOf) {
      identityQuery = typedApi.query.Identity.IdentityOf;
    } else if (typedApi.query?.PeopleIdentity?.IdentityOf) {
      identityQuery = typedApi.query.PeopleIdentity.IdentityOf;
    }

    if (!identityQuery) {
      console.error('[identity-cache] No Identity pallet found for chain:', chainId);
      return 0;
    }

    // PAPI may return array or async iterable depending on version
    const entriesResult = await identityQuery.getEntries();
    console.log('[identity-cache] getEntries raw result:', typeof entriesResult, entriesResult);

    // Convert to array if needed (handle both array and async iterable)
    let entries: Array<{ keyArgs: any; value: any }> = [];
    if (Array.isArray(entriesResult)) {
      entries = entriesResult;
    } else if (entriesResult && typeof entriesResult[Symbol.asyncIterator] === 'function') {
      // Handle async iterable
      for await (const entry of entriesResult as AsyncIterable<any>) {
        entries.push(entry);
      }
    } else if (entriesResult && typeof entriesResult[Symbol.iterator] === 'function') {
      // Handle sync iterable
      entries = [...entriesResult as Iterable<any>];
    } else {
      console.error('[identity-cache] Unexpected getEntries result format:', entriesResult);
      return 0;
    }

    console.log('[identity-cache] Parsed', entries.length, 'entries. Sample:', entries[0]);
    const total = entries.length;
    let synced = 0;

    const baseNetwork = chainId.split('_')[0];

    for (const entry of entries) {
      // PAPI format: entry.keyArgs is [address], entry.value is the identity data
      const address = entry.keyArgs?.[0] as unknown as string;
      const value = entry.value;
      if (synced === 0) {
        console.log('[identity-cache] First entry structure:', { entry, address, value });
      }

      if (!value || !address) continue;

      const cached: CachedIdentity = {
        address,
        network: baseNetwork,
        display: readIdentityField(value.info.display),
        legal: readIdentityField(value.info.legal),
        web: readIdentityField(value.info.web),
        email: readIdentityField(value.info.email),
        twitter: readIdentityField(value.info.twitter),
        github: readIdentityField(value.info.github),
        discord: readIdentityField(value.info.discord),
        matrix: readIdentityField(value.info.matrix),
        image: readIdentityField(value.info.image),
        pgpFingerprint: value.info.pgp_fingerprint
          ? Array.from(value.info.pgp_fingerprint).map((b: any) => b.toString(16).padStart(2, '0')).join('')
          : null,
        isVerified: value.judgements?.some(
          ([, j]: [number, { type: string }]) => j.type === "Reasonable" || j.type === "KnownGood"
        ) || false,
        lastUpdated: Date.now(),
      };

      await cacheIdentity(cached);
      synced++;
      onProgress?.(synced, total);
    }

    return synced;
  } catch (err) {
    console.error('Failed to sync identities:', err);
    return 0;
  }
}

export async function getCacheStats(): Promise<{ count: number; networks: string[] }> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const countRequest = store.count();
    const networks = new Set<string>();

    countRequest.onsuccess = () => {
      const cursorRequest = store.openCursor();
      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          networks.add(cursor.value.network);
          cursor.continue();
        } else {
          resolve({ count: countRequest.result, networks: Array.from(networks) });
        }
      };
      cursorRequest.onerror = () => reject(cursorRequest.error);
    };
    countRequest.onerror = () => reject(countRequest.error);
  });
}

export async function clearCache(): Promise<void> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
