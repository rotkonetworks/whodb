import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function GitHubVerificationCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');

      if (error) {
        setStatus('error');
        setMessage(params.get('error_description') || 'Authorization denied');
        setTimeout(() => navigate('/?tab=identityForm'), 3000);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Missing authorization parameters');
        setTimeout(() => navigate('/?tab=identityForm'), 3000);
        return;
      }

      // Verify state
      const storedState = sessionStorage.getItem('github_verification_state');
      const expectedUsername = sessionStorage.getItem('github_expected_username');

      if (state !== storedState) {
        setStatus('error');
        setMessage('Invalid state parameter - possible CSRF attack');
        setTimeout(() => navigate('/?tab=identityForm'), 3000);
        return;
      }

      try {
        // Exchange code for token (via your backend)
        const response = await fetch('/api/verify/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });

        if (!response.ok) {
          throw new Error('Failed to verify GitHub account');
        }

        const { user } = await response.json();

        // Check if username matches
        if (user.login.toLowerCase() === expectedUsername?.toLowerCase()) {
          localStorage.setItem('github_verified_user', user.login);
          setStatus('success');
          setMessage(`Successfully verified as @${user.login}`);
        } else {
          setStatus('error');
          setMessage(`Connected as @${user.login}, but expected @${expectedUsername}`);
        }

        // Clean up
        sessionStorage.removeItem('github_verification_state');
        sessionStorage.removeItem('github_expected_username');

        // Redirect back
        setTimeout(() => navigate('/?tab=identityForm'), 2000);
      } catch (err) {
        setStatus('error');
        setMessage(err.message);
        setTimeout(() => navigate('/?tab=identityForm'), 3000);
      }
    };

    handleCallback();
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Verifying GitHub Account</h1>
            <p className="text-muted-foreground">Please wait while we verify your account...</p>
          </div>
        )}

        {status === 'success' && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {message}
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
