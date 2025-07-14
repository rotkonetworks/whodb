import React, { memo, useEffect, useState, useMemo } from 'react';
import { PolkadotApiProvider } from '../contexts/PolkadotApiContext';

/**
 * Singleton pattern for PolkadotApiProvider to prevent re-creation
 * This ensures the provider instance is maintained across route changes
 */
class PolkadotProviderSingleton {
  private static instance: PolkadotProviderSingleton | null = null;
  private isInitialized = false;

  public static getInstance(): PolkadotProviderSingleton {
    if (!PolkadotProviderSingleton.instance) {
      PolkadotProviderSingleton.instance = new PolkadotProviderSingleton();
    }
    return PolkadotProviderSingleton.instance;
  }

  public setInitialized(value: boolean) {
    this.isInitialized = value;
  }

  public getInitialized(): boolean {
    return this.isInitialized;
  }
}

/**
 * Optimized PolkadotApiProvider that maintains state across route changes
 * and prevents unnecessary re-renders
 */
export const OptimizedPolkadotRoute = memo<{ children: React.ReactNode }>(
  ({ children }) => {
    const singleton = PolkadotProviderSingleton.getInstance();
    const [isProviderReady, setIsProviderReady] = useState(singleton.getInitialized());

    // Memoize children to prevent unnecessary re-renders
    const memoizedChildren = useMemo(() => children, [children]);

    useEffect(() => {
      if (!isProviderReady) {
        // Small delay to prevent blocking the route transition
        const timer = setTimeout(() => {
          setIsProviderReady(true);
          singleton.setInitialized(true);
        }, 50);

        return () => clearTimeout(timer);
      }
    }, [isProviderReady, singleton]);

    // Show loading state while provider initializes (only on first load)
    if (!isProviderReady) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      );
    }

    return (
      <PolkadotApiProvider>
        {memoizedChildren}
      </PolkadotApiProvider>
    );
  }
);

OptimizedPolkadotRoute.displayName = 'OptimizedPolkadotRoute';

export default OptimizedPolkadotRoute;
