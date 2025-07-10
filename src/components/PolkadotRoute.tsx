import React, { memo, useMemo, Suspense } from 'react';
import { PolkadotApiProvider } from '../contexts/PolkadotApiContext';
import { Loader2 } from 'lucide-react';

/**
 * Simple memoized wrapper for routes that need PolkadotApiProvider
 * Prevents re-creation when props haven't changed and provides loading state
 */
export const PolkadotRoute = memo<{ children: React.ReactNode }>(
  ({ children }) => {
    // Memoize children to prevent unnecessary re-renders
    const memoizedChildren = useMemo(() => children, [children]);
    
    return (
      <Suspense 
        fallback={
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          </div>
        }
      >
        <PolkadotApiProvider>
          {memoizedChildren}
        </PolkadotApiProvider>
      </Suspense>
    );
  }
);

PolkadotRoute.displayName = 'PolkadotRoute';

export default PolkadotRoute;
