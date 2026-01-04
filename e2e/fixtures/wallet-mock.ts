import { Page } from '@playwright/test'

/**
 * Mock wallet configuration for e2e tests
 * Uses a test account that can be used on Paseo testnet
 */
export const TEST_ACCOUNTS = {
  alice: {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    name: 'Alice (Test)',
    // This is Alice's well-known development account
    publicKey: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
  },
  bob: {
    address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    name: 'Bob (Test)',
    publicKey: '0x8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48',
  },
}

/**
 * Injects a mock wallet into the page that simulates Polkadot.js extension behavior
 */
export async function injectMockWallet(page: Page, account = TEST_ACCOUNTS.alice) {
  await page.addInitScript(({ account }) => {
    // Track transaction signing calls for assertions
    (window as any).__testTransactionCalls = []

    // Mock the injectedWeb3 object that wallet extensions provide
    const mockWallet = {
      enable: async () => ({
        accounts: {
          get: async () => [
            {
              address: account.address,
              name: account.name,
              type: 'sr25519',
            },
          ],
          subscribe: (cb: (accounts: any[]) => void) => {
            cb([
              {
                address: account.address,
                name: account.name,
                type: 'sr25519',
              },
            ])
            return () => {}
          },
        },
        signer: {
          signPayload: async (payload: any) => {
            // Record the signing call for test assertions
            (window as any).__testTransactionCalls.push({
              type: 'signPayload',
              payload,
              timestamp: Date.now(),
            })

            // Check if era is set to immortal (0)
            const hasImmortalEra = payload.era === '0x00' || payload.era === 0

            // Return a mock signature
            return {
              id: 1,
              signature: '0x' + '00'.repeat(64), // Mock 64-byte signature
              // Include metadata about the signing for test verification
              __test: {
                hasImmortalEra,
                era: payload.era,
                nonce: payload.nonce,
              },
            }
          },
          signRaw: async (raw: any) => {
            (window as any).__testTransactionCalls.push({
              type: 'signRaw',
              raw,
              timestamp: Date.now(),
            })
            return {
              id: 1,
              signature: '0x' + '00'.repeat(64),
            }
          },
        },
        metadata: {
          get: async () => [],
          provide: async () => true,
        },
      }),
      version: '0.0.1-test',
    }

    // Inject as polkadot-js extension
    ;(window as any).injectedWeb3 = {
      'polkadot-js': mockWallet,
      'mock-wallet': mockWallet,
    }
  }, { account })
}

/**
 * Gets the recorded transaction signing calls from the page
 */
export async function getTransactionCalls(page: Page) {
  return await page.evaluate(() => (window as any).__testTransactionCalls || [])
}

/**
 * Clears recorded transaction calls
 */
export async function clearTransactionCalls(page: Page) {
  await page.evaluate(() => {
    (window as any).__testTransactionCalls = []
  })
}

/**
 * Waits for a transaction to be signed (with timeout)
 */
export async function waitForTransactionSign(page: Page, timeout = 30000) {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const calls = await getTransactionCalls(page)
    if (calls.length > 0) {
      return calls[calls.length - 1]
    }
    await page.waitForTimeout(100)
  }

  throw new Error('Timeout waiting for transaction to be signed')
}

/**
 * Mock balance response for testing
 */
export async function mockBalanceQuery(page: Page, balance: string = '10000000000000') {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url()

    // Mock balance queries
    if (url.includes('system.account')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            free: balance,
            reserved: '0',
            frozen: '0',
          },
          nonce: 0,
        }),
      })
    } else {
      await route.continue()
    }
  })
}
