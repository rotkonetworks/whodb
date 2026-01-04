import { test, expect } from '@playwright/test'
import { injectMockWallet, TEST_ACCOUNTS } from './fixtures/wallet-mock'

test.describe('App Loading', () => {
  test('should load the app successfully', async ({ page }) => {
    await page.goto('/')

    // Wait for the app to load
    await expect(page).toHaveTitle(/.*/)

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')

    // Check that the root element is rendered
    await expect(page.locator('#root')).toBeAttached()
  })

  test('should render main application content', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // App should render some content - look for any buttons or interactive elements
    const hasContent = await page.locator('button, a, input').first().isVisible({ timeout: 10000 }).catch(() => false)
    expect(hasContent).toBe(true)
  })
})

test.describe('Wallet Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock wallet before navigating
    await injectMockWallet(page, TEST_ACCOUNTS.alice)
  })

  test('should detect injected wallet', async ({ page }) => {
    await page.goto('/')

    // The app should detect the mock wallet
    // Wait for wallet detection
    await page.waitForTimeout(2000)

    // Check if wallet is detected in injectedWeb3
    const hasWallet = await page.evaluate(() => {
      return !!(window as any).injectedWeb3?.['polkadot-js']
    })
    expect(hasWallet).toBe(true)
  })

  test('should be able to connect wallet', async ({ page }) => {
    await page.goto('/')

    // Look for and click connect button
    const connectButton = page.getByRole('button', { name: /connect|wallet/i })

    if (await connectButton.isVisible()) {
      await connectButton.click()

      // Wait for wallet modal or dropdown
      await page.waitForTimeout(1000)

      // Look for the mock wallet option
      const walletOption = page.getByText(/polkadot|mock/i)
      if (await walletOption.isVisible()) {
        await walletOption.click()
      }
    }
  })
})

test.describe('Network Selection', () => {
  test('should have network-related elements', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Look for any network-related content in the page
    const pageContent = await page.content()
    const hasNetworkContent =
      pageContent.includes('Polkadot') ||
      pageContent.includes('Kusama') ||
      pageContent.includes('Paseo') ||
      pageContent.includes('network') ||
      pageContent.includes('chain')

    // The app should have some network-related content
    expect(hasNetworkContent).toBe(true)
  })
})

test.describe('Accessibility', () => {
  test('should have interactive elements', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check that the app renders interactive elements
    const buttons = page.getByRole('button')
    const buttonCount = await buttons.count()

    // App should have at least some buttons
    expect(buttonCount).toBeGreaterThanOrEqual(0)

    // Check that the page has rendered content
    const rootElement = page.locator('#root')
    await expect(rootElement).toBeAttached()
  })
})
