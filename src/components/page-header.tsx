import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ReactNode } from "react"
import { Logo } from "./logo"
import { WalletConnectButton } from "./wallet-connect-button"
import { NetworkSelectorButton } from "./network-selector-button"

interface PageHeaderProps {
  backTo?: string
  title?: string | ReactNode
  rightActions?: ReactNode
  className?: string
  showWallet?: boolean
  showNetwork?: boolean
}

export function PageHeader({
  backTo,
  title,
  rightActions,
  className = "",
  showWallet = true,
  showNetwork = true,
}: PageHeaderProps) {
  return (
    <header className={`border-b border-gray-700/50 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50 ${className}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {backTo && (
              <Link to={backTo}>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-2">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            )}
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <Logo />
            </Link>
            {title && (
              <div className="flex items-center">
                {typeof title === "string" ? (
                  <span className="text-lg font-medium text-white">
                    {title}
                  </span>
                ) : (
                  title
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showNetwork && <NetworkSelectorButton />}
            {showWallet && <WalletConnectButton />}
            {rightActions}
          </div>
        </div>
      </div>
    </header>
  )
}
