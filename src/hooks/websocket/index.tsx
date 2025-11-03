import { wait } from '@/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/utils/logger';

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

export interface MessageSubscription {
  handler: (message: any) => void;
  messageTypes?: string[]; // Filter by message types
}

export interface WebSocketHookReturn {
  isConnected: boolean;
  error: string | null;
  loading: boolean;
  connect: () => void;
  disconnect: () => void;
  sendMessage: <T = any>(message: WebSocketMessage) => Promise<T>;
  subscribe: (messageHandler: (message: any) => void, messageTypes?: string[]) => () => void;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: Error) => void;
  timeout: number;
}

// TODO Bundle all constants into single file
const WS_MAX_TIMEOUT = 30000;
const MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB max message size

// TODO: clear this mess, we don't need request id
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
  const messageSubscriptions = useRef<Set<MessageSubscription>>(new Set());

  const generateRequestId = () => {
    const buffer = new Uint8Array(16);
    crypto.getRandomValues(buffer);
    return Array.from(buffer, b => b.toString(16).padStart(2, '0')).join('');
  };

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
        const messageString = JSON.stringify(message);

        // Check message size
        if (messageString.length > MAX_MESSAGE_SIZE) {
          throw new Error(`Message too large: ${messageString.length} bytes (max ${MAX_MESSAGE_SIZE})`);
        }

        ws.current.send(messageString);
      } catch (err) {
        clearTimeout(timeout);
        pendingRequests.current.delete(requestId);
        reject(err instanceof Error ? err : new Error('Failed to send message'));
      }
    });
  }, [requestTimeout]);

  /**
   * Subscribe to WebSocket messages with optional type filtering.
   * SolidJS-style fine-grained subscriptions - only receive messages you care about.
   * @param messageHandler - Handler function to call when matching message arrives
   * @param messageTypes - Optional array of message types to filter (undefined = all messages)
   * @returns Unsubscribe function
   */
  const subscribe = useCallback((
    messageHandler: (message: any) => void,
    messageTypes?: string[]
  ): (() => void) => {
    const subscription: MessageSubscription = {
      handler: messageHandler,
      messageTypes
    };

    messageSubscriptions.current.add(subscription);

    return () => {
      messageSubscriptions.current.delete(subscription);
    };
  }, []);

  /**
   * Handles incoming WebSocket messages, resolves pending requests and notifies subscribers.
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      logger.log('WebSocket message received:', message);

      // Validate message structure
      if (message === null || message === undefined) {
        logger.error('Invalid message: null or undefined');
        return;
      }

      // Handle array responses (search results) - resolve the oldest pending request
      if (Array.isArray(message)) {
        const oldestRequest = pendingRequests.current.values().next().value;
        if (oldestRequest) {
          clearTimeout(oldestRequest.timeout);
          oldestRequest.resolve(message);
          // Find and delete the requestId
          for (const [id, req] of pendingRequests.current.entries()) {
            if (req === oldestRequest) {
              pendingRequests.current.delete(id);
              break;
            }
          }
          return;
        }
        // If no pending requests, notify subscribers
        for (const { handler } of messageSubscriptions.current) {
          try {
            handler(message);
          } catch (err) {
            logger.error('Error in message handler:', err);
          }
        }
        return;
      }

      if (typeof message !== 'object') {
        logger.error('Invalid message: not an object or array');
        return;
      }

      const requestId = message.requestId;

      // If message has requestId, it's a response to a specific request
      if (requestId) {
        const request = pendingRequests.current.get(requestId);
        if (request) {
          clearTimeout(request.timeout);
          request.resolve(message);
          pendingRequests.current.delete(requestId);
          return; // Don't notify subscribers for request/response messages
        } else {
          // Received response for unknown/expired request - possible attack
          logger.warn('Received response for unknown request ID', { requestId });
          return;
        }
      }

      // No requestId - this is a push notification/broadcast
      // Only notify subscribers, never resolve pending requests
      for (const { handler, messageTypes } of messageSubscriptions.current) {
        // Skip if subscriber has type filter and message type doesn't match
        if (messageTypes && messageTypes.length > 0) {
          if (!message.type || !messageTypes.includes(message.type)) {
            continue; // Don't call handler for unmatched types
          }
        }

        try {
          handler(message);
        } catch (err) {
          logger.error('Error in message handler:', err);
        }
      }
    } catch (err) {
      logger.error('Failed to parse WebSocket message:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse message');
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
    messageSubscriptions.current.clear();

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
      return;
    }

    if (isReconnecting.current || (ws.current && ws.current.readyState === WebSocket.CONNECTING)) {
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
      reconnectTimeout.current = window.setTimeout(() => {
        connect();
      }, backoffDelay - timeSinceLastAttempt);
      return;
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
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
      logger.info(`🔌 Connecting to WebSocket: ${url}`);
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        logger.info(`✅ WebSocket connected to ${url}, attempt: ${connectionAttempts.current}`);
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
