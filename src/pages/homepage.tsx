import SearchForm from "@/components/search-form"
import { Logo } from "@/components/logo"
import { Footer } from "@/components/footer"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { User, UserPlus } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="container mx-auto px-4 py-4">
        <div className="flex justify-end space-x-2">
          <Link to="/login">
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-400 hover:bg-white/10 hover:text-white p-2 md:px-3 md:py-1 text-xs md:text-sm rounded-md transition-colors"
            >
              <User className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Login</span>
            </Button>
          </Link>
          <Link to="/register">
            <Button
              size="sm"
              variant="ghost"
              className="text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 p-2 md:px-3 md:py-1 text-xs md:text-sm rounded-md transition-colors"
            >
              <UserPlus className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Register</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-4xl mx-auto">
          <Logo className="mx-auto mb-8" />

          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
            Find Anyone on Web3
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Search blockchain identities across multiple networks. Discover people by name, wallet address, or social handles.
          </p>

          <SearchForm />
        </div>
      </main>

      <Footer />
    </div>
  )
}
