import { ChainId } from "@reactive-dot/core";
import { ChainDescriptorOf } from "@reactive-dot/core/internal.js";
import { SS58String, TypedApi } from "polkadot-api";
import { useCallback, useEffect, useState } from "react";

import { fetchIdentity } from "@/utils/fetchIdentity";
import { fetchSubsOf, fetchSuperOf } from "@/utils/subaccounts";

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
  api: TypedApi<ChainDescriptorOf<ChainId>>,
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

  // ISSUE: There are certain cases where this would bir oridyce exoected node struct when current 
  //  node is leaf node.
  // Potential solution: 
  // - Add a check to see if the node is a leaf node and return null if so. Include all leaf nodes for current parent.
  // - TESTING Have lookup table for all nodes' props, keyed by address. If a node vas visited, use the lookup table to get the props.

  // Special case: Always process the current address even if visited
  const isCurrentAccount = address === currentAddress;

  // Prevent infinite loops and too deep recursion
  // But make an exception for the current account to ensure it's included
  if (allNodes[address]) {
    console.log("Already visited:", address);
    return null;
  }
  if (maxDepth <= 0) {
    console.log("Max depth reached, address:", address);
    return null;
  }
  console.log(`Visiting address: ${address}, maxDepth: ${maxDepth}, 
    isVisited: ${allNodes[address] ? "yes" : "no"}`
  );
  console.log("allNodes:", allNodes);

  const node: AccountTreeNode = {
    address,
    isCurrentAccount
  };
  allNodes[address] = node; // Store the node in the allNodes object

  console.log(`Building node for: ${address}, isCurrentAccount: ${node.isCurrentAccount}`);
  // Try to fetch super account (parent)
  try {
    const superAccount = await fetchSuperOf(api, address);
    console.log(`Superaccount for ${address}:`, superAccount);
    if (superAccount) {
      if (!allNodes[superAccount.address]) {
        console.log(`Found superaccount for ${address}: ${superAccount.address}`);

        // Recursively get the super's hierarchy
        node.super = await buildAccountHierarchy({
          api,
          address: superAccount.address,
          currentAddress,
          allNodes,
          maxDepth: maxDepth - 1
        });


        if (node.super) {
          allNodes[superAccount.address] = node.super; // Store the super node in allNodes
          console.log(`Set super for ${address}: ${superAccount.address}`);
        }
      } else {
        // If the super account is already visited, just link it
        node.super = allNodes[superAccount.address];
        console.log(`Superaccount ${superAccount.address} already visited for ${address}`);
      }
    }
  } catch (error) {
    console.error(`Error fetching superaccount for ${address}:`, error);
  }

  // Fetch subaccounts
  try {
    const subsResult = await fetchSubsOf(api, address);
    console.log(`Subaccounts for ${address}:`, subsResult);
    if (subsResult && subsResult.subs.length > 0) {
      node.deposit = subsResult.deposit;
      node.subs = [];

      console.log(`Found ${subsResult.subs.length} subaccounts for ${address}`, [...subsResult.subs]);

      // Process all subaccounts in parallel using Promise.all
      const subPromises = subsResult.subs.map(async (subAddress) => {
        // Process subaccount even if visited when it's the current account
        //if (!allNodes[subAddress] || subAddress === currentAddress) {
        if (!allNodes[subAddress]) {
          const subNode = await buildAccountHierarchy({
            api,
            address: subAddress,
            currentAddress,
            allNodes,
            maxDepth: maxDepth - 1
          });

          if (subNode) {
            subNode.super = node; // Set the current node as the super for the subaccount
            // Get subaccount name if available
            try {
              const subInfo = await fetchSuperOf(api, subAddress);
              if (subInfo) {
                subNode.name = subInfo.name;
              }
            } catch (error) {
              console.error(`Error fetching name for ${subAddress}:`, error);
            }

            // Mark if this subaccount is the current account
            subNode.isCurrentAccount = subNode.address === currentAddress;

            console.log(`Adding subaccount: ${subAddress}, isCurrentAccount: ${subNode.isCurrentAccount}`);
            return subNode;
          }
        } else {
          return allNodes[subAddress]; // Return the already visited node
        }
        return null;
      });

      const subResults = await Promise.all(subPromises);
      node.subs = subResults.filter(Boolean) as AccountTreeNode[];
    }
  } catch (error) {
    console.error(`Error fetching subaccounts for ${address}:`, error);
  }
  node.name = node.name || (await fetchIdentity(api, address)).info?.display;
  console.log(`Finished building node for ${address}:`, node);

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
  api: TypedApi<ChainDescriptorOf<ChainId>>
}) => {
  const [accountTree, setAccountTree] = useState<AccountTreeNode | null>(null);
  // Keep logging for accountTree changes
  useEffect(() => {
    console.log({ accountTree });
  }, [accountTree]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAccountHierarchy = useCallback(async () => {
    if (!address || !api) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      console.log(`Starting to build hierarchy for ${address}`);

      const allNodes = {}; // Reset allNodes for each fetch

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
        console.log(`Root account: ${rootAccount.address}`);
        console.log(`Current account found in tree: ${!!currentAccountNode}`);

        setAccountTree(rootAccount);
      } else {
        // If no hierarchy found, create a simple node for the current address
        console.log(`No hierarchy found, creating simple node for ${address}`);
        setAccountTree({
          address,
          isCurrentAccount: true,
          name: "Current Account"
        });
      }
    } catch (err) {
      console.error("Error fetching account hierarchy:", err);
      setError(err instanceof Error ? err : new Error(String(err), { cause: err }));
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
