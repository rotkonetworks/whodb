import { Globe, ChevronDown, CheckCircle, ExternalLink } from "lucide-react"
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
  { id: 'paseo', name: 'Paseo', description: 'Testnet — register with us' },
  { id: 'polkadot', name: 'Polkadot', description: 'Mainnet — browse only' },
] as const

export function NetworkSelectorButton() {
  const { network, networkDisplayName } = useNetwork()
  const navigate = useNavigate()
  const location = useLocation()

  const baseNetwork = network?.replace('_people', '')

  const handleNetworkSelect = (baseNetworkId: string) => {
    const match = location.pathname.match(/^\/profile\/([^\/]+)\/(.+)$/);
    if (match) {
      const [, , address] = match;
      navigate(`/profile/${baseNetworkId}/${address}`);
    } else if (location.pathname.startsWith('/search')) {
      navigate(`/search?network=${baseNetworkId}`);
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
      <DropdownMenuContent align="end" className="w-64 bg-gray-800 border-gray-700">
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
        <DropdownMenuSeparator className="bg-gray-700" />
        <div className="px-3 py-2.5 text-xs text-gray-500">
          For Polkadot & Kusama registration use{" "}
          <a
            href="https://dotid.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-400 hover:text-pink-300 inline-flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            dotid.app <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
