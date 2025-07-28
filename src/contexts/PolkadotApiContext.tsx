import { AlertToastBridge } from "@/components/AlertToastBridge";
import { CHAIN_UPDATE_INTERVAL } from "@/constants";
import { useAccountsTree } from "@/hooks/UseAccountsTree";
import { useAlerts } from "@/hooks/useAlerts";
import { useChainRealTimeInfo } from "@/hooks/useChainRealTimeInfo";
import { useChallengeWebSocket } from "@/hooks/useChallengeWebSocket";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useFormatAmount } from "@/hooks/useFormatAmount";
import { useIdentity } from "@/hooks/useIdentity";
import { useSupportedFields } from "@/hooks/useSupportedFields";
import { UrlParamsArgs, useUrlParams } from "@/hooks/useUrlParams";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { useXcmParameters } from "@/hooks/useXcmParameters";
import { AccountData } from "@/store/AccountStore";
import { DialogMode, EstimatedCostInfo, IdentityFormRef, OpenTxDialogArgs, OpenTxDialogArgs_modeSet, SignSubmitAndWatchParams, TxStateUpdate } from "@/types";
import { ApiStorage, ApiTx } from "@/types/api";
import { Identity, IdentityInfo, verifyStatuses } from "@/types/Identity";
import { wait } from "@/utils";
import { errorMessages } from "@/utils/errorMessages";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { ChainId } from "@reactive-dot/core";
import { ChainDescriptorOf, Chains } from "@reactive-dot/core/internal.js";
import { ChainProvider, ReactiveDotProvider, useClient, useSpendableBalance, useTypedApi } from "@reactive-dot/react";
import { HexString, InvalidTxError, SS58String, TypedApi } from "polkadot-api";
import { createContext, memo, ReactNode, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useProxy } from "valtio/utils";
import { Network, useNetwork } from "./network-context";

import { accountStore as _accountStore } from "@/store/AccountStore";
import { chainStore as _chainStore, ChainInfo } from "@/store/ChainStore";

import { ChallengeStore as _challengeStore, ChallengeStore } from "@/store/challengesStore";
import BigNumber from "bignumber.js";
import { CHAINS, createChainClient, getTypedApi, cleanupConnection, cleanupAllConnections } from "@/polkadot-api/chain-config";
import { ApiPromise, WsProvider } from '@polkadot/api';

// Define the missing type based on the usage in useXcmParameters
type GetTeleportCallParams = {
  amount: BigNumber;
};

// Context interface definition
interface PolkadotApiContextType {
  // Alerts
  alerts: any[];
  addAlert: (alert: any) => void;
  removeAlert: (key: string) => void;
  clearAllAlerts: () => void;
  alertsCount: number;

  // Dark mode
  isDark: boolean;
  setDark: (dark: boolean) => void;

  // Stores
  chainStore: ChainInfo;
  accountStore: AccountData;

  // APIs
  typedApi: ApiPromise | undefined;
  fromTypedApi: ApiPromise | null;

  // URL params
  urlParams: UrlParamsArgs;
  updateUrlParams: (params: UrlParamsArgs) => void;

  // Wallet
  walletDialogOpen: boolean;
  setWalletDialogOpen: (open: boolean) => void;
  accounts: AccountData[];
  getWalletAccount: (address: Uint8Array | string) => any;
  connectedWallets: any[];
  disconnectAllWallets: () => void;

  // Account management
  updateAccount: (account: AccountData) => void;
  onAccountSelect: (accountAction: { type: string, account: AccountData }) => Promise<void>;
  onRequestWalletConnection: () => void;

  // Identity
  identityFormRef: React.RefObject<IdentityFormRef>;
  registrarIndex: number;
  supportedFields: (keyof IdentityInfo)[];
  identity: Identity;
  fetchIdAndJudgement: () => Promise<Identity>;
  prepareClearIdentityTx: () => any;
  onIdentityClear: () => Promise<void>;

  // Chain
  chainClient: any;
  onChainSelect: (chainId: string | number | symbol) => void;
  chainConstants: any;

  // Challenges
  challenges: ChallengeStore;
  challengeError: string | null;
  isChallengeWsConnected: boolean;
  challengeLoading: boolean;
  subscribeToChallenges: () => void;
  sendPGPVerification: any;

  // Formatting
  formatAmount: (amount: any) => string;

  // Transactions
  isTxBusy: boolean;
  signSubmitAndWatch: (params: SignSubmitAndWatchParams) => Promise<TxStateUpdate>;
  submitTransaction: () => Promise<void>;

  // Dialogs
  openDialog: DialogMode | null;
  setOpenDialog: (mode: DialogMode | null) => void;
  openTxDialog: (args: OpenTxDialogArgs) => void;
  closeTxDialog: () => void;
  handleOpenChange: (nextState: boolean) => void;

  // Cost estimations
  estimatedCosts: EstimatedCostInfo;
  setEstimatedCosts: (costs: EstimatedCostInfo) => void;

  // XCM
  xcmParams: any;
  relayAndParachains: any;
  getTeleportCall: (params: GetTeleportCallParams) => any;
  getParachainId: (api: any) => Promise<number | null>;
  teleportExpanded: boolean;
  setTeleportExpanded: (expanded: boolean) => void;
  parachainId: number | undefined;

  // Balances
  fromBalance: BigNumber;
  balance: BigNumber;
  hasEnoughBalance: boolean | null;
  minimunTeleportAmount: BigNumber;

  // Transaction confirmation
  txToConfirm: ApiTx | null;
  setTxToConfirm: (tx: ApiTx | null) => void;

  // Account tree
  accountTree: any;
  accountTreeLoading: boolean;
  refreshAccountTree: () => void;

  // Error details
  errorDetails: Error | null;
  setErrorDetails: (error: Error | null) => void;

  connect: (network: Network) => void;
  isConnected: boolean;
}

const PolkadotApiContext = createContext<PolkadotApiContextType | null>(null);

// Custom hook to use the context
export const usePolkadotApi = () => {
  const context = useContext(PolkadotApiContext);
  if (!context) {
    throw new Error('usePolkadotApi must be used within a PolkadotApiProvider');
  }
  return context;
};

interface PolkadotApiProviderProps {
  children: ReactNode;
}

export const PolkadotApiProvider = ({ children }: PolkadotApiProviderProps) => {
  // State
  const [client, setClient] = useState<WsProvider | null>(null);
  const [typedApi, setTypedApi] = useState<ApiPromise | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentChain, setCurrentChain] = useState<keyof typeof CHAINS | null>(null);
  const [chainInfo, setChainInfo] = useState<any>(null);

  // Add refs to track cleanup and debouncing
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentProviderRef = useRef<WsProvider | null>(null);
  const currentApiRef = useRef<ApiPromise | null>(null);

  const {
    alerts, add: addAlert, remove: removeAlert, clearAll: clearAllAlerts, size: alertsCount
  } = useAlerts();
  const { isDark, setDark } = useDarkMode()

  const chainStore = useProxy(_chainStore);
  const accountStore = useProxy(_accountStore);

  const { urlParams, updateUrlParams } = useUrlParams()

  const [walletDialogOpen, setWalletDialogOpen] = useState(false);

  // Use our clean wallet accounts hook
  const {
    accounts: displayedAccounts,
    getWalletAccount,
    connectedWallets,
    disconnectAllWallets
  } = useWalletAccounts({
    chainSs58Format: chainStore.ss58Format
  });

  // UI-specific account handling
  useEffect(() => {
    addAlert({
      type: "error",
      message: "Please connect a wallet so that you can choose an account and continue.",
      closable: false,
      key: "noConnectedWallets",
    })
    if (connectedWallets.length) removeAlert("noConnectedWallets");
  }, [connectedWallets.length, addAlert, removeAlert]);

  useEffect(() => {
    if (!urlParams.address) return;
    let decodedAddress: Uint8Array;
    try {
      decodedAddress = decodeAddress(urlParams.address);
    } catch (error) {
      console.error("Error decoding address:", error);
      addAlert({
        type: "error",
        message: "Invalid address format. Please check the address and try again.",
        closable: false,
        key: "invalidAddress",
      })
      return;
    }
    const accountData = getWalletAccount(decodedAddress)
      ?? ([1, 2, 4, 8, 32, 33].includes(decodedAddress.length)
        ? {
          address: urlParams.address,
          encodedAddress: encodeAddress(decodedAddress, chainStore.ss58Format),
        }
        : null
      )
      ;
    console.log({ accountData });
    if (accountData) {
      // Clear accountStore first to ensure props missing in accountData aren't kept
      Object.keys(accountStore).forEach(key => {
        delete accountStore[key];
      });
      Object.assign(accountStore, accountData);

      removeAlert("invalidAddress");
    }
    // ESLint Expects us to add accountStore as a dependency, but it will cause an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountStore.polkadotSigner, urlParams.address, getWalletAccount, addAlert, removeAlert, chainStore.ss58Format]);

  const updateAccount = useCallback(({ name, address, polkadotSigner }: AccountData) => {
    const account = { name, address, polkadotSigner };
    console.log({ account });
    Object.assign(accountStore, account);
    updateUrlParams({ ...urlParams, address });
  }, [accountStore, urlParams, updateUrlParams]);

  //#region identity
  const identityFormRef = useRef<IdentityFormRef>()

  const _formattedChainId = (chainStore.name as string)?.split(' ')[0]?.toUpperCase()
  const registrarIndex = import.meta.env[`VITE_APP_REGISTRAR_INDEX__PEOPLE_${_formattedChainId}`] as number

  // Make sure to clear anything else that might change according to the chain or account
  useEffect(clearAllAlerts, [chainStore.id, accountStore.address, clearAllAlerts])

  // Use the new hook for supported fields
  const supportedFields = useSupportedFields({ typedApi, registrarIndex, });

  // Use the hook for core identity functionality
  const {
    identity, fetchIdAndJudgement, prepareClearIdentityTx,
  } = useIdentity({ typedApi, address: accountStore.address, });
  useEffect(() => {
    identityFormRef.current?.reset()
  }, [identity])

  useEffect(() => {
    if (!typedApi) return;

    ((async () => {
      const id = chainStore.id;

      let chainProperties
      try {
        chainProperties = (await typedApi.rpc.system.properties()).toHuman()
        if (chainProperties) {
          chainProperties = {
            ...chainProperties,
            ss58Format: Number(chainProperties.ss58Format || 0),
            tokenDecimals: Number(chainProperties.tokenDecimals[0] || 0),
            tokenSymbol: chainProperties.tokenSymbol[0] || '',
          }
        }
        console.log({ id, chainProperties })
      } catch {
        console.error({ id, })
      }
      const relayId = id.split("_")[0];
      const newChainData = {
        name: CHAINS[id as keyof typeof CHAINS].name,
        registrarIndex: registrarIndex,
        relay: {
          id: relayId,
          name: CHAINS[relayId as keyof typeof CHAINS].name,
          parachains: Object.entries(CHAINS)
            .filter(([key]) => key.startsWith(relayId) && key !== relayId)
            .map(([key, value]) => ({ id: key, name: value.name, paraId: value.paraId }))
          ,
        },
        ...chainProperties,
      }
      Object.assign(chainStore, newChainData)
      console.log({ id, newChainData })
    })())
  }, [chainStore])
  const onChainSelect = useCallback((chainId: string | number | symbol) => {
    updateUrlParams({ ...urlParams, chain: chainId as string })
    chainStore.id = chainId
  }, [chainStore, updateUrlParams, urlParams])

  const eventHandlers = useMemo<Record<string, {
    onEvent: (data: object) => void;
    onError?: (error: Error) => void;
    priority: number
  }>>(() => ({
    "Identity.JudgementGiven": {
      onEvent: async (_data: object) => {
        const newIdentity = await fetchIdAndJudgement()
        if (newIdentity?.status === verifyStatuses.IdentityVerified) {
          addAlert({
            type: "info",
            message: "Judgement Given! Identity verified successfully. Congratulations!",
          })
        } else {
          addAlert({
            type: "error",
            message: "Judgement Given! Identity not verified. Please remove it and try again.",
          })
        }
      },
      onError: (_error: Error) => { },
      priority: 4,
    },
  }), [fetchIdAndJudgement, addAlert])

  const { constants: chainConstants } = useChainRealTimeInfo({
    typedApi,
    chainId: chainStore.id,
    address: accountStore.encodedAddress,
    handlers: eventHandlers,
  })
  //#endregion chains

  //#region challenges
  const { challenges,
    error: challengeError,
    isConnected: isChallengeWsConnected,
    loading: challengeLoading,
    subscribe: subscribeToChallenges,
    sendPGPVerification,
  } = useChallengeWebSocket({
    url: import.meta.env.VITE_APP_CHALLENGES_API_URL as string,
    address: accountStore.encodedAddress,
    network: (chainStore.id as string).split("_")[0],
    identity: { info: identity.info, status: identity.status, },
  });
  useEffect(() => {
    console.debug({
      challenges, challengeError, isChallengeWsConnected, challengeLoading,
    });
  }, [challenges, challengeError, isChallengeWsConnected, challengeLoading]);

  useEffect(() => {
    if (isChallengeWsConnected && identity.status === verifyStatuses.FeePaid) {
      subscribeToChallenges()
    }
    // Don't add suggested deps, as this somehow causes an infinite loop. Don't ask me why :D
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChallengeWsConnected])
  //#endregion challenges

  const formatAmount = useFormatAmount({
    tokenDecimals: chainStore.tokenDecimals,
    symbol: chainStore.tokenSymbol
  });

  const [isTxBusy, setTxBusy] = useState(false)
  useEffect(() => {
    console.log({ isTxBusy })
  }, [isTxBusy])

  //#region Transactions
  const getNonce = useCallback(async (api: ApiPromise, address: SS58String) => {
    try {
      return (await (api.query.System.Account as ApiStorage).getValue(address, { at: "best" })).nonce
    } catch (error) {
      console.error(error)
      return null
    }
  }, [])

  const [errorDetails, setErrorDetails] = useState<Error | null>(null)
  useEffect(() => {
    if (errorDetails) {
      setOpenDialog("errorDetails")
    }
  }, [errorDetails])

  // Keep hashes of recent notifications to prevent duplicates, as a transaction might produce 
  //  multiple notifications
  const recentNotifsIds = useRef<string[]>([])
  // TODO Might need to be refactored as per new logic to access chains
  const signSubmitAndWatch = useCallback((
    params: SignSubmitAndWatchParams
    // Awaiting for async function, so ignore this rule
    // eslint-disable-next-line no-async-promise-executor
  ) => new Promise(async (
    resolve: (txStateUpdate: TxStateUpdate) => void,
    reject: (err: Error) => void
  ) => {
    const { call, name } = params;
    let api = params.api;

    console.log({ call: call.decodedCall, signSubmitAndWatchParams: params })

    if (!api) {
      api = typedApi
    }
    if (isTxBusy) {
      reject(new Error("Transaction already in progress"))
      addAlert({
        type: "error",
        message: "There is a transaction already in progress. Please wait for it to finish.",
      })
      return
    }
    setTxBusy(true)

    const nonce = params.nonce ?? await getNonce(api, accountStore.address)
    console.log({ nonce });
    if (nonce === null) {
      setTxBusy(false)
      addAlert({
        type: "error",
        message: "Unable to prepare transaction. Please try again in a moment.",
      })
      console.error("Failed to get nonce")
      reject(new Error("Failed to get nonce"))
      return
    }

    const signer = params.signer ?? accountStore.polkadotSigner
    const signedCall = call.signSubmitAndWatch(signer,
      { at: "best", nonce: nonce }
    )
    let txHash: HexString | null = null

    const disposeSubscription = (callback?: () => void) => {
      setTxBusy(false)
      if (txHash) {
        recentNotifsIds.current = recentNotifsIds.current.filter(id => id !== txHash)
      }
      if (!subscription.closed)
        subscription.unsubscribe();
      callback?.()
    }

    const subscription = signedCall.subscribe({
      next: (txStateUpdate) => {
        txHash = txStateUpdate.txHash;
        // TODO Add result type as below
        // Define type for transaction state updates

        const _txStateUpdate: TxStateUpdate = {
          found: txStateUpdate["found"] || false,
          ok: txStateUpdate["ok"] || false,
          isValid: txStateUpdate["isValid"],
          ...txStateUpdate,
        };
        if (txStateUpdate.type === "broadcasted") {
          addAlert({
            key: txStateUpdate.txHash,
            type: "loading",
            closable: false,
            message: `${name} transaction broadcasted`,
          })
        }
        else if (_txStateUpdate.type === "txBestBlocksState") {
          if (_txStateUpdate.ok) {
            if (params.awaitFinalization) {
              addAlert({
                key: _txStateUpdate.txHash,
                type: "loading",
                message: `Waiting for ${name.toLowerCase()} to finalize...`,
                closable: false,
              })
            } else {
              addAlert({
                key: _txStateUpdate.txHash,
                type: "success",
                message: `${name} completed successfully`,
              })
              fetchIdAndJudgement()
              disposeSubscription(() => resolve(txStateUpdate))
            }
          } else if (!_txStateUpdate.isValid) {
            if (!recentNotifsIds.current.includes(txHash)) {
              recentNotifsIds.current = [...recentNotifsIds.current, txHash]
              addAlert({
                key: _txStateUpdate.txHash,
                type: "error",
                message: `${name} failed: invalid transaction`,
              })
              fetchIdAndJudgement()
              disposeSubscription(() => reject(new Error("Invalid transaction")))
            }
          }
        }
        else if (_txStateUpdate.type === "finalized") {
          // Tx need only be processed successfully. If Ok, it's already been found in best blocks.
          if (!_txStateUpdate.ok) {
            addAlert({
              key: _txStateUpdate.txHash,
              type: "error",
              message: `${name} failed`,
            })
            fetchIdAndJudgement()
            disposeSubscription(() => reject(new Error("Transaction failed")))
          } else {
            if (params.awaitFinalization) {
              addAlert({
                key: _txStateUpdate.txHash,
                type: "success",
                message: `${name} completed successfully`,
              })
              fetchIdAndJudgement()
              disposeSubscription(() => resolve(txStateUpdate))
            }
          }
        }
        console.log({ _txStateUpdate, recentNotifsIds: recentNotifsIds.current })
      },
      error: (error) => {
        console.error(error);
        if (error.message === "Cancelled") {
          console.log("Cancelled");
          addAlert({
            type: "error",
            message: `${name} transaction didn't get signed. Please sign it and try again`,
          })
          disposeSubscription()
          return
        }
        // TODO Handle other errors
        if (!recentNotifsIds.current.includes(txHash)) {
          if (error instanceof InvalidTxError || error.invalid) {
            const errorDetails: {
              type: string,
              value: {
                type: string,
                value: {
                  type: string,
                  value: string,
                },
              },
            } = JSON.parse(error.message);

            const { type: pallet, value: { type: errorType } } = errorDetails;

            console.log({ errorDetails });
            addAlert({
              type: "error",
              message: errorMessages[pallet]?.[errorType] ?? errorMessages[pallet]?.default
                ?? `Error with ${name}: Please try again`
              ,
              seeDetails: () => setErrorDetails(error),
            })
            disposeSubscription(() => reject(error))
            return
          }
          addAlert({
            type: "error",
            message: `Error with ${name}: ${error.message || "Please try again"}`,
          })
          disposeSubscription(() => reject(error))
        }
      },
      complete: () => {
        console.log("Completed")
        disposeSubscription()
      }
    })
    // Still, proposed deps remain inmutable, such as AddAlert and getNonce
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [accountStore.polkadotSigner, accountStore.address, isTxBusy, fetchIdAndJudgement, typedApi,])
  //#endregion Transactions

  const onIdentityClear = useCallback(async () => {
    await signSubmitAndWatch({
      call: prepareClearIdentityTx(),
      name: "Clear Identity"
    })
  }, [prepareClearIdentityTx, signSubmitAndWatch])

  const [openDialog, setOpenDialog] = useState<DialogMode>(null)

  //#region CostExtimations
  const [estimatedCosts, setEstimatedCosts] = useState<EstimatedCostInfo>({})
  //#endregion CostExtimations

  // Use our new hook for XCM parameters
  const {
    xcmParams,
    relayAndParachains,
    fromTypedApi,
    getTeleportCall: _getTeleportCall,
    getParachainId,
    teleportExpanded,
    setTeleportExpanded
  } = useXcmParameters({
    chainId: chainStore.id,
    estimatedCosts
  });

  const [parachainId, setParachainId] = useState<number>()
  const getTeleportCall = useCallback(({
    amount
  }: {
    amount: BigNumber
  }) => {
    return _getTeleportCall({
      amount,
      fromApi: fromTypedApi,
      parachainId,
      toAddress: accountStore.polkadotSigner,
    })
  }, [_getTeleportCall, fromTypedApi, parachainId, displayedAccounts])

  useEffect(() => {
    if (typedApi) {
      getParachainId(typedApi).then(id => {
        if (id !== null) {
          setParachainId(id)
        }
      })
    }
  }, [typedApi, getParachainId])

  //#region Balances
  // TODO Init when needed
  const genericAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY" as SS58String // Alice
  const fromBalance = BigNumber(0)
  const balance = BigNumber(0)
  //#endregion Balances

  const [txToConfirm, setTxToConfirm] = useState<ApiTx | null>(null)

  const hasEnoughBalance = useMemo(() => (balance && chainConstants) && balance
    .isGreaterThanOrEqualTo(xcmParams.txTotalCost
      .plus(chainConstants.existentialDeposit?.toString())
    ), [balance, chainConstants, xcmParams.txTotalCost])
  const minimunTeleportAmount = useMemo(() => {
    const calculatedTeleportAmount = xcmParams.txTotalCost.times(1.1)
    return hasEnoughBalance ? calculatedTeleportAmount
      : calculatedTeleportAmount.plus((chainConstants?.existentialDeposit || 10n)?.toString())
  }, [xcmParams.txTotalCost, hasEnoughBalance, chainConstants])

  const balanceRef = useRef(balance)
  useEffect(() => {
    balanceRef.current = balance
  }, [balance])
  const submitTransaction = async () => {
    if (xcmParams.enabled) {
      try {
        await signSubmitAndWatch({
          nonce: await getNonce(fromTypedApi, xcmParams.fromAddress),
          signer: getWalletAccount(xcmParams.fromAddress).polkadotSigner,
          awaitFinalization: true,
          call: getTeleportCall({
            amount: minimunTeleportAmount.integerValue(BigNumber.ROUND_UP),
            fromApi: fromTypedApi,
            signer: getWalletAccount(xcmParams.fromAddress).polkadotSigner,
            parachainId
          }),
          name: "Teleport Assets"
        })
      } catch (error) {
        console.error(error)
        addAlert({
          type: "error",
          message: "Error teleporting assets. Please try again.",
        })
        return
      }

      const maxBlocksAwait = 10
      let awaitedBlocks;
      for (awaitedBlocks = 0; awaitedBlocks < maxBlocksAwait; awaitedBlocks++) {
        await wait(CHAIN_UPDATE_INTERVAL)
        console.log({ awaitedBlocks })
        if (balanceRef.current.isGreaterThanOrEqualTo(xcmParams.txTotalCost
          .plus(chainConstants.existentialDeposit?.toString())
        )) {
          break
        }
        addAlert({
          key: "awaitingAssets",
          type: "loading",
          message: "Waiting to receive transferred amount...",
          closable: false,
        })
      }
      removeAlert("awaitingAssets")
      if (awaitedBlocks === maxBlocksAwait) {
        addAlert({
          type: "error",
          message: "Balance insufficient. It's not possible to set identity.",
        })
        return
      }
    }

    switch (openDialog) {
      case "clearIdentity":
        await onIdentityClear()
        break
      case "setIdentity":
        await signSubmitAndWatch({
          call: txToConfirm,
          name: "Set Identity"
        })
        break
      case "requestJudgement":
        await signSubmitAndWatch({
          call: txToConfirm,
          name: "Request Judgement"
        })
        break
      case "addSubaccount":
        await signSubmitAndWatch({
          call: txToConfirm,
          name: "Add Subaccount"
        })
        refreshAccountTree(); // Refresh accounts tree after adding subaccount
        break;
      case "removeSubaccount":
        await signSubmitAndWatch({
          call: txToConfirm,
          name: "Remove Subaccount"
        })
        refreshAccountTree(); // Refresh accounts tree after removing subaccount
        break;
      case "quitSub":
        await signSubmitAndWatch({
          call: txToConfirm,
          name: "Quit Subaccount"
        })
        refreshAccountTree(); // Refresh accounts tree after quitting subaccount
        break;
      case "editSubAccount":
        await signSubmitAndWatch({
          call: txToConfirm,
          name: "Edit Subaccount"
        })
        refreshAccountTree(); // Refresh accounts tree after editing subaccount
        break;
      default:
        console.error("Unexpected openDialog value:", openDialog);
        await signSubmitAndWatch({
          call: txToConfirm,
          name: "Unknown Transaction"
        })
        break;
    }
    closeTxDialog()
  }

  const {
    accountTree,
    loading: accountTreeLoading,
    refresh: refreshAccountTree,
  } = useAccountsTree({
    address: accountStore.encodedAddress,
    api: typedApi,
  })

  const openTxDialog = useCallback((args: OpenTxDialogArgs) => {
    console.log({ args })
    if (args.mode) {
      setOpenDialog(args.mode)
      setEstimatedCosts((args as OpenTxDialogArgs_modeSet).estimatedCosts)
      setTxToConfirm((args as OpenTxDialogArgs_modeSet).tx)
    } else {
      setOpenDialog(null)
      setEstimatedCosts({})
      setTxToConfirm(null)
      xcmParams.enabled = false
    }
  }, [xcmParams])
  const closeTxDialog = useCallback(() => openTxDialog({ mode: null }), [openTxDialog])

  const handleOpenChange = useCallback((nextState: boolean): void => {
    setOpenDialog(previousState => nextState ? previousState : null)
  }, [])

  const onAccountSelect = useCallback(async (accountAction: { type: string, account: AccountData }) => {
    console.log({ newValue: accountAction })
    switch (accountAction.type) {
      case "Wallets":
        setWalletDialogOpen(true);
        break;
      case "Disconnect":
        disconnectAllWallets();
        Object.keys(accountStore).forEach((k) => delete accountStore[k]);
        break;
      case "Teleport":
        setOpenDialog("teleport")
        break;
      case "RemoveIdentity": {
        const tx = prepareClearIdentityTx()
        openTxDialog({
          mode: "clearIdentity",
          tx: tx,
          estimatedCosts: {
            fees: await tx.getEstimatedFees(accountStore.address, { at: "best" }),
          },
        })
        break;
      }
      case "account":
        updateAccount({ ...accountAction.account });
        break;
      default:
        console.log({ accountAction })
        throw new Error("Invalid action type");
    }
  }, [updateAccount, prepareClearIdentityTx, openTxDialog, accountStore, disconnectAllWallets])

  const onRequestWalletConnection = useCallback(() => setWalletDialogOpen(true), [])
  //#endregion Hooks

  // Connect to a specific chain
  const connect = useCallback(async (chainId: keyof typeof CHAINS) => {
    if (isConnecting) return;
    if (currentChain === chainId && isConnected) return; // Already connected to this chain

    console.debug("Connecting to chain:", chainId);

    // Clear any existing timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Disconnect from previous chain if different
      if (currentChain && currentChain !== chainId) {
        await disconnect();
      }

      // Create new client and typed API (using cached connections)
      const newProvider = createChainClient(chainId);
      const newTypedApi = await getTypedApi(chainId, newProvider);

      // Store refs for cleanup
      currentProviderRef.current = newProvider;
      currentApiRef.current = newTypedApi;

      const currentBlock = (await newTypedApi.rpc.chain.getFinalizedHead()).toHuman();
      console.debug("Current block:", currentBlock);

      // Set up the client and typed API
      setClient(newProvider);
      setTypedApi(newTypedApi);
      setCurrentChain(chainId);
      setIsConnected(true);

    } catch (err) {
      console.error("Connection error:", err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setClient(null);
      setTypedApi(null);
      setCurrentChain(null);
      setIsConnected(false);

      // Clean up refs on error
      currentProviderRef.current = null;
      currentApiRef.current = null;
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, currentChain, isConnected]);

  // Disconnect
  const disconnect = useCallback(async () => {
    // Clear any pending connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    // Clean up using the central cleanup function
    if (currentChain) {
      await cleanupConnection(currentChain);
    }

    // Clean up refs
    currentApiRef.current = null;
    currentProviderRef.current = null;

    setClient(null);
    setTypedApi(null);
    setCurrentChain(null);
    setChainInfo(null);
    setIsConnected(false);
    setError(null);
  }, [currentChain]);

  // Switch chain
  const switchChain = useCallback(async (chainId: keyof typeof CHAINS) => {
    await connect(chainId);
  }, [connect]);

  const network = chainStore.id;
  // Auto-connect on network change with debouncing
  useEffect(() => {
    if (isConnected || isConnecting) return;
    if (!network || network === currentChain) return;
    if (!(network in CHAINS)) return;

    // Clear existing timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }

    // Debounce connection attempts
    connectionTimeoutRef.current = setTimeout(() => {
      connect(network as keyof typeof CHAINS);
    }, 300); // 300ms debounce

    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };
  }, [network, currentChain, connect, isConnected, isConnecting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup all connections when the provider unmounts
      cleanupAllConnections().catch(console.warn);
    };
  }, []);

  const value = useMemo(() => ({
    alerts, addAlert, removeAlert, clearAllAlerts, alertsCount,
    isDark, setDark,
    chainStore, accountStore,
    typedApi, fromTypedApi,
    urlParams, updateUrlParams,
    walletDialogOpen, setWalletDialogOpen,
    accounts: displayedAccounts, getWalletAccount, connectedWallets, disconnectAllWallets,
    updateAccount, onAccountSelect, onRequestWalletConnection,
    identityFormRef, registrarIndex, supportedFields, identity, fetchIdAndJudgement, prepareClearIdentityTx, onIdentityClear,
    chainClient: client,
    onChainSelect, chainConstants,
    challenges, challengeError, isChallengeWsConnected, challengeLoading, subscribeToChallenges, sendPGPVerification,
    formatAmount,
    isTxBusy, signSubmitAndWatch, submitTransaction,
    openDialog, setOpenDialog, openTxDialog, closeTxDialog, handleOpenChange,
    estimatedCosts, setEstimatedCosts,
    xcmParams, relayAndParachains, getTeleportCall, getParachainId, teleportExpanded, setTeleportExpanded, parachainId,
    fromBalance, balance, hasEnoughBalance, minimunTeleportAmount,
    txToConfirm, setTxToConfirm,
    accountTree, accountTreeLoading, refreshAccountTree,
    errorDetails, setErrorDetails,
    client,
    isConnected,
    isConnecting,
    error,
    currentChain,
    chainInfo,
    connect,
    disconnect,
    switchChain,
  }), [
    alerts, addAlert, removeAlert, clearAllAlerts, alertsCount,
    isDark, setDark,
    chainStore, accountStore,
    typedApi, fromTypedApi,
    urlParams, updateUrlParams,
    walletDialogOpen,
    displayedAccounts, getWalletAccount, connectedWallets, disconnectAllWallets,
    updateAccount, onAccountSelect, onRequestWalletConnection,
    registrarIndex, supportedFields, identity, fetchIdAndJudgement, prepareClearIdentityTx, onIdentityClear,
    onChainSelect, chainConstants,
    challenges, challengeError, isChallengeWsConnected, challengeLoading, subscribeToChallenges, sendPGPVerification,
    formatAmount,
    isTxBusy, signSubmitAndWatch, submitTransaction,
    openDialog, openTxDialog, closeTxDialog, handleOpenChange,
    estimatedCosts,
    xcmParams, relayAndParachains, getTeleportCall, getParachainId, teleportExpanded, setTeleportExpanded, parachainId,
    fromBalance, balance, hasEnoughBalance, minimunTeleportAmount,
    txToConfirm,
    accountTree, accountTreeLoading, refreshAccountTree,
    errorDetails,
    client,
    isConnected,
    isConnecting,
    error,
    currentChain,
    chainInfo,
    connect,
    disconnect,
    switchChain,
  ]);

  return (
    <PolkadotApiContext.Provider value={value}>
      {children}
    </PolkadotApiContext.Provider>
  );
};
