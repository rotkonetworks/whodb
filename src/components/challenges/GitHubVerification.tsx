import { useState, useEffect } from 'react';
import { Github, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GitHubVerificationProps {
  url: string; // Required URL for challenge verification
  expectedUsername: string; // From identity.info.github
  onVerify: (verified: boolean) => void;
  isVerified: boolean;
}

export function GitHubVerification({ url, expectedUsername, onVerify, isVerified }: GitHubVerificationProps) {
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

      window.open(url, 'github_verification', 'width=600,height=700');
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

  return <>
    <p>
      Verify ownership of GitHub account: <strong>@{expectedUsername}</strong>
    </p>
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
  </>;
}