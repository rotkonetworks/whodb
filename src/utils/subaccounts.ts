import { ApiPromise } from "@polkadot/api";
import { SS58String, Binary } from "polkadot-api";

import { AccountTreeNode } from "@/hooks/UseAccountsTree";
// import { ApiStorage } from "@/types/api";

type SubsOfResult = {
  deposit: bigint,
  subs: SS58String[],
};

export const fetchSubsOf = async (
  api: ApiPromise,
  address: SS58String
): Promise<SubsOfResult | null> => {
  if (!api) {
    throw new Error("API not provided to fetchSubaccounts");
  }
  if (!address) {
    throw new Error("Address not provided to fetchSubaccounts");
  }

  try {
    // Fetch subaccounts information from chain
    const result = await api.query.identity.subsOf(address);
    
    if (!result || (result as any).isNone) return null;

    const subsOfData = (result as any).isSome ? (result as any).unwrap() : result;
    
    return {
      deposit: BigInt(subsOfData.deposit.toString()),
      subs: subsOfData.accounts.map((acc: any) => acc.toString()),
    };
  } catch (error) {
    throw new Error(`Error fetching subaccounts: ${error}`);
  }
}

type SuperOfResult = {
  address: SS58String,
  name?: string,
} | null;

export const fetchSuperOf = async (
  api: ApiPromise,
  address: SS58String
): Promise<SuperOfResult | null> => {
  if (!api) {
    throw new Error("API not provided to fetchSuperOf");
  }
  if (!address) {
    throw new Error("Address not provided to fetchSuperOf");
  }

  try {
    // Fetch superaccount information from chain
    const result = await api.query.identity.superOf(address);
      
    if (!result || (result as any).isNone) return null;
    
    const superOfData = (result as any).isSome ? (result as any).unwrap() : result;
    // TODO Handle other types of superaccount data
    const name = superOfData[1]?.raw ? new TextDecoder().decode(superOfData[1].raw) : undefined;

    return {
      address: superOfData[0].toString(),
      name,
    };
  } catch (error) {
    throw new Error(`Error fetching superaccount: ${error}`);
  }
}

export type RawType = `Raw${number}`;

export type RawSubs = [SS58String, {
  type: RawType,
  value: Binary,
}][];
export const prepareRawSetSubs = (node: AccountTreeNode) => node.subs?.map((sub: any) => [
  sub.address, {
    type: `Raw${sub.name.length}`,
    value: Binary.fromText(sub.name),
  }
]) || []
