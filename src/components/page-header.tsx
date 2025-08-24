import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ReactNode } from "react"
import { Logo } from "./logo"

interface PageHeaderProps {
  backTo?: string
  title?: string | ReactNode
  rightActions?: ReactNode
  className?: string
}

export function PageHeader({ backTo, title, rightActions, className = "", }: PageHeaderProps) {
  return (
    <header className={`border-b border-pink-500/30 bg-gray-800/50 backdrop-blur-sm ${className}`}>
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4">
            {backTo && (
              <Link to={backTo}>
                <Button variant="ghost" className="text-gray-400 p-2 md:px-3 md:py-2">
                  <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
                  <span className="hidden md:inline text-sm">Back</span>
                </Button>
              </Link>
            )}
            <Link to="/">
              <Logo />
            </Link>
            {title && (
              <div className="flex items-center">
                {typeof title === "string" ? (
                  <span className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                    {title}
                  </span>
                ) : (
                  title
                )}
              </div>
            )}
          </div>
          {rightActions && (
            <div className="flex items-center space-x-2">
              {rightActions}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
