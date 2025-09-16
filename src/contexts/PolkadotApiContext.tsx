import { useAccountsTree } from "@/hooks/UseAccountsTree";
import { useAlerts } from "@/hooks/useAlerts";
import { ChainConstants, useChainRealTimeInfo } from "@/hooks/useChainRealTimeInfo";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useFormatAmount } from "@/hooks/useFormatAmount";
import { useIdentity } from "@/hooks/useIdentity";
import { useSupportedFields } from "@/hooks/useSupportedFields";
import { UrlParamsArgs, useUrlParams } from "@/hooks/useUrlParams";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { useXcmParameters } from "@/hooks/useXcmParameters";
import { AccountData } from "@/store/AccountStore";
import { DialogMode, EstimatedCostInfo, IdentityFormRef, OpenTxDialogArgs, OpenTxDialogArgs_modeSet, SignSubmitAndWatchParams, TxStateUpdate } from "@/types";
import { ApiTx } from "@/types/api";
import { Identity, IdentityVerificationStatus } from "@/types/Identity";
import { wait } from "@/utils";
import { errorMessages } from "@/utils/errorMessages";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { InvalidTxError, SS58String } from "polkadot-api";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useProxy } from "valtio/utils";
import { Network } from "./network-context";

import { accountStore as _accountStore } from "@/store/AccountStore";
import { chainStore as _chainStore, ChainInfo } from "@/store/ChainStore";

import { useSystemAccountData } from "@/hooks/use-system-account-data";
import { CHAINS, cleanupAllConnections, cleanupConnection, createChainClient, getTypedApi } from "@/polkadot-api/chain-config";
import { ChallengeStore as _challengeStore, ChallengeStore } from "@/store/challengesStore";
import { ApiPromise, WsProvider } from '@polkadot/api';
import BigNumber from "bignumber.js";
import { usePolkadotWallet } from "./PolkadotWalletContext";

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
  identityFormRef: React.RefObject<IdentityFormRef | null>;
  registrarIndex: number;
  supportedFields: string[];
  identity: Identity;
  fetchIdAndJudgement: () => Promise<Identity | null>;
  prepareClearIdentityTx: () => any;
  onIdentityClear: () => Promise<void>;

  // Chain
  chainClient: any;
  onChainSelect: (chainId: string | number | symbol) => void;
  chainConstants: ChainConstants | null;

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

const CHAIN_UPDATE_INTERVAL = 6000

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

  const { getSignerForAddress } = usePolkadotWallet();

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
  }, [
    accountStore.address,
    urlParams.address,
    getWalletAccount,
    addAlert,
    removeAlert,
    chainStore.ss58Format
  ]);

  const updateAccount = useCallback(({ name, address }: Pick<AccountData, 'name' | 'address'>) => {
    const account = { name, address };
    console.log({ account });
    Object.assign(accountStore, account);
    updateUrlParams({ ...urlParams, address });
  }, [accountStore, urlParams, updateUrlParams]);

  //#region identity
  const identityFormRef = useRef<IdentityFormRef>(null)

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
      console.log({ id, newChainData });
    })())
  }, [chainStore.id, typedApi]);

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
        if (newIdentity?.status === IdentityVerificationStatus.IdentityVerified) {
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
  // Stub WebSocket variables, as useChallengeWebSocket is no longer used here
  const challenges = {};
  const challengeError = null;
  const challengeLoading = false;
  const isChallengeWsConnected = false;
  const subscribeToChallenges = () => { };
  const sendPGPVerification = () => { };
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
      const accountInfo = await api.query.system.account(address);
      return (accountInfo as any).nonce.toNumber();
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
    let api = params.api || null;

    console.log({ call: call.toHuman(), signSubmitAndWatchParams: params })

    if (!api) {
      api = typedApi
    }
    // Validate API availability
    if (!api) {
      const error = new Error("No API connection available")
      reject(error)
      addAlert({
        type: "error",
        message: "Connection to blockchain network is not available. Please try again.",
      })
      return
    }

    // Prevent concurrent transactions
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

    const signer = params.signer ?? await getSignerForAddress(accountStore.address);
    if (!signer) {
      setTxBusy(false);
      addAlert({
        type: "error",
        message: "No signer available for the selected account",
      });
      reject(new Error("No signer available"));
      return;
    }

    let txHash = call.hash.toHex();
    recentNotifsIds.current = [...recentNotifsIds.current, txHash]
      .slice(-10); // Keep only the last 10 hashes
    let unsubscribe: (() => void) | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const disposeSubscription = (callback: () => void) => {
      if (!callback || typeof callback !== 'function') {
        throw new Error("Callback must be a function");
      }
      setTxBusy(false)
      if (txHash) {
        recentNotifsIds.current = recentNotifsIds.current.filter(id => id !== txHash)
      }
      if (unsubscribe) {
        unsubscribe();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      callback?.()
    }
    const dispatchFail = (error: Error, alertMessage: string) => {
      disposeSubscription(() => {
        recentNotifsIds.current = recentNotifsIds.current.filter(id => id !== txHash)
        addAlert({
          key: txHash,
          type: "error",
          message: alertMessage,
        })
        reject(error)
      })
    }
    const dispatchSuccess = (message: string) => {
      disposeSubscription(() => {
        recentNotifsIds.current = recentNotifsIds.current.filter(id => id !== txHash)
        addAlert({
          key: txHash,
          type: "success",
          message,
        })
        resolve({
          txHash,
          found: true,
          ok: true,
          isValid: true,
          type: "txBestBlocksState",
        })
      })
    }
    const alertLoading = (message: string) => {
      addAlert({
        key: txHash,
        type: "loading",
        message,
        closable: false,
      })
    }

    const checkTxFail = (result: any) => {
      // Check for system events to determine success/failure
      const { events } = result;
      let hasError = false;
      let errorInfo: string | null = null;

      // Look for system.ExtrinsicFailed or system.ExtrinsicSuccess
      events.some(({ event }: any) => {
        if (api && api.events.system.ExtrinsicFailed.is(event)) {
          hasError = true;
          const [dispatchError] = event.data;
          try {
            if (dispatchError && typeof dispatchError === 'object' && 'isModule' in dispatchError && dispatchError.isModule) {
              const decoded = api.registry.findMetaError((dispatchError as any).asModule);
              errorInfo = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
              // Enhanced logging for debugging
              console.error(`Module error in ${name}:`, {
                section: decoded.section,
                name: decoded.name,
                docs: decoded.docs,
                dispatchError,
                txHash
              });
            } else {
              errorInfo = dispatchError?.toString() || 'Unknown error';
              console.error(`Non-module error in ${name}:`, { dispatchError, txHash });
            }
          } catch (e) {
            errorInfo = 'Error parsing transaction failure details';
            console.error(`Error parsing failure details for ${name}:`, { e, dispatchError, txHash });
          }
        }
        return hasError; // Stop if we found an error
      });

      return errorInfo
    }

    try {
      // Set a timeout to prevent hanging transactions (5 minutes)
      timeoutId = setTimeout(() => {
        dispatchFail(
          new Error("Transaction timeout"),
          `${name} transaction timed out. The transaction may still be processing on the blockchain.`
        );
      }, 5 * 60 * 1000);
      // TODO Set Transaction mortality so it's invalid if not signed in time

      unsubscribe = await call.signAndSend(accountStore.address, {
        nonce: nonce,
        signer: signer,
      }, (result) => {
        console.log("Transaction result:", result);

        // Handle different transaction states
        if (result.status.isBroadcast) {
          console.log(`Transaction ${txHash} broadcasted`);
          alertLoading(`${name} transaction sent...`);
        }

        else if (result.status.isInBlock) {
          console.log(`Transaction ${txHash} included in block`);

          const errorInfo = checkTxFail(result)
          if (errorInfo) {
            return dispatchFail(new Error(errorInfo), `${name} failed: ${errorInfo}`);
          } else {
            // Transaction succeeded
            if (params.awaitFinalization) {
              console.log(`Transaction ${txHash} is waiting for finalization`);
              alertLoading(`Waiting for ${name.toLowerCase()} to finalize...`);
            } else {
              console.log(`Transaction ${txHash} completed successfully`);
              return dispatchSuccess(`${name} completed successfully`);
            }
          }
        }

        else if (result.status.isFinalized) {
          console.log(`Transaction ${txHash} finalized`);

          if (params.awaitFinalization) {
            const errorInfo = checkTxFail(result)
            if (errorInfo) {
              return dispatchFail(new Error(errorInfo), `${name} failed: ${errorInfo}`);
            } else {
              return dispatchSuccess(`${name} completed successfully`);
            }
          }
        }

        else if (result.status.isInvalid) {
          console.log(`Transaction ${txHash} invalid`);
          return dispatchFail(new Error("Transaction is invalid"), `${name} transaction is invalid. Please try again.`);
        }
        else if (result.status.isDropped || result.status.isUsurped) {
          console.log(`Transaction ${txHash} dropped or usurped`);
          return dispatchFail(new Error("Transaction dropped or usurped"), `${name} transaction was dropped or replaced. Please try again.`);
        }
      });
    } catch (error: any) {
      console.error(`Transaction ${txHash} signing/sending error:`, error);

      if (error.message === "Cancelled") {
        return dispatchFail(error, `${name} transaction cancelled by user`);
      }

      // Handle other errors
      if (recentNotifsIds.current.includes(txHash)) {
        if (error instanceof InvalidTxError || error.invalid) {
          try {
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

            const _errorMessage = (errorMessages as any)[pallet]?.[errorType] ?? (errorMessages as any)[pallet]?.default
              ?? `Error with ${name}: Please try again`;
            return dispatchFail(error, `${name} failed: ${_errorMessage}`);
          } catch (parseError) {
            console.error("Error parsing error message:", parseError);
            return dispatchFail(error, `Error with ${name}: ${error.message || "Please try again"}`);
          }
        }

        return dispatchFail(error, `Error with ${name}: ${error.message || "Please try again"}`);
      }
    }
    // Still, proposed deps remain inmutable, such as AddAlert and getNonce
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [accountStore.address, isTxBusy, fetchIdAndJudgement, typedApi,])
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
    if (!fromTypedApi) return null;
    return _getTeleportCall({
      amount,
      fromApi: fromTypedApi,
      parachainId,
      toAddress: accountStore.address,
    })
  }, [_getTeleportCall, fromTypedApi, parachainId, accountStore.address])

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
  const { balance: fromBalance } = useSystemAccountData(xcmParams.fromAddress, fromTypedApi || undefined);
  const { balance } = useSystemAccountData(accountStore.address, typedApi || undefined);

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
  //#endregion Balances

  //#region Transactions
  const [txToConfirm, setTxToConfirm] = useState<ApiTx | null>(null)

  const submitTransaction = async () => {
    if (xcmParams.enabled) {
      try {
        if (!fromTypedApi) {
          throw new Error("From API not available");
        }
        const fromAccount = getWalletAccount(xcmParams.fromAddress);
        if (!fromAccount) {
          throw new Error("From account not found");
        }

        const fromSigner = await getSignerForAddress(fromAccount.address);
        if (!fromSigner) {
          throw new Error("Signer not available for from account");
        }

        const teleportCall = getTeleportCall({
          amount: minimunTeleportAmount.integerValue(BigNumber.ROUND_UP),
        });
        if (!teleportCall) {
          throw new Error("Failed to create teleport call");
        }

        await signSubmitAndWatch({
          nonce: await getNonce(fromTypedApi, xcmParams.fromAddress),
          signer: fromSigner,
          awaitFinalization: true,
          call: teleportCall,
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
        if (balanceRef.current && balanceRef.current.isGreaterThanOrEqualTo(xcmParams.txTotalCost
          .plus(chainConstants?.existentialDeposit?.toString() || "0")
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
        if (txToConfirm) {
          await signSubmitAndWatch({
            call: txToConfirm,
            name: "Set Identity"
          })
        }
        break
      case "requestJudgement":
        if (txToConfirm) {
          await signSubmitAndWatch({
            call: txToConfirm,
            name: "Request Judgement"
          })
        }
        break
      case "addSubaccount":
        if (txToConfirm) {
          await signSubmitAndWatch({
            call: txToConfirm,
            name: "Add Subaccount"
          })
          refreshAccountTree(); // Refresh accounts tree after adding subaccount
        }
        break;
      case "removeSubaccount":
        if (txToConfirm) {
          await signSubmitAndWatch({
            call: txToConfirm,
            name: "Remove Subaccount"
          })
          refreshAccountTree(); // Refresh accounts tree after removing subaccount
        }
        break;
      case "quitSub":
        if (txToConfirm) {
          await signSubmitAndWatch({
            call: txToConfirm,
            name: "Quit Subaccount"
          })
          refreshAccountTree(); // Refresh accounts tree after quitting subaccount
        }
        break;
      case "editSubAccount":
        if (txToConfirm) {
          await signSubmitAndWatch({
            call: txToConfirm,
            name: "Edit Subaccount"
          })
          refreshAccountTree(); // Refresh accounts tree after editing subaccount
        }
        break;
      default:
        console.error("Unexpected openDialog value:", openDialog);
        if (txToConfirm) {
          await signSubmitAndWatch({
            call: txToConfirm,
            name: "Unknown Transaction"
          })
        }
        break;
    }
    closeTxDialog()
  }
  //#endregion Transactions

  const {
    accountTree,
    loading: accountTreeLoading,
    refresh: refreshAccountTree,
  } = useAccountsTree({
    address: accountStore.encodedAddress,
    api: typedApi as any, // Type assertion needed for compatibility
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
        Object.keys(accountStore).forEach((k) => delete (accountStore as any)[k]);
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
            fees: await (tx as any).getEstimatedFees?.(accountStore.address, { at: "best" }) || 0n,
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
    if (isConnecting) {
      console.log("Connection already in progress, skipping");
      return;
    }
    if (currentChain === chainId && isConnected) {
      console.log("Already connected to chain:", chainId);
      return; // Already connected to this chain
    }

    console.log("Connecting to chain:", chainId, "- Config:", CHAINS[chainId]);

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
        console.log("Disconnecting from previous chain:", currentChain);
        await disconnect();
      }

      // Create new client and typed API (using cached connections)
      console.log("Creating chain client for:", chainId);
      const newProvider = createChainClient(chainId);
      console.log("Getting typed API...");
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
      console.error("Connection error for chain", chainId, ":", err);
      console.error("Chain config:", CHAINS[chainId]);
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
    console.log('Auto-connect effect triggered:', {
      network,
      currentChain,
      isConnected,
      isConnecting,
      networkInChains: network && (network in CHAINS)
    });
    
    if (isConnected || isConnecting) return;
    if (!network || network === currentChain) return;
    if (!(network in CHAINS)) return;

    // Clear existing timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }

    // Debounce connection attempts
    connectionTimeoutRef.current = setTimeout(() => {
      console.log('Attempting to connect to network:', network);
      connect(network as keyof typeof CHAINS).catch(err => {
        console.error('Connection failed:', err);
        setError(err.message || 'Connection failed');
      });
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
    typedApi: typedApi || undefined, fromTypedApi,
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
