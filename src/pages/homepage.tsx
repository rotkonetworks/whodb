import SearchForm from "@/components/search-form"
import { Logo } from "@/components/logo"
import { motion } from "framer-motion"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <motion.div
          className="w-full max-w-md mx-auto flex flex-col items-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="mb-8 md:mb-10">
            <Logo variant="hero" />
          </div>

          <SearchForm />
        </motion.div>
      </main>
    </div>
  )
}
