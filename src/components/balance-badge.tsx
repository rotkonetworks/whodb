import { usePolkadotApi } from "@/contexts/PolkadotApiContext";
import { useSystemAccountData } from "@/hooks/use-system-account-data";
import { SS58String } from "polkadot-api";
import { Badge } from "@/lib/ui";

// Component to display individual account balance
export const AccountBalanceBadge = ({ address, chainId }: { address: SS58String; chainId: string }) => {
  const { formatAmount, typedApi } = usePolkadotApi();

  const balance = useSystemAccountData(address, typedApi).balance;

  return (
    <Badge className="bg-gray-700/50 text-gray-300 text-xs px-1.5 py-0.5">
      <span className="text-xs text-gray-400">
        {formatAmount(balance)}
      </span>
    </Badge>
  );
};