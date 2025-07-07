export default function SearchFormSkeleton() {
  return (
    <div className="w-full relative">
      <div className="w-full h-12 px-4 pl-12 rounded-full bg-gray-800 border border-gray-700 animate-pulse">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full bg-gray-700"></div>
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-16 h-8 rounded-full bg-gray-700"></div>
      </div>
    </div>
  )
}
