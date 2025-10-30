import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider-simple'
import { Toaster } from '@/components/ui/sonner'
import { useModalAwareToasts } from '@/hooks/useModalAwareToasts'

// Immediate load for homepage
import HomePage from './pages/homepage'
import SearchPage from './pages/SearchPage'

// Lazy load heavy pages
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const AuthenticatedProviders = lazy(() => import('./components/AuthenticatedProviders'))
const LazySearchProvider = lazy(() => import('./components/LazySearchProvider'))

const PageLoader = () => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center">
    <div className="text-gray-400">Loading...</div>
  </div>
)

export default function App() {
  useModalAwareToasts()

  return (
    <div className="bg-gray-900 text-white antialiased">
      <ThemeProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes - minimal dependencies, instant load */}
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={
              <LazySearchProvider>
                <SearchPage />
              </LazySearchProvider>
            } />

            {/* Authenticated routes - lazy load providers and components */}
            <Route path="/register" element={
              <AuthenticatedProviders>
                <RegisterPage />
              </AuthenticatedProviders>
            } />

            {/* Network-specific profile routes */}
            <Route path="/polkadot/profile/:id" element={
              <AuthenticatedProviders>
                <ProfilePage />
              </AuthenticatedProviders>
            } />
            <Route path="/kusama/profile/:id" element={
              <AuthenticatedProviders>
                <ProfilePage />
              </AuthenticatedProviders>
            } />
            <Route path="/paseo/profile/:id" element={
              <AuthenticatedProviders>
                <ProfilePage />
              </AuthenticatedProviders>
            } />

            {/* Legacy route for backwards compatibility */}
            <Route path="/profile/:id" element={
              <AuthenticatedProviders>
                <ProfilePage />
              </AuthenticatedProviders>
            } />

            <Route path="/settings" element={
              <AuthenticatedProviders>
                <SettingsPage />
              </AuthenticatedProviders>
            } />

            <Route path="*" element={<div className="min-h-screen bg-gray-900 flex items-center justify-center">Page not found</div>} />
          </Routes>
        </Suspense>
        <Toaster />
      </ThemeProvider>
    </div>
  )
}