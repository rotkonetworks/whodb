import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Github } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface GitHubVerificationProps {
  url: string; // Required URL for challenge verification
  expectedUsername: string; // From identity.info.github
  onVerify: (verified: boolean) => void;
  isVerified?: boolean;
}

export function GitHubVerification(
  { url, expectedUsername, onVerify, isVerified }: GitHubVerificationProps
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectedUser = expectedUsername; // Assuming expectedUsername is the connected GitHub user
  const isGitHubConnected = isVerified

  useEffect(() => {
    if (isGitHubConnected) {
      setLoading(false);
      setError(null);
      onVerify(true);
    }
  }, [isGitHubConnected, onVerify]);

  const handleGitHubConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      window.open(url, 'github_verification', 'width=600,height=700');
      setTimeout(() => {
        setLoading(false);
        toast.error('GitHub verification timed out. Please try again.');
      }, 10000); // Simulate loading time
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      setLoading(false);
    }
  };

  const disconnect = () => {
    // TODO implement disconnect logic from GitHub oauth
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
    ) : null}

    {error && (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )}

    <div className="flex gap-2">
      {!isVerified ? (
        <Button
          onClick={handleGitHubConnect}
          disabled={loading}
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