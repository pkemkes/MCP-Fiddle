import { useCallback, useEffect, useRef, useState } from 'react';
import { WsIncomingMessage, WsOutgoingMessage } from '../lib/jsonRpc';

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface UseWebSocketReturn {
  wsState: ConnectionState;
  send: (msg: WsOutgoingMessage) => void;
  lastMessage: WsIncomingMessage | null;
  addMessageListener: (listener: (msg: WsIncomingMessage) => void) => () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [wsState, setWsState] = useState<ConnectionState>('disconnected');
  const [lastMessage, setLastMessage] = useState<WsIncomingMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<(msg: WsIncomingMessage) => void>>(new Set());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setWsState('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsState('connected');
      console.log('[WS] Connected to backend');
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsIncomingMessage = JSON.parse(event.data);
        setLastMessage(msg);
        listenersRef.current.forEach((listener) => listener(msg));
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    };

    ws.onclose = () => {
      setWsState('disconnected');
      wsRef.current = null;
      // Auto-reconnect after 2 seconds
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: WsOutgoingMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      console.warn('[WS] Cannot send, socket not open');
    }
  }, []);

  const addMessageListener = useCallback(
    (listener: (msg: WsIncomingMessage) => void) => {
      listenersRef.current.add(listener);
      return () => {
        listenersRef.current.delete(listener);
      };
    },
    [],
  );

  return { wsState, send, lastMessage, addMessageListener };
}
