import SearchForm from "@/components/search-form"
import { Logo } from "@/components/logo"
import { Footer } from "@/components/footer"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { UserPlus } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="border-b border-gray-700/50 bg-gray-900/95">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/">
              <Logo />
            </Link>
            <Link to="/register">
              <Button
                size="sm"
                variant="ghost"
                className="text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 transition-colors"
              >
                <UserPlus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Register</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md mx-auto flex flex-col items-center">
          <div className="mb-6 md:mb-8">
            {/* Use the hero variant for the homepage logo */}
            <Logo variant="hero" />
          </div>

          <SearchForm />

          <p className="mt-6 md:mt-8 text-gray-400 text-center text-sm px-4">
            Search for identities by name, wallet address, or social handles
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
