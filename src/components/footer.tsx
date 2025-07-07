export function Footer() {
  return (
    <footer className="container mx-auto px-4 py-6 border-t border-gray-800">
      <div className="flex flex-col items-center justify-center text-gray-500 text-xs space-y-1">
        <span className="flex items-center">
          <span className="mr-1 transform rotate-180 text-base">©</span> {/* Copyleft symbol, slightly larger */}
          <span>{new Date().getFullYear()} whodb</span>
        </span>
      </div>
    </footer>
  )
}
