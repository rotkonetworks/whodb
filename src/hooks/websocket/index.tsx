import { wait } from '@/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface WebSocketMessage {
  id?: number | string;
  version?: string;
  type: string;
  payload?: any;
}

export interface WebSocketConfig {
  url: string;
  autoConnect?: boolean;
  reconnectEnabled?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  requestTimeout?: number;
}

export interface WebSocketHookReturn {
  isConnected: boolean;
  error: string | null;
  loading: boolean;
  connect: () => void;
  disconnect: () => void;
  sendMessage: <T = any>(message: WebSocketMessage) => Promise<T>;
  subscribe: (messageHandler: (message: any) => void) => () => void;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: Error) => void;
  timeout: number;
}

// TODO Bundle all constants into single file
const WS_MAX_TIMEOUT = 30000;

/**
 * Main WebSocket hook that provides generic WebSocket connection management
 * with automatic reconnection, request/response handling, and subscription capabilities.
 */
export const useWebSocket = (config: WebSocketConfig): WebSocketHookReturn => {
  const {
    url,
    autoConnect = true,
    reconnectEnabled = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 1000,
    maxReconnectDelay = 30000,
    requestTimeout = 30000,
  } = config;

  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Connection state management
  const connectionAttempts = useRef(0);
  const lastConnectionAttempt = useRef(0);
  const reconnectTimeout = useRef<number | null>(null);
  const isReconnecting = useRef(false);

  // Request/Response handling
  const pendingRequests = useRef<Map<string, PendingRequest>>(new Map());
  const messageHandlers = useRef<Set<(message: any) => void>>(new Set());

  const generateRequestId = () => Math.random().toString(36).substring(7);

  const cleanupPendingRequests = useCallback(() => {
    for (const [, { reject, timeout }] of pendingRequests.current.entries()) {
      clearTimeout(timeout);
      reject(new Error('WebSocket disconnected'));
    }
    pendingRequests.current.clear();
  }, []);

  /**
   * Sends a message over WebSocket and returns a promise that resolves with the response.
   * Automatically adds version information and handles request/response correlation.
   */
  const sendMessage = useCallback(<T = any>(message: WebSocketMessage): Promise<T> => {
    return new Promise(async (resolve, reject) => {
      const startTimeMillis = Date.now();
      while (Date.now() - startTimeMillis < WS_MAX_TIMEOUT) {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          break;
        }
        await wait(100);
      }
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        return reject(new Error('WebSocket is not connected'));
      }

      const requestId = generateRequestId();
      const versionedMessage = {
        id: requestId,
        version: '1.0',
        ...message,
      };

      const timeout = window.setTimeout(() => {
        const request = pendingRequests.current.get(requestId);
        if (request) {
          request.reject(new Error('Request timeout'));
          pendingRequests.current.delete(requestId);
        }
      }, requestTimeout);

      pendingRequests.current.set(requestId, {
        resolve,
        reject,
        timeout,
      });

      try {
        ws.current.send(JSON.stringify(versionedMessage));
        console.log('WebSocket message sent:', versionedMessage);
      } catch (err) {
        clearTimeout(timeout);
        pendingRequests.current.delete(requestId);
        reject(err instanceof Error ? err : new Error('Failed to send message'));
      }
    });
  }, [requestTimeout]);

  /**
   * Subscribe to WebSocket messages. Returns unsubscribe function.
   */
  const subscribe = useCallback((messageHandler: (message: any) => void): (() => void) => {
    messageHandlers.current.add(messageHandler);
    
    return () => {
      messageHandlers.current.delete(messageHandler);
    };
  }, []);

  /**
   * Handles incoming WebSocket messages, resolves pending requests and notifies subscribers.
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      console.log('WebSocket message received:', message);

      // Check if this is a response to a pending request
      const requestId = message.requestId;
      if (requestId && pendingRequests.current.has(requestId)) {
        const request = pendingRequests.current.get(requestId);
        if (request) {
          clearTimeout(request.timeout);
          request.resolve(message);
          pendingRequests.current.delete(requestId);
          return; // Don't notify subscribers for request/response messages
        }
      }

      // Resolve all pending messages, if responses don't have a requestId
      for (const [requestId, { resolve, timeout }] of pendingRequests.current.entries()) {
        clearTimeout(timeout);
        resolve(message);
        pendingRequests.current.delete(requestId);
      }

      // Notify all subscribers
      for (const handler of messageHandlers.current) {
        try {
          handler(message);
        } catch (err) {
          console.error('Error in message handler:', err);
        }
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse message');
      // Handle all rejected promises, if responses don't have a requestId
      for (const [requestId, { reject, timeout }] of pendingRequests.current.entries()) {
        clearTimeout(timeout);
        reject(err instanceof Error ? err : new Error('Failed to parse message'));
        pendingRequests.current.delete(requestId);
      }
    }

  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    isReconnecting.current = false;
    connectionAttempts.current = 0;
    lastConnectionAttempt.current = 0;

    cleanupPendingRequests();
    messageHandlers.current.clear();

    if (ws.current) {
      if (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING) {
        ws.current.onopen = null;
        ws.current.onerror = null;
        ws.current.onmessage = null;
        ws.current.onclose = null;
        ws.current.close();
      }
      ws.current = null;
    }

    setLoading(false);
    setIsConnected(false);
    setError(null);
  }, [cleanupPendingRequests]);

  const connect = useCallback(() => {
    if (!url) {
      console.warn('Cannot connect: WebSocket URL is required');
      return;
    }

    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectionAttempt.current;

    // Throttle connection attempts
    if (timeSinceLastAttempt < 1000) {
      console.log('Connection attempt throttled, too soon since last attempt');
      return;
    }

    if (isReconnecting.current || (ws.current && ws.current.readyState === WebSocket.CONNECTING)) {
      console.log('Connection attempt prevented - already connecting');
      return;
    }

    lastConnectionAttempt.current = now;
    connectionAttempts.current += 1;

    // Apply exponential backoff
    const backoffDelay = Math.min(
      reconnectDelay * Math.pow(2, Math.min(connectionAttempts.current - 1, 5)),
      maxReconnectDelay
    );

    if (connectionAttempts.current > 1 && timeSinceLastAttempt < backoffDelay) {
      console.log(`Connection backoff: waiting ${backoffDelay}ms before attempt ${connectionAttempts.current}`);
      reconnectTimeout.current = window.setTimeout(() => {
        connect();
      }, backoffDelay - timeSinceLastAttempt);
      return;
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    console.log(`Attempting WebSocket connection #${connectionAttempts.current} to ${url}`);
    setLoading(true);
    setIsConnected(false);
    setError(null);
    isReconnecting.current = true;

    // Clean up existing connection
    if (ws.current) {
      ws.current.onopen = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;
      ws.current.onclose = null;
      ws.current.close();
    }

    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('WebSocket connected, attempt:', connectionAttempts.current);
        setIsConnected(true);
        setError(null);
        setLoading(false);
        isReconnecting.current = false;
        connectionAttempts.current = 0;
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket closed, code:', event.code, 'attempt:', connectionAttempts.current);
        setIsConnected(false);
        isReconnecting.current = false;

        // Attempt to reconnect on unexpected closure
        if (
          reconnectEnabled &&
          event.code !== 1000 && // Normal closure
          event.code !== 1001 && // Going away
          connectionAttempts.current < maxReconnectAttempts
        ) {
          const reconnectDelayMs = Math.min(
            reconnectDelay * Math.pow(1.5, Math.min(connectionAttempts.current, 5)),
            maxReconnectDelay
          );
          console.log(`Scheduling reconnection in ${reconnectDelayMs}ms`);
          reconnectTimeout.current = window.setTimeout(() => {
            if (!isReconnecting.current) {
              console.log('Attempting to reconnect...');
              connect();
            }
          }, reconnectDelayMs);
        } else {
          setLoading(false);
          connectionAttempts.current = 0;
          if (connectionAttempts.current >= maxReconnectAttempts) {
            setError('Max reconnection attempts reached');
          }
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error, 'attempt:', connectionAttempts.current);
        setError('WebSocket connection failed');
        isReconnecting.current = false;
        setLoading(false);
      };

      ws.current.onmessage = handleMessage;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setError('Failed to create WebSocket connection');
      isReconnecting.current = false;
      setLoading(false);
    }
  }, [
    url,
    reconnectEnabled,
    maxReconnectAttempts,
    reconnectDelay,
    maxReconnectDelay,
    handleMessage,
  ]);

  // Initialize connection when configuration changes
  useEffect(() => {
    if (autoConnect && url) {
      const timeoutId = setTimeout(() => {
        connect();
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        disconnect();
      };
    } else {
      disconnect();
    }
  }, [url, autoConnect, connect, disconnect]);

  return {
    isConnected,
    error,
    loading,
    connect,
    disconnect,
    sendMessage,
    subscribe,
  };
};
