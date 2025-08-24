import { useCallback } from 'react'
import { useWebSocket, WebSocketConfig, WebSocketMessage } from './websocket'

export interface GenericWebSocketConfig extends WebSocketConfig {
  messageHandler?: (message: any) => any
}

export function useGenericWebSocket<T = any>(
  config: GenericWebSocketConfig,
  messageHandler?: (message: any) => T
) {
  const { 
    isConnected, 
    error, 
    loading, 
    connect, 
    disconnect, 
    sendMessage, 
    subscribe 
  } = useWebSocket(config)

  const sendTypedMessage = useCallback(async <R = any>(
    message: WebSocketMessage
  ): Promise<R> => {
    const response = await sendMessage<R>(message)
    return messageHandler ? messageHandler(response) : response
  }, [sendMessage, messageHandler])

  const subscribeWithHandler = useCallback((
    handler: (message: T) => void
  ) => {
    return subscribe((message) => {
      const processed = messageHandler ? messageHandler(message) : message
      handler(processed)
    })
  }, [subscribe, messageHandler])

  return {
    isConnected,
    error,
    loading,
    connect,
    disconnect,
    sendMessage: sendTypedMessage,
    subscribe: subscribeWithHandler,
  }
}