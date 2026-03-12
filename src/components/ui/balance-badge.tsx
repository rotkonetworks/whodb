import { usePolkadotApi } from "@/contexts/PolkadotApiContext";
import { useSystemAccountData } from "@/hooks/use-system-account-data";
import { SS58String } from "polkadot-api";
import { Badge } from "./badge";

// Component to display individual account balance
export const AccountBalanceBadge = ({ address, chainId: _chainId }: { address: SS58String; chainId: string }) => {
  const { formatAmount, typedApi } = usePolkadotApi();

  const balance = useSystemAccountData(address, typedApi).balance;

  return (
    <Badge className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs px-2 py-1 font-medium">
      {formatAmount(balance)}
    </Badge>
  );
};