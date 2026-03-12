import { SS58String } from "polkadot-api";
import { useCallback, useEffect, useState } from "react";

import { fetchIdentity } from "@/utils/fetchIdentity";
import { fetchSubsOf, fetchSuperOf } from "@/utils/subaccounts";
import { ApiPromise } from "@polkadot/api";

export type AccountTreeNode = {
  address: SS58String,
  name?: string,
  deposit?: bigint,
  super?: AccountTreeNode,
  subs?: AccountTreeNode[],
  // TODO Get rid of following properties, as they are redundant
  isCurrentAccount?: boolean,
  isDirectSubOfCurrentAccount?: boolean,
};

/**
 * Parameter type for buildAccountHierarchy function
 */
type BuildHierarchyParams = {
  api: ApiPromise,
  address: SS58String,
  currentAddress: SS58String,
  allNodes?: Record<SS58String, AccountTreeNode>,
  maxDepth?: number,
};

/**
 * Recursive function to build the account hierarchy
 * @param params Object containing all necessary parameters
 */
async function buildAccountHierarchy(
  params: BuildHierarchyParams
): Promise<AccountTreeNode | null> {
  const {
    api,
    address,
    currentAddress,
    allNodes = {},
    maxDepth = 5
  } = params;

  // Special case: Always process the current address even if visited
  const isCurrentAccount = address === currentAddress;

  // Prevent infinite loops and too deep recursion
  if (allNodes[address]) {
    return null;
  }
  if (maxDepth <= 0) {
    return null;
  }

  const node: AccountTreeNode = {
    address,
    isCurrentAccount
  };
  allNodes[address] = node;

  // Try to fetch super account (parent)
  try {
    const superAccount = await fetchSuperOf(api, address);
    if (superAccount) {
      if (!allNodes[superAccount.address]) {
        // Recursively get the super's hierarchy
        node.super = await buildAccountHierarchy({
          api,
          address: superAccount.address,
          currentAddress,
          allNodes,
          maxDepth: maxDepth - 1
        }) ?? undefined;

        if (node.super) {
          allNodes[superAccount.address] = node.super;
        }
      } else {
        // If the super account is already visited, just link it
        node.super = allNodes[superAccount.address];
      }
    }
  } catch (error) {
    console.error(`Error fetching superaccount for ${address}:`, error);
  }

  // Fetch subaccounts
  try {
    const subsResult = await fetchSubsOf(api, address);
    if (subsResult && subsResult.subs.length > 0) {
      node.deposit = subsResult.deposit;
      node.subs = [];

      // Process all subaccounts in parallel using Promise.all
      const subPromises = subsResult.subs.map(async (subAddress) => {
        if (!allNodes[subAddress]) {
          const subNode = await buildAccountHierarchy({
            api,
            address: subAddress,
            currentAddress,
            allNodes,
            maxDepth: maxDepth - 1
          });

          if (subNode) {
            subNode.super = node;
            // Get subaccount name if available
            try {
              const subInfo = await fetchSuperOf(api, subAddress);
              if (subInfo) {
                subNode.name = subInfo.name;
              }
            } catch (error) {
              console.error(`Error fetching name for ${subAddress}:`, error);
            }

            subNode.isCurrentAccount = subNode.address === currentAddress;
            return subNode;
          }
        } else {
          return allNodes[subAddress];
        }
        return null;
      });

      const subResults = await Promise.all(subPromises);
      node.subs = subResults.filter(Boolean) as AccountTreeNode[];
    }
  } catch (error) {
    console.error(`Error fetching subaccounts for ${address}:`, error);
  }
  node.name = node.name || (await fetchIdentity(api, address))?.info?.display;

  return node;
}

/**
 * Find the root of the account hierarchy
 * This walks up the super chain to find the topmost parent
 */
function findRootAccount(node: AccountTreeNode): AccountTreeNode {
  if (!node.super) {
    return node;
  }
  return findRootAccount(node.super);
}

/**
 * Find a specific address within the account tree
 */
function findAccountInTree(node: AccountTreeNode, targetAddress: SS58String): AccountTreeNode | null {
  if (node.address === targetAddress) {
    return node;
  }

  if (node.subs) {
    for (const sub of node.subs) {
      const found = findAccountInTree(sub, targetAddress);
      if (found) return found;
    }
  }

  return null;
}

export const useAccountsTree = ({
  address,
  api
}: {
  address: SS58String,
  api: ApiPromise
}) => {
  const [accountTree, setAccountTree] = useState<AccountTreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAccountHierarchy = useCallback(async () => {
    if (!address || !api) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const allNodes = {};

      // Build the complete hierarchy starting from the current address
      const hierarchy = await buildAccountHierarchy({
        api,
        address,
        currentAddress: address,
        allNodes,
      });

      if (hierarchy) {
        // Find the root of the hierarchy to display the full tree
        const rootAccount = findRootAccount(hierarchy);

        // Make sure the current account is marked correctly
        const currentAccountNode = findAccountInTree(rootAccount, address);
        if (currentAccountNode) {
          currentAccountNode.isCurrentAccount = true;
        }
        // Mark direct subnodes of current account
        if (currentAccountNode && currentAccountNode.subs) {
          for (const subNode of currentAccountNode.subs) {
            subNode.isDirectSubOfCurrentAccount = true;
          }
        }

        setAccountTree(rootAccount);
      } else {
        // If no hierarchy found, create a simple node for the current address
        setAccountTree({
          address,
          isCurrentAccount: true,
          name: "Current Account"
        });
      }
    } catch (err) {
      console.error("Error fetching account hierarchy:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setAccountTree(null);
    } finally {
      setLoading(false);
    }
  }, [address, api]);

  useEffect(() => {
    fetchAccountHierarchy();
  }, [fetchAccountHierarchy]);

  return {
    accountTree,
    loading,
    error,
    refresh: fetchAccountHierarchy,
  };
};
