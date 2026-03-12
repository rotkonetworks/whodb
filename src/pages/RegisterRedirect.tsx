import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAccount } from '@/contexts/wallet-context'
import { useNetwork } from '@/contexts/network-context'
import { PageHeader } from '@/components/page-header'
import { WalletIcon } from 'lucide-react'

export default function RegisterRedirect() {
  const { address } = useAccount()
  const { network } = useNetwork()
  const [_searchParams] = useSearchParams()
  const navigate = useNavigate()

  // When both wallet and network are connected, redirect to profile
  useEffect(() => {
    if (address && network) {
      // Remove _people suffix for URL
      const baseNetwork = network.replace('_people', '')
      navigate(`/profile/${baseNetwork}/${address}`, { replace: true })
    }
  }, [address, network, navigate])

  // Show connection prompt
  return (
    <div className="min-h-screen bg-gray-900">
      <PageHeader backTo="/" title="Create Identity" />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="py-16 text-center">
          <WalletIcon className="w-16 h-16 text-gray-600 mx-auto mb-6 opacity-50" />
          <h3 className="text-xl font-medium text-white mb-3">Create Your Identity</h3>
          <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
            Connect your wallet and select a network to get started with your on-chain identity
          </p>
          <div className="inline-flex flex-col items-start text-left text-sm text-gray-500 space-y-3 px-6 py-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full transition-colors ${network ? 'bg-green-400' : 'bg-gray-600'}`} />
              <span className={network ? 'text-gray-400' : 'text-white'}>Select a network</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full transition-colors ${address ? 'bg-green-400' : 'bg-gray-600'}`} />
              <span className={address ? 'text-gray-400' : 'text-white'}>Connect your wallet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
