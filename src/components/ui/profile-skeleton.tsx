import { Skeleton } from "./skeleton"

export function ProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl animate-in fade-in duration-200">
      {/* Profile header - matches actual layout */}
      <div className="flex items-start gap-4 mb-6">
        <Skeleton className="h-16 w-16 rounded-full bg-gray-800 flex-shrink-0" />
        <div className="flex-1 min-w-0 pt-1">
          <Skeleton className="h-6 w-40 mb-2 bg-gray-800" />
          <Skeleton className="h-3 w-20 mb-2 bg-gray-800" />
          <Skeleton className="h-3 w-32 bg-gray-800" />
        </div>
      </div>

      {/* Identity fields */}
      <div className="space-y-1 divide-y divide-gray-800/50">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="h-5 w-5 rounded bg-gray-800 flex-shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-3 w-16 mb-1.5 bg-gray-800" />
              <Skeleton className="h-4 w-44 bg-gray-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Verification section */}
      <div className="pt-4 mt-4 border-t border-gray-700/50">
        <Skeleton className="h-3 w-24 mb-3 bg-gray-800" />
        <Skeleton className="h-14 w-full rounded-lg bg-gray-800" />
      </div>
    </div>
  )
}

export function SearchResultSkeleton() {
  return (
    <div className="divide-y divide-gray-700/50">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-start gap-5 p-6 animate-pulse"
        >
          <Skeleton className="h-12 w-12 rounded-full bg-gray-800" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-2 bg-gray-800" />
            <Skeleton className="h-3 w-48 mb-2 bg-gray-800" />
            <Skeleton className="h-3 w-36 bg-gray-800" />
          </div>
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
