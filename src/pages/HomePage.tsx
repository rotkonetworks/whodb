import React from "react"
import { Link } from "react-router-dom"
import SearchForm from "@/components/search-form"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="container mx-auto px-4 py-4">
        <div className="flex justify-end space-x-2">
          <Link
            to="/login"
            className="btn-ghost p-2 md:px-3 md:py-1 text-xs md:text-sm rounded-md transition-colors inline-block"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="text-accent hover:bg-accent/10 hover:text-accent/80 p-2 md:px-3 md:py-1 text-xs md:text-sm rounded-md transition-colors inline-block"
          >
            Register
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-16 w-auto flex justify-center">
            <img
              src="/whodb_logo.svg"
              alt="whodb"
              height={64}
              width="auto"
            />
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            Find anyone on the blockchain
          </h1>
          <p className="text-muted mt-2">
            Search and verify identities across multiple networks
          </p>
        </div>

        <div className="max-w-2xl mx-auto w-full">
          <SearchForm />
        </div>

        {/* Demo buttons to showcase the button styles */}
        <div className="mt-12 bg-card p-8 rounded-lg border border-border/30">
          <h2 className="text-xl font-bold text-foreground mb-4">Button Styles Demo</h2>
          <div className="flex gap-4 flex-wrap">
            <button type="button" className="btn-primary px-6 py-3 rounded-lg font-medium">
              Primary Button
            </button>
            <button type="button" className="btn-secondary px-6 py-3 rounded-lg font-medium">
              Secondary Button
            </button>
            <button type="button" className="btn-outline px-6 py-3 rounded-lg font-medium">
              Outline Button
            </button>
            <button type="button" className="btn-ghost px-6 py-3 rounded-lg font-medium">
              Ghost Button
            </button>
          </div>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8">
        <div className="text-center text-muted">
          <p>&copy; 2025 whodb. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
