import { Globe, ChevronDown, CheckCircle } from "lucide-react"
import { useNetwork } from "@/contexts/network-context"
import { Button } from "@/components/ui/button"
import { useNavigate, useLocation } from "react-router-dom"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

const NETWORKS = [
  { id: 'paseo', name: 'Paseo', description: 'Testnet' },
  { id: 'polkadot', name: 'Polkadot', description: 'Mainnet' },
  { id: 'kusama', name: 'Kusama', description: 'Mainnet' },
] as const

export function NetworkSelectorButton() {
  const { network, networkDisplayName } = useNetwork()
  const navigate = useNavigate()
  const location = useLocation()

  // Get the base network name (remove _people suffix) for comparison
  const baseNetwork = network?.replace('_people', '')

  const handleNetworkSelect = (baseNetworkId: string) => {
    // If on profile page, update the network in the URL path
    const match = location.pathname.match(/^\/profile\/([^\/]+)\/(.+)$/);
    if (match) {
      const [, currentNetwork, address] = match;
      navigate(`/profile/${baseNetworkId}/${address}`);
    } else if (location.pathname.startsWith('/search')) {
      // On search page, update query param
      navigate(`/search?network=${baseNetworkId}`);
    } else {
      // Otherwise stay on current page - network doesn't matter on landing
      // The network will be used when navigating to profile/search pages
      return;
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-gray-700/50 hover:border-gray-600 text-sm"
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline capitalize">{networkDisplayName || 'Paseo'}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-gray-800 border-gray-700">
        <DropdownMenuLabel className="text-gray-400 text-xs uppercase tracking-wide">
          Select Network
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        {NETWORKS.map((net) => (
          <DropdownMenuItem
            key={net.id}
            onClick={() => handleNetworkSelect(net.id)}
            className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer py-3"
          >
            <div className="flex items-start justify-between w-full gap-3">
              <div className="flex flex-col gap-0.5 flex-1">
                <div className="font-medium text-sm">{net.name}</div>
                <div className="text-xs text-gray-500">{net.description}</div>
              </div>
              {baseNetwork === net.id && (
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
