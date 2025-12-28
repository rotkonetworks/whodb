import { proxy } from "valtio";

export interface BalanceState {
  balance: string;
  isLoading: boolean;
  isRequestingTokens: boolean;
  lastCheckedAddress: string | null;
  error: string | null;
}

// Fine-grained balance store - components only re-render when balance changes
export const balanceStore = proxy<BalanceState>({
  balance: "0.0000000000",
  isLoading: false,
  isRequestingTokens: false,
  lastCheckedAddress: null,
  error: null,
});

/**
 * Check balance for an address
 * In production, this should query PAPI for actual on-chain balance
 */
export const checkBalance = async (address: string, network: string) => {
  balanceStore.isLoading = true;
  balanceStore.error = null;
  balanceStore.lastCheckedAddress = address;

  try {
    // Simulate websocket connection and balance check
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock different balances based on network
    let mockBalance = "0.0000000000";
    if (network === "paseo") {
      const randomBalance = Math.random() * 2;
      mockBalance = randomBalance.toFixed(10);
    } else if (network === "polkadot") {
      const randomBalance = Math.random() * 10 + 5;
      mockBalance = randomBalance.toFixed(10);
    } else if (network === "kusama") {
      const randomBalance = Math.random() * 5 + 1;
      mockBalance = randomBalance.toFixed(10);
    }

    // TODO: Replace with actual PAPI query
    // const client = await getPapiClient(chainEndpoint);
    // const accountInfo = await client.query.System.Account.getValue(address);
    // const balance = accountInfo?.data.free || 0n;
    // mockBalance = formatBalance(balance, decimals);

    balanceStore.balance = mockBalance;
  } catch (err) {
    balanceStore.error = err instanceof Error ? err.message : "Failed to check balance";
    balanceStore.balance = "0.0000000000";
  } finally {
    balanceStore.isLoading = false;
  }
};

/**
 * Request tokens (faucet)
 * Only available on testnets
 */
export const requestTokens = async (address: string): Promise<boolean> => {
  balanceStore.isRequestingTokens = true;
  balanceStore.error = null;

  try {
    // Simulate token distribution
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Add 2 tokens to balance
    const currentBalance = Number.parseFloat(balanceStore.balance);
    const newBalance = (currentBalance + 2).toFixed(10);
    balanceStore.balance = newBalance;

    return true;
  } catch (err) {
    balanceStore.error = err instanceof Error ? err.message : "Failed to request tokens";
    return false;
  } finally {
    balanceStore.isRequestingTokens = false;
  }
};

/**
 * Clear balance data
 */
export const clearBalance = () => {
  balanceStore.balance = "0.0000000000";
  balanceStore.isLoading = false;
  balanceStore.isRequestingTokens = false;
  balanceStore.lastCheckedAddress = null;
  balanceStore.error = null;
};

/**
 * Format balance for display
 */
export const formatBalance = (balance: bigint, decimals: number): string => {
  const divisor = BigInt(10 ** decimals);
  const integerPart = balance / divisor;
  const fractionalPart = balance % divisor;

  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  return `${integerPart}.${fractionalStr}`;
};
