/**
 * JSON-RPC message helpers for the browser ↔ backend WebSocket protocol.
 */

let _nextId = 1;

export function nextId(): number {
  return _nextId++;
}

export interface WsConnectMessage {
  type: 'connect';
  id: number;
  config: StdioConfig | SseConfig | StreamableHttpConfig;
}

export interface StdioConfig {
  transport: 'stdio';
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface SseConfig {
  transport: 'sse';
  url: string;
}

export interface StreamableHttpConfig {
  transport: 'streamable-http';
  url: string;
}

export type ServerConfig = StdioConfig | SseConfig | StreamableHttpConfig;

export interface WsDisconnectMessage {
  type: 'disconnect';
  id: number;
}

export interface WsRequestMessage {
  type: 'request';
  id: number;
  method: string;
  params?: Record<string, any>;
}

export interface WsPingMessage {
  type: 'ping';
  id: number;
}

export type WsOutgoingMessage =
  | WsConnectMessage
  | WsDisconnectMessage
  | WsRequestMessage
  | WsPingMessage;

export interface WsConnectedResponse {
  type: 'connected';
  id?: number;
  serverInfo?: any;
  capabilities?: any;
  timestamp: number;
}

export interface WsDisconnectedResponse {
  type: 'disconnected';
  id?: number;
  reason?: string;
}

export interface WsResponse {
  type: 'response';
  id?: number;
  method: string;
  result?: any;
  error?: { code: number; message: string; data?: any };
  duration: number;
  timestamp: number;
}

export interface WsNotification {
  type: 'notification';
  method: string;
  params?: any;
  timestamp: number;
}

export interface WsErrorResponse {
  type: 'error';
  id?: number;
  error: { code: number; message: string };
  message?: string;
}

export type WsIncomingMessage =
  | WsConnectedResponse
  | WsDisconnectedResponse
  | WsResponse
  | WsNotification
  | WsErrorResponse;
