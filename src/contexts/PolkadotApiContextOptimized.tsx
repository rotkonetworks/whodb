import { memo, useCallback, useMemo } from 'react';
import { PolkadotApiProvider as OriginalPolkadotApiProvider } from './PolkadotApiContext';

/**
 * Optimized PolkadotApiProvider that prevents unnecessary re-renders
 * 
 * This wrapper ensures the provider only re-renders when absolutely necessary,
 * preventing cascading re-renders in the component tree.
 */
export const OptimizedPolkadotApiProvider = memo<{ children: React.ReactNode }>(
  ({ children }) => {
    // Memoize children to prevent unnecessary provider re-renders
    const memoizedChildren = useMemo(() => children, [children]);
    
    return (
      <OriginalPolkadotApiProvider>
        {memoizedChildren}
      </OriginalPolkadotApiProvider>
    );
  }
);

OptimizedPolkadotApiProvider.displayName = 'OptimizedPolkadotApiProvider';

export default OptimizedPolkadotApiProvider;
