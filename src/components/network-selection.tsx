import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from 'lucide-react';

interface Network {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  badge: string;
  badgeColor: string;
  features: string[];
}

interface NetworkSelectionProps {
  networks: Network[];
  selectedNetwork: string | null;
  onSelect: (networkId: string) => void;
  hoveredNetwork: string | null;
  setHoveredNetwork: (networkId: string | null) => void;
}

const NetworkSelection: React.FC<NetworkSelectionProps> = ({
  networks,
  selectedNetwork,
  onSelect,
  hoveredNetwork,
  setHoveredNetwork,
}) => {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-lg md:text-xl font-bold text-white mb-2">Choose Your Network</h2>
        <p className="text-gray-400 text-sm">Select which blockchain network you want to register your identity on</p>
      </div>

      <div className="grid gap-4">
        {networks.map((network) => (
          <Card
            key={network.id}
            className={`cursor-pointer transition-all duration-200 ${network.color} ${selectedNetwork === network.id ? "ring-2 ring-offset-2 ring-offset-gray-900" : ""
              } ${hoveredNetwork === network.id ? "scale-[1.02]" : ""}`}
            onMouseEnter={() => setHoveredNetwork(network.id)}
            onMouseLeave={() => setHoveredNetwork(null)}
            onClick={() => onSelect(network.id)}
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {network.icon}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white text-sm md:text-base truncate">{network.name}</h3>
                    <p className="text-xs md:text-sm text-gray-400 truncate">{network.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Badge className={`${network.badgeColor} text-xs`}>{network.badge}</Badge>
                  {selectedNetwork === network.id && <Check className="w-4 h-4 md:w-5 md:h-5 text-green-400" />}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {network.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-xs text-gray-300">
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full mr-2 flex-shrink-0"></div>
                    <span className="truncate">{feature}</span>
                  </div>
                ))}
              </div>

              {network.id === "polkadot" && (
                <div className="mt-3 p-2 bg-purple-900/20 border border-purple-500/30 rounded-md">
                  <p className="text-purple-400 text-xs">
                    🏆 Most trusted network with the largest ecosystem and community
                  </p>
                </div>
              )}

              {network.id === "paseo" && (
                <div className="mt-3 p-2 bg-green-900/20 border border-green-500/30 rounded-md">
                  <p className="text-green-400 text-xs">
                    💰 Free tokens provided automatically if your balance is low!
                  </p>
                </div>
              )}

              {network.id === "kusama" && (
                <div className="mt-3 p-2 bg-cyan-900/20 border border-cyan-500/30 rounded-md">
                  <p className="text-cyan-400 text-xs">
                    🔒 Enhanced privacy features for sensitive identity information
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default NetworkSelection;
