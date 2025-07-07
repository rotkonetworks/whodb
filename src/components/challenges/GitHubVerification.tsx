import React, { useState, useEffect } from 'react';
import { Github, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GitHubVerificationProps {
  expectedUsername: string; // From identity.info.github
  onVerify: (verified: boolean) => void;
  isVerified: boolean;
}

export function GitHubVerification({ expectedUsername, onVerify, isVerified }: GitHubVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedUser, setConnectedUser] = useState<string | null>(null);

  useEffect(() => {
    // Check if already connected
    const user = localStorage.getItem('github_verified_user');
    if (user) {
      setConnectedUser(user);
      if (user.toLowerCase() === expectedUsername.toLowerCase()) {
        onVerify(true);
      }
    }
  }, [expectedUsername, onVerify]);

  const handleGitHubConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      // Generate state for CSRF protection
      const state = crypto.randomUUID();
      sessionStorage.setItem('github_verification_state', state);
      sessionStorage.setItem('github_expected_username', expectedUsername);

      // Redirect to GitHub OAuth
      const params = new URLSearchParams({
        client_id: import.meta.env.VITE_APP_GITHUB_CLIENT_ID,
        redirect_uri: `${window.location.origin}/verify/github/callback`,
        scope: 'read:user',
        state: state
      });

      window.location.href = `https://github.com/login/oauth/authorize?${params}`;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const disconnect = () => {
    localStorage.removeItem('github_verified_user');
    localStorage.removeItem('github_token');
    setConnectedUser(null);
    onVerify(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          GitHub Verification
        </CardTitle>
        <CardDescription>
          Verify ownership of GitHub account: <strong>@{expectedUsername}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isVerified ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Successfully verified as <strong>@{connectedUser}</strong>
            </AlertDescription>
          </Alert>
        ) : connectedUser ? (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              Connected as <strong>@{connectedUser}</strong>, but expected <strong>@{expectedUsername}</strong>
            </AlertDescription>
          </Alert>
        ) : null}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          {!connectedUser ? (
            <Button
              onClick={handleGitHubConnect}
              disabled={loading}
              variant="primary"
              className="w-full"
            >
              <Github className="mr-2 h-4 w-4" />
              {loading ? 'Connecting...' : 'Connect GitHub Account'}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleGitHubConnect}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                Reconnect
              </Button>
              <Button
                onClick={disconnect}
                variant="outline"
                className="flex-1"
              >
                Disconnect
              </Button>
            </>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          <p>This will redirect you to GitHub to authorize access.</p>
          <p>We only request read access to verify your username.</p>
        </div>
      </CardContent>
    </Card>
  );
}