import SearchFormMinimal from "@/components/search-form-minimal"
import { Logo } from "@/components/logo"
import { Footer } from "@/components/footer"
import { Link } from "react-router-dom"
import { UserPlus } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="p-4 flex justify-end">
        <Link
          to="/profile"
          className="text-pink-400 hover:bg-pink-500/10 px-3 py-2 text-sm rounded-md transition-colors inline-flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden md:inline">Register</span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md mx-auto flex flex-col items-center">
          <div className="mb-6 md:mb-8">
            {/* Use the hero variant for the homepage logo */}
            <Logo variant="hero" />
          </div>

          <SearchFormMinimal />

          <p className="mt-6 md:mt-8 text-gray-400 text-center text-sm px-4">
            Search for identities by name, wallet address, or social handles
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
