import { Skeleton } from "./skeleton"

export function ProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl animate-in fade-in duration-300">
      {/* Header with avatar and name */}
      <div className="text-center mb-8">
        <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4 bg-gray-800" />
        <Skeleton className="h-8 w-48 mx-auto mb-2 bg-gray-800" />
        <Skeleton className="h-4 w-64 mx-auto bg-gray-800" />
      </div>

      {/* Address badge */}
      <div className="flex justify-center mb-6">
        <Skeleton className="h-10 w-72 rounded-lg bg-gray-800" />
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-3 mb-8">
        <Skeleton className="h-10 w-28 rounded-lg bg-gray-800" />
        <Skeleton className="h-10 w-28 rounded-lg bg-gray-800" />
      </div>

      {/* Profile details section */}
      <div className="pt-6 border-t border-gray-700/50 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-5 w-5 rounded bg-gray-800" />
            <div className="flex-1">
              <Skeleton className="h-3 w-16 mb-2 bg-gray-800" />
              <Skeleton className="h-5 w-48 bg-gray-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Verification section */}
      <div className="pt-6 mt-6 border-t border-gray-700/50">
        <Skeleton className="h-3 w-32 mb-4 bg-gray-800" />
        <Skeleton className="h-20 w-full rounded-lg bg-gray-800" />
      </div>
    </div>
  )
}

export function SearchResultSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-lg bg-gray-800/50 border border-gray-700/50 animate-pulse"
        >
          <Skeleton className="h-12 w-12 rounded-full bg-gray-700" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-2 bg-gray-700" />
            <Skeleton className="h-4 w-48 bg-gray-700" />
          </div>
          <Skeleton className="h-6 w-16 rounded bg-gray-700" />
        </div>
      ))}
    </div>
  )
}

export function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24 bg-gray-800" />
      <Skeleton className="h-10 w-full rounded-md bg-gray-800" />
    </div>
  )
}
