import { ChainProvider, ReactiveDotProvider } from '@reactive-dot/react';
import { Suspense } from 'react';
import React from 'react';
import { useProxy } from 'valtio/utils';

import { config } from '~/api/config';
import { ErrorBoundary } from '~/components/ErrorBoundary';
import { IdentityRegistrarComponent } from '~/components/identity-registrar';
import { chainStore as _chainStore } from '~/store/ChainStore';

import { Loading } from './Loading';

function Home() {
  const chainId = useProxy(_chainStore).id
  React.useEffect(() => {
    console.log({ config });
  }, []);

  React.useEffect(() => {
    if (!Object.keys(config.chains).includes(chainId as string)) {
      _chainStore.id = import.meta.env.VITE_APP_DEFAULT_CHAIN;
    }
  }, [chainId]);

  return (
    <ErrorBoundary>
      <ReactiveDotProvider config={config}>
        <ChainProvider chainId={chainId as keyof typeof config.chains}>
          <Suspense fallback={<Loading />}>
            <IdentityRegistrarComponent />
          </Suspense>
        </ChainProvider>
      </ReactiveDotProvider>
    </ErrorBoundary>
  );
}

export default Home;
