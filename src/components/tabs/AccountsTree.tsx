import { ChainId } from "@reactive-dot/core";
import { ChainDescriptorOf } from "@reactive-dot/core/internal.js";
import { CircleOff, Delete, ListTree, Loader2, PenLine, PlusCircle, Unlink, } from "lucide-react";
import { TypedApi, SS58String, Binary } from "polkadot-api";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AccountSelector } from "@/components/ui/account-selector";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountTreeNode } from "~/hooks/UseAccountsTree";
import { useFormatAmount } from "~/hooks/useFormatAmount";
import { useWalletAccounts } from "~/hooks/useWalletAccounts";
import { LoadingPlaceholder } from "~/pages/Loading";
import { ChainInfo } from "~/store/ChainStore";
import { DialogMode, OpenTxDialogArgs_modeSet } from "~/types";
import { Identity } from "~/types/Identity";
import { fetchSuperOf, prepareRawSetSubs } from "~/utils/subaccounts";

const getName = (node: AccountTreeNode) => {
  return <>
    {node.name || <>
      {node.address.slice(0, 4)}
      <span className="text-foreground/50">&#x2026;</span>
      {node.address.slice(-4)}
    </>}
  </>
}
const getFqcn = (node: AccountTreeNode) => {
  return <>
    <span className="break-all">{getName(node)}</span>
    <span className="text-foreground/50 text-thin inline-flex justify-start">
      .
      <span className="text-foreground/50 text-thin break-all">
        {node.super ? getFqcn(node.super) : "alt"}
      </span>
    </span>
  </>;
}

type AccountNodeProps = {
  node: AccountTreeNode;
  isRoot?: boolean;
  onRemove: (subNode: AccountTreeNode) => void;
  onRename: (subNode: AccountTreeNode) => void;
  onQuit: (node: AccountTreeNode) => void;
  isRemoving?: SS58String | null;
  formatAmount: (amount: bigint) => string;
  hasWalletConnected?: boolean;
};
function AccountNode({
  node,
  isRoot = false,
  isRemoving,
  onRemove,
  onQuit,
  onRename,
  formatAmount,
  hasWalletConnected,
  // TODO Pass currentNode, so we can get rid of isCurrentAccount abd isDirectSubOfCurrentAccount.
}: AccountNodeProps) {
  return (
    <div className={`relative ${isRoot ? '' : 'ml-1 pt-2 xs:ml-2 pl-2 xs:pl-4 border-l border-secondary'}`}>
      <div className={`p-3 rounded-lg flex flex-row flex-wrap items-center justify-end gap-2 ${node.isCurrentAccount
          ? 'bg-primary/20 border border-primary'
          : 'bg-transparent border-secondary border-[0.5px]'
        }`}>
        <div className="flex flex-row flex-wrap max-w-full shrink grow-1">
          <div className="flex flex-col items-start justify-between xs:justify-end self-start max-w-full">
            <div className="font-semibold max-w-full">
              {getFqcn(node)}
            </div>
            <div className="text-xs text-muted-foreground truncate max-w-full">
              {node.address}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap flex-row sm:flex-col gap-1 items-center justify-end">
          {!node.super && (
            <Badge variant="secondary" className="text-xs">Root</Badge>
          )}
          {isRoot && onRemove && node.subs?.some(sub => sub.isCurrentAccount) && (
            <Badge variant="secondary" className="text-xs">Current is sub</Badge>
          )}
          {node.deposit && (
            <Badge variant="destructive" size="sm">
              {node.deposit > 0 ? formatAmount(node.deposit) : "No deposit"}
            </Badge>
          )}
          {node.isCurrentAccount && <Badge variant="default" className="text-xs flex-grow-0 flex-shrink-1">Current</Badge>}
        </div>

        {hasWalletConnected && <div className="flex flex-row gap-2 self-end">
          {!isRoot && node.isCurrentAccount && (
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full"
              title="Quit subaccount"
              onClick={() => onQuit(node)}
              disabled={!!isRemoving}
            >
              {isRemoving === node.address ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="h-4 w-4" />
              )}
            </Button>
          )}
          {node.isDirectSubOfCurrentAccount && onRename && (
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full"
              onClick={() => onRename(node)}
              disabled={!!isRemoving}
              title="Remove subaccount"
            >
              {isRemoving === node.address ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PenLine className="h-4 w-4" />
              )}
            </Button>
          )}
          {node.isDirectSubOfCurrentAccount && onRemove && (
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full"
              onClick={() => onRemove(node)}
              disabled={!!isRemoving}
              title="Remove subaccount"
            >
              {isRemoving === node.address ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Delete className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>}
      </div>

      {node.subs && node.subs.length > 0
        && (node.subs.map((subaccount) => <AccountNode
          key={subaccount.address}
          node={subaccount}
          isRemoving={isRemoving}
          onRemove={onRemove}
          onRename={onRename}
          onQuit={onQuit}
          formatAmount={formatAmount}
          hasWalletConnected={hasWalletConnected}
        />))
      }
    </div>
  );
}

type AccountsTreeProps = {
  accountTreeProps: {
    tree?: AccountTreeNode;
    loading: boolean;
  },
  currentAddress: SS58String;
  api: TypedApi<ChainDescriptorOf<ChainId>>;
  chainStore: ChainInfo;
  identity: Identity;
  openTxDialog: (args: OpenTxDialogArgs_modeSet) => void;
  className?: string;
  hasWalletConnected: boolean;
};

export function AccountsTree({
  accountTreeProps: { tree: accountTreeData, loading },
  chainStore,
  currentAddress,
  api,
  identity,
  openTxDialog,
  className = "",
  hasWalletConnected,
}: AccountsTreeProps) {
  const [addingSubaccount, setAddingSubaccount] = useState(false);
  const [removingSubaccount, setRemovingSubaccount] = useState<SS58String | null>(null);

  const findAccountNode = useCallback((address: SS58String) => {
    if (!accountTreeData) return null;

    const visited: Record<SS58String, AccountTreeNode> = {};
    const findNode = (node: AccountTreeNode, visited = {}): AccountTreeNode | null => {
      const foundNode = visited[node.address];
      if (foundNode) return foundNode;

      if (node.address === address) {
        visited[node.address] = node; // Mark as visited
        return node
      };
      if (node.subs) {
        for (const sub of node.subs) {
          const found = findNode(sub);
          if (found) {
            visited[sub.address] = found; // Mark as visited
            return found;
          }
        }
      }
      return null;
    };

    return findNode(accountTreeData, visited);
  }, [accountTreeData]);

  // Find the current account node and check if it's a subaccount
  const currentAccountNode = useMemo(() => {
    if (!accountTreeData) return null;

    // Helper function to find the node with isCurrentAccount flag
    const findCurrentAccountNode = (node: AccountTreeNode): AccountTreeNode | null => {
      if (node.isCurrentAccount) return node;

      if (node.subs) {
        for (const sub of node.subs) {
          const found = findCurrentAccountNode(sub);
          if (found) return found;
        }
      }

      return null;
    };

    return findCurrentAccountNode(accountTreeData);
  }, [accountTreeData]);

  const prepareAccountModTx = async ({ subs, address, mode }: ({
    subs: ReturnType<typeof prepareRawSetSubs>,
    mode: DialogMode,
    address: SS58String
  })) => {
    if (!api) throw new Error("API not available");
    if (!currentAddress) throw new Error("Current address not available");

    try {
      setRemovingSubaccount(address);

      const tx = api.tx.Identity.set_subs({ subs });
      const fees = await tx.getEstimatedFees(currentAddress, { at: "best" });
      const deposit = mode === "addSubaccount" ? await api.constants.Identity.SubAccountDeposit() : 0n;

      openTxDialog({ mode, tx, estimatedCosts: { fees, deposits: deposit } });
    } catch (error) {
      console.error("Error removing subaccount:", error);
    } finally {
      setRemovingSubaccount(null);
    }
  }

  // Prepare transaction to add a subaccount
  const addSubaccount = async (address: SS58String, name: string) => prepareAccountModTx({
    subs: [...prepareRawSetSubs(currentAccountNode), [address, {
      type: `Raw${name.length}`,
      value: Binary.fromText(name)
    }]],
    address,
    mode: "addSubaccount"
  });

  const removeSubAccount = async (node: AccountTreeNode) => prepareAccountModTx({
    subs: prepareRawSetSubs(currentAccountNode).filter(sub => sub[0] !== node.address),
    address: node.address,
    mode: "removeSubaccount"
  });

  const editSubAccount = async (node: AccountTreeNode) => prepareAccountModTx({
    subs: prepareRawSetSubs(currentAccountNode).map(sub => {
      if (sub[0] === node.address) {
        return [node.address, {
          type: `Raw${node.name.length}`,
          value: Binary.fromText(node.name)
        }];
      }
      return sub;
    }),
    address: node.address,
    mode: "editSubAccount"
  });

  // Prepare transaction to remove a subaccount
  const quitSubaccount = async () => {
    if (!api || !currentAddress) return;

    try {
      setRemovingSubaccount(currentAddress);

      const tx = api.tx.Identity.quit_sub(undefined);
      const fees = await tx.getEstimatedFees(currentAddress, { at: "best" });

      openTxDialog({
        mode: "quitSub",
        tx,
        estimatedCosts: { fees }
      });
    } catch (error) {
      console.error("Error removing subaccount:", error);
    } finally {
      setRemovingSubaccount(null);
    }
  };

  const { accounts: _walletAccounts } = useWalletAccounts({ chainSs58Format: chainStore.ss58Format })
  const [walletAccounts, setWalletAccounts] = useState(_walletAccounts);
  useEffect(() => {
    if (!api) {
      setWalletAccounts(_walletAccounts)
      return;
    };

    (async () => {
      setWalletAccounts(
        await Promise.all(
          _walletAccounts
            .filter(account => account.address !== currentAddress && !findAccountNode(account.address))
            .map(async account => {
              const hasSuperAccount = !!await fetchSuperOf(api, account.address).catch(() => null);
              return ({
                ...account,
                address: account.address,
                name: `${account.name} ${hasSuperAccount ? "(subaccount)" : ""}`,
                disabled: hasSuperAccount,
              });
            })
        )
      );
    })()
  }, [api, _walletAccounts, currentAddress, findAccountNode]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedName, setSelectedName] = useState<string>("");
  const [selectedNameError, setSelectedNameError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<AccountTreeNode | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<SS58String | null>(null);

  // Reset form function
  const resetForm = () => {
    setSelectedNode(null);
    setSelectedAddress(null);
    setSelectedName("");
    setSelectedNameError(null);
    setIsEditMode(false);
  };

  // Modify the edit function to populate the form
  const handleEditClick = (node: AccountTreeNode) => {
    setSelectedNode(node);
    setSelectedAddress(node.address);
    setSelectedName(node.name || "");
    setIsEditMode(true);
  };

  const currentAccountHasIdentity = !!identity.info;

  const formattAmount = useFormatAmount({
    tokenDecimals: chainStore.tokenDecimals,
    symbol: chainStore.tokenSymbol,
    decimals: 3,
  });

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <LoadingPlaceholder className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className} gap-4`}>
      <Card>
        <CardHeader>
          <CardTitle className="text-inherit flex items-center gap-2">
            <ListTree className="h-5 w-5" />
            Account Hierarchy
          </CardTitle>
          <CardDescription>
            View the relationship between main accounts and subaccounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!accountTreeData ? (
            <div className="text-center py-6 text-muted-foreground">
              No account hierarchy information available
            </div>
          ) : (
            <div className="account-tree">
              <AccountNode
                node={accountTreeData}
                isRoot
                isRemoving={removingSubaccount}
                onRemove={removeSubAccount}
                onRename={handleEditClick}
                onQuit={quitSubaccount}
                formatAmount={formattAmount}
                hasWalletConnected={hasWalletConnected}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {currentAccountNode && hasWalletConnected && (
        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? "Edit Subaccount" : "Add Subaccount"}</CardTitle>
            <CardDescription>
              {isEditMode
                ? `Update the name of subaccount ${selectedNode.name || selectedNode.address}`
                : `Link another account as a subaccount of ${currentAccountNode.name || currentAccountNode.address}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="subaccount" className="sr-only">Subaccount Address</Label>
                {isEditMode
                  ? <Input
                    id="subaccount"
                    value={selectedAddress || ""}
                    disabled={true}
                    placeholder="Account address"
                  />
                  : <AccountSelector
                    id="subaccount"
                    accounts={walletAccounts}
                    address={selectedAddress}
                    onAddressSelect={setSelectedAddress}
                    disabled={addingSubaccount}
                  />
                }
              </div>
              <div className="flex-1 flex-col">
                <Label htmlFor="name" className="sr-only">Subaccount Name</Label>
                <Input
                  id="name"
                  value={selectedName}
                  placeholder="Account name"
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedName(value);
                    setSelectedNameError(() => {
                      if (value.length > 0 && value.length < 4) {
                        return "Name must be at least 4 characters";
                      }
                      if (value.length > 32) {
                        return "Name must be at most 32 characters";
                      }
                      return null;
                    });
                  }}
                  disabled={addingSubaccount}
                />
                {selectedNameError && <p className="text-red-500 text-sm mt-1">{selectedNameError}</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="primary"
                  onClick={isEditMode
                    ? () => {
                      if (selectedNode) {
                        // Update the node name before calling editSubAccount
                        const updatedNode = { ...selectedNode, name: selectedName };
                        editSubAccount(updatedNode);
                        resetForm();
                      }
                    }
                    : () => {
                      if (selectedAddress && selectedName) {
                        addSubaccount(selectedAddress, selectedName);
                        resetForm();
                      }
                    }
                  }
                  disabled={(!selectedAddress && !isEditMode) || !selectedName || !!selectedNameError
                    || !currentAccountHasIdentity || addingSubaccount || !!removingSubaccount
                  }
                  className="gap-2 flex-1"
                >
                  {addingSubaccount ? <Loader2 className="h-4 w-4 animate-spin" />
                    : (isEditMode ? <PenLine className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />)
                  }
                  {isEditMode ? "Update Name" : "Add Subaccount"}
                </Button>

                {isEditMode && <Button variant="secondary" onClick={resetForm}
                  className="h-10 w-10 rounded-full"
                >
                  <CircleOff />
                </Button>}
              </div>
            </div>
            {!currentAccountHasIdentity && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  You need to set an identity for this account to add subaccounts.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
