import { usePolkadotApi } from "@/contexts/PolkadotApiContext";
import { useSystemAccountData } from "@/hooks/use-system-account-data";
import { SS58String } from "polkadot-api";
import { Badge } from "./badge";

// Component to display individual account balance
export const AccountBalanceBadge = ({ address, chainId }: { address: SS58String; chainId: string }) => {
  const { formatAmount, typedApi } = usePolkadotApi();

  const balance = useSystemAccountData(address, typedApi).balance;

  return (
    <Badge className="bg-gray-700 text-white text-xs px-1.5 py-0.5 border border-gray-600">
      <span className="text-xs font-medium">
        {formatAmount(balance)}
      </span>
    </Badge>
  );
};