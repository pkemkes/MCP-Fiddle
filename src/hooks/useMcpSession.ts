import { useCallback, useEffect, useReducer, useRef } from 'react';
import { nextId, ServerConfig, WsIncomingMessage } from '../lib/jsonRpc';

export type McpConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface LogEntry {
  id: number;
  direction: 'client' | 'server';
  type: 'request' | 'response' | 'notification' | 'error' | 'system';
  method?: string;
  data: any;
  timestamp: number;
  duration?: number;
}

export interface McpSessionState {
  connectionStatus: McpConnectionStatus;
  serverInfo: any | null;
  capabilities: any | null;
  tools: any[];
  resources: any[];
  resourceTemplates: any[];
  prompts: any[];
  log: LogEntry[];
  error: string | null;
}

type Action =
  | { type: 'CONNECTING' }
  | { type: 'CONNECTED'; serverInfo: any; capabilities: any }
  | { type: 'DISCONNECTED'; reason?: string }
  | { type: 'ADD_LOG'; entry: LogEntry }
  | { type: 'SET_TOOLS'; tools: any[] }
  | { type: 'SET_RESOURCES'; resources: any[] }
  | { type: 'SET_RESOURCE_TEMPLATES'; templates: any[] }
  | { type: 'SET_PROMPTS'; prompts: any[] }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_LOG' };

const initialState: McpSessionState = {
  connectionStatus: 'disconnected',
  serverInfo: null,
  capabilities: null,
  tools: [],
  resources: [],
  resourceTemplates: [],
  prompts: [],
  log: [],
  error: null,
};

let logIdCounter = 0;

function reducer(state: McpSessionState, action: Action): McpSessionState {
  switch (action.type) {
    case 'CONNECTING':
      return { ...state, connectionStatus: 'connecting', error: null };
    case 'CONNECTED':
      return {
        ...state,
        connectionStatus: 'connected',
        serverInfo: action.serverInfo,
        capabilities: action.capabilities,
        error: null,
      };
    case 'DISCONNECTED':
      return {
        ...initialState,
        log: state.log,
        connectionStatus: 'disconnected',
      };
    case 'ADD_LOG':
      return { ...state, log: [...state.log, action.entry] };
    case 'SET_TOOLS':
      return { ...state, tools: action.tools };
    case 'SET_RESOURCES':
      return { ...state, resources: action.resources };
    case 'SET_RESOURCE_TEMPLATES':
      return { ...state, resourceTemplates: action.templates };
    case 'SET_PROMPTS':
      return { ...state, prompts: action.prompts };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'CLEAR_LOG':
      return { ...state, log: [] };
    default:
      return state;
  }
}

interface UseMcpSessionParams {
  send: (msg: any) => void;
  addMessageListener: (listener: (msg: WsIncomingMessage) => void) => () => void;
}

export interface UseMcpSessionReturn {
  state: McpSessionState;
  connect: (config: ServerConfig) => void;
  disconnect: () => void;
  sendRequest: (method: string, params?: Record<string, any>) => void;
  ping: () => void;
  clearLog: () => void;
}

export function useMcpSession({
  send,
  addMessageListener,
}: UseMcpSessionParams): UseMcpSessionReturn {
  const [state, dispatch] = useReducer(reducer, initialState);
  const pendingRequests = useRef<Map<number, { method: string; timestamp: number }>>(new Map());

  // Listen for incoming messages
  useEffect(() => {
    const unsubscribe = addMessageListener((msg: WsIncomingMessage) => {
      switch (msg.type) {
        case 'connected': {
          dispatch({
            type: 'CONNECTED',
            serverInfo: msg.serverInfo,
            capabilities: msg.capabilities,
          });
          dispatch({
            type: 'ADD_LOG',
            entry: {
              id: ++logIdCounter,
              direction: 'server',
              type: 'system',
              method: 'initialize',
              data: { serverInfo: msg.serverInfo, capabilities: msg.capabilities },
              timestamp: msg.timestamp,
            },
          });
          break;
        }

        case 'disconnected': {
          dispatch({ type: 'DISCONNECTED', reason: msg.reason });
          dispatch({
            type: 'ADD_LOG',
            entry: {
              id: ++logIdCounter,
              direction: 'server',
              type: 'system',
              method: 'disconnect',
              data: { reason: msg.reason },
              timestamp: Date.now(),
            },
          });
          break;
        }

        case 'response': {
          const pending = msg.id !== undefined ? pendingRequests.current.get(msg.id) : undefined;
          if (pending) {
            pendingRequests.current.delete(msg.id!);
          }

          const entry: LogEntry = {
            id: ++logIdCounter,
            direction: 'server',
            type: msg.error ? 'error' : 'response',
            method: msg.method,
            data: msg.error || msg.result,
            timestamp: msg.timestamp,
            duration: msg.duration,
          };
          dispatch({ type: 'ADD_LOG', entry });

          // Auto-populate discovered items
          if (!msg.error && msg.result) {
            if (msg.method === 'tools/list' && msg.result.tools) {
              dispatch({ type: 'SET_TOOLS', tools: msg.result.tools });
            } else if (msg.method === 'resources/list' && msg.result.resources) {
              dispatch({ type: 'SET_RESOURCES', resources: msg.result.resources });
            } else if (msg.method === 'resources/templates/list' && msg.result.resourceTemplates) {
              dispatch({ type: 'SET_RESOURCE_TEMPLATES', templates: msg.result.resourceTemplates });
            } else if (msg.method === 'prompts/list' && msg.result.prompts) {
              dispatch({ type: 'SET_PROMPTS', prompts: msg.result.prompts });
            }
          }
          break;
        }

        case 'notification': {
          dispatch({
            type: 'ADD_LOG',
            entry: {
              id: ++logIdCounter,
              direction: 'server',
              type: 'notification',
              method: msg.method,
              data: msg.params,
              timestamp: msg.timestamp,
            },
          });
          break;
        }

        case 'error': {
          const errorMsg = msg.error?.message || msg.message || 'Unknown error';
          dispatch({ type: 'SET_ERROR', error: errorMsg });
          dispatch({
            type: 'ADD_LOG',
            entry: {
              id: ++logIdCounter,
              direction: 'server',
              type: 'error',
              data: msg.error || { message: errorMsg },
              timestamp: Date.now(),
            },
          });
          break;
        }
      }
    });

    return unsubscribe;
  }, [addMessageListener]);

  const connect = useCallback(
    (config: ServerConfig) => {
      dispatch({ type: 'CONNECTING' });
      const id = nextId();
      dispatch({
        type: 'ADD_LOG',
        entry: {
          id: ++logIdCounter,
          direction: 'client',
          type: 'request',
          method: 'connect',
          data: config,
          timestamp: Date.now(),
        },
      });
      send({ type: 'connect', id, config });
    },
    [send],
  );

  const disconnect = useCallback(() => {
    const id = nextId();
    dispatch({
      type: 'ADD_LOG',
      entry: {
        id: ++logIdCounter,
        direction: 'client',
        type: 'request',
        method: 'disconnect',
        data: {},
        timestamp: Date.now(),
      },
    });
    send({ type: 'disconnect', id });
  }, [send]);

  const sendRequest = useCallback(
    (method: string, params?: Record<string, any>) => {
      const id = nextId();
      pendingRequests.current.set(id, { method, timestamp: Date.now() });
      dispatch({
        type: 'ADD_LOG',
        entry: {
          id: ++logIdCounter,
          direction: 'client',
          type: 'request',
          method,
          data: params || {},
          timestamp: Date.now(),
        },
      });
      send({ type: 'request', id, method, params });
    },
    [send],
  );

  const ping = useCallback(() => {
    const id = nextId();
    pendingRequests.current.set(id, { method: 'ping', timestamp: Date.now() });
    dispatch({
      type: 'ADD_LOG',
      entry: {
        id: ++logIdCounter,
        direction: 'client',
        type: 'request',
        method: 'ping',
        data: {},
        timestamp: Date.now(),
      },
    });
    send({ type: 'ping', id });
  }, [send]);

  const clearLog = useCallback(() => {
    dispatch({ type: 'CLEAR_LOG' });
  }, []);

  return { state, connect, disconnect, sendRequest, ping, clearLog };
}
