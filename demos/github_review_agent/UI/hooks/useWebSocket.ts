/**
 * useWebSocket Hook
 * 
 * A reusable React hook for managing WebSocket connections with real-time messaging.
 * Designed specifically for Human-in-the-Loop (HITL) agent conversations.
 * 
 * Features:
 * - Automatic connection management
 * - Real-time message handling
 * - User input request handling
 * - Error handling and timeout management
 * - Conversation completion detection
 * - Cleanup on unmount
 * 
 * Usage:
 * ```typescript
 * const {
 *   isConnected,
 *   wsLoading,
 *   wsError,
 *   connect,
 *   sendMessage,
 *   sendUserInput
 * } = useWebSocket({
 *   endpoint: '/ws/your-endpoint',
 *   onMessage: (message) => console.log(message),
 *   onUserInputRequested: (prompt) => setShowInput(true),
 *   onError: (error) => setError(error),
 *   onComplete: () => setIsLoading(false)
 * });
 * ```
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '../config/config';

export interface WebSocketMessage {
  content: string;
  source: string;
  type?: string;
  prompt?: string;
}

export interface UseWebSocketOptions {
  endpoint: string;
  onMessage?: (message: WebSocketMessage) => void;
  onUserInputRequested?: (prompt: string) => void;
  onError?: (error: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onComplete?: () => void;
  timeout?: number;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  wsLoading: boolean;
  wsError: string;
  connect: () => WebSocket | null;
  disconnect: () => void;
  sendMessage: (content: string, source?: string) => void;
  sendUserInput: (content: string) => void;
}

export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const {
    endpoint,
    onMessage,
    onUserInputRequested,
    onError,
    onConnect,
    onDisconnect,
    onComplete,
    timeout = 300000 // 5 minutes default
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [wsLoading, setWsLoading] = useState(false);
  const [wsError, setWsError] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearTimeout = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsConnected(false);
    setWsLoading(false);
    clearTimeout();
  }, [clearTimeout]);

  const connect = useCallback(() => {
    try {
      const wsUrl = API_BASE_URL.replace('http', 'ws') + endpoint;
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setWsError('');
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          console.log('WebSocket message received:', event.data);
          
          // Handle non-JSON messages gracefully
          if (typeof event.data === 'string' && !event.data.trim().startsWith('{')) {
            console.log('Non-JSON message received:', event.data);
            return;
          }
          
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('Parsed WebSocket message:', message);
          
                     if (message.type === 'user_input_requested') {
             console.log('User input requested:', message.prompt);
             onUserInputRequested?.(message.prompt || 'Please provide input:');
             setWsLoading(false);
             
             // Set timeout for user input
             timeoutRef.current = window.setTimeout(() => {
               console.log('Frontend timeout detected - no response from user');
               const timeoutError = 'Timeout: No response received. Please try again.';
               setWsError(timeoutError);
               onError?.(timeoutError);
               disconnect();
               onComplete?.(); 
             }, timeout);
           } else if (message.type === 'error') {
             console.log('Error message received:', message.content);
             setWsError(message.content);
             onError?.(message.content);
             setWsLoading(false);
             
             if (message.content.includes('Connection closed') || message.content.includes('timeout')) {
               disconnect();
             }
           } else {
             console.log('Agent message received from:', message.source, 'Content:', message.content?.substring(0, 100));
             
             // Clear any previous errors since we're receiving valid messages
             if (wsError) {
               setWsError('');
             }
             
             onMessage?.(message);
             
             // Check if this is a termination message
             if (message.content?.includes('TERMINATE')) {
               console.log('Conversation terminated');
               onComplete?.();
             }
           }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, 'Raw data:', event.data);
          console.warn('Skipping malformed message, continuing...');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        const errorMsg = 'WebSocket connection error. Please try again.';
        setWsError(errorMsg);
        onError?.(errorMsg);
        setWsLoading(false);
        setIsConnected(false);
        onComplete?.(); 
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        setWsLoading(false);
        clearTimeout();
        onDisconnect?.();
        onComplete?.(); 
      };

      return ws;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      const errorMsg = 'Failed to create WebSocket connection. Please try again.';
      setWsError(errorMsg);
      onError?.(errorMsg);
      setWsLoading(false);
      return null;
    }
  }, [endpoint, onMessage, onUserInputRequested, onError, onConnect, onDisconnect, onComplete, timeout, wsError, clearTimeout]);

  const sendMessage = useCallback((content: string, source: string = 'user') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ content, source }));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  const sendUserInput = useCallback((content: string) => {
    clearTimeout(); // Clear timeout since user is responding
    sendMessage(content, 'user');
  }, [sendMessage, clearTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    wsLoading,
    wsError,
    connect,
    disconnect,
    sendMessage,
    sendUserInput
  };
}; 
