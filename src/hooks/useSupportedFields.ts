import { ApiPromise } from "@polkadot/api";
import { useCallback, useEffect, useState } from "react";

import { ApiStorage } from "@/types/api";

// Bitfield for different identity fields
const IdentityField = {
  display: 1 << 0,
  legal: 1 << 1,
  web: 1 << 2,
  matrix: 1 << 3,
  email: 1 << 4,
  pgp_fingerprint: 1 << 5,
  image: 1 << 6,
  twitter: 1 << 7,
  github: 1 << 8,
  discord: 1 << 9,
} as const;

export function useSupportedFields({ typedApi, registrarIndex, }: {
  typedApi: ApiPromise,
  registrarIndex?: number,
}) {
  const [supportedFields, setSupportedFields] = useState<string[]>([]);

  const getSupportedFields = useCallback((bitfield: number): string[] => {
    const result: string[] = [];
    for (const key in IdentityField) {
      if (bitfield & IdentityField[key as keyof typeof IdentityField]) {
        result.push(key);
      }
    }
    return result;
  }, []);

  useEffect(() => {
    (async () => {
      if (!typedApi) {
      return;
      }

      if (registrarIndex !== undefined) {
      try {
        const result = await typedApi.query.identity.registrars()
        const registrarEntry = (result as any)[registrarIndex];
        const fields = registrarEntry?.fields;
        const _supportedFields = getSupportedFields(fields > 0 ? Number(fields) : (1 << 10) - 1);
        setSupportedFields(_supportedFields);
        console.log({ supportedFields: _supportedFields, result });
      } catch (error) {
        console.error("Error fetching supported fields:", error);
      }
      }
    })();
  }, [typedApi, registrarIndex, getSupportedFields]);

  return supportedFields;
}
