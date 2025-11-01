const DEFAULT_DEV_URL = 'ws://localhost:8080/ws';

/**
 * returns websocket url with proper protocol validation
 * production requires wss:// and VITE_APP_CHALLENGES_API_URL to be set
 * development falls back to local websocket if not configured
 */
export function getWebSocketUrl(): string {
  const envUrl = import.meta.env.VITE_APP_CHALLENGES_API_URL;
  const isProd = import.meta.env.PROD;

  if (!envUrl) {
    if (isProd) {
      throw new Error('VITE_APP_CHALLENGES_API_URL required in production');
    }
    return DEFAULT_DEV_URL;
  }

  if (isProd && envUrl.startsWith('ws://')) {
    throw new Error('Secure WebSocket (wss://) required in production');
  }

  return envUrl;
}
