import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

export type TransportType = 'stdio' | 'sse' | 'streamable-http';

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

export interface McpSession {
  client: Client;
  transport: Transport;
  process?: ChildProcessWithoutNullStreams;
}

/**
 * Creates and connects an MCP client based on the provided config.
 * Returns the session with client, transport, and optional child process.
 */
export async function createMcpSession(
  config: ServerConfig,
  onNotification?: (method: string, params: unknown) => void,
  onClose?: () => void,
  onError?: (error: Error) => void,
): Promise<McpSession> {
  let transport: Transport;
  let childProcess: ChildProcessWithoutNullStreams | undefined;

  if (config.transport === 'stdio') {
    const merged: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined) merged[k] = v;
    }
    Object.assign(merged, config.env || {});
    const stdioTransport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: merged,
    });
    transport = stdioTransport;
  } else if (config.transport === 'sse') {
    const sseTransport = new SSEClientTransport(new URL(config.url));
    transport = sseTransport;
  } else {
    const httpTransport = new StreamableHTTPClientTransport(new URL(config.url));
    transport = httpTransport;
  }

  const client = new Client(
    { name: 'mcp-fiddle', version: '1.0.0' },
    { capabilities: {} },
  );

  // Set up notification forwarding
  if (onNotification) {
    client.setNotificationHandler(
      { method: '' } as any,
      async (notification: any) => {
        onNotification(notification.method, notification.params);
      },
    );

    // Fallback: capture all notifications via transport
    const origOnMessage = transport.onmessage;
    transport.onmessage = (message: JSONRPCMessage) => {
      // Forward server notifications
      if ('method' in message && !('id' in message)) {
        onNotification(message.method, 'params' in message ? message.params : undefined);
      }
      if (origOnMessage) {
        origOnMessage(message);
      }
    };
  }

  if (onClose) {
    transport.onclose = onClose;
  }

  if (onError) {
    transport.onerror = onError;
  }

  return { client, transport, process: childProcess };
}

/**
 * Destroys an MCP session, closing the client and killing any spawned process.
 */
export async function destroyMcpSession(session: McpSession): Promise<void> {
  try {
    await session.client.close();
  } catch {
    // Ignore close errors
  }
  try {
    await session.transport.close();
  } catch {
    // Ignore
  }
  if (session.process) {
    session.process.kill('SIGTERM');
  }
}
