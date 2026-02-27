import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

interface ActiveSession {
  client: Client;
  transport: Transport;
  connected: boolean;
}

/**
 * Sets up a WebSocket server at /ws that relays messages between
 * the browser and an MCP server.
 */
export function setupWebSocketRelay(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WS] Browser client connected');
    let session: ActiveSession | null = null;

    ws.on('message', async (data: Buffer) => {
      let msg: any;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        sendError(ws, null, -32700, 'Parse error');
        return;
      }

      try {
        await handleMessage(ws, msg, session, (s) => {
          session = s;
        });
      } catch (err: any) {
        console.error('[WS] Error handling message:', err);
        sendError(ws, msg.id ?? null, -32603, err.message || 'Internal error');
      }
    });

    ws.on('close', async () => {
      console.log('[WS] Browser client disconnected');
      if (session) {
        try {
          await session.client.close();
        } catch {
          // Ignore
        }
        try {
          await session.transport.close();
        } catch {
          // Ignore
        }
        session = null;
      }
    });
  });

  console.log('[WS] WebSocket relay ready on /ws');
}

async function handleMessage(
  ws: WebSocket,
  msg: any,
  session: ActiveSession | null,
  setSession: (s: ActiveSession | null) => void,
): Promise<void> {
  const { type, id } = msg;

  switch (type) {
    case 'connect': {
      // Close existing session if any
      if (session) {
        try { await session.client.close(); } catch {}
        try { await session.transport.close(); } catch {}
        setSession(null);
      }

      const { config } = msg;
      let transport: Transport;

      if (config.transport === 'stdio') {
        const env = { ...process.env, ...(config.env || {}) };
        transport = new StdioClientTransport({
          command: config.command,
          args: config.args || [],
          env,
        });
      } else if (config.transport === 'sse') {
        transport = new SSEClientTransport(new URL(config.url));
      } else if (config.transport === 'streamable-http') {
        transport = new StreamableHTTPClientTransport(new URL(config.url));
      } else {
        sendError(ws, id, -32602, `Unknown transport: ${config.transport}`);
        return;
      }

      // Intercept transport messages to capture notifications
      const origOnMessage = transport.onmessage;
      transport.onmessage = (message: any) => {
        // Forward all server-initiated messages (notifications) to the browser
        if ('method' in message && !('id' in message)) {
          sendToClient(ws, {
            type: 'notification',
            method: message.method,
            params: message.params,
            timestamp: Date.now(),
          });
        }
        if (origOnMessage) origOnMessage(message);
      };

      transport.onclose = () => {
        sendToClient(ws, { type: 'disconnected', reason: 'Transport closed' });
        setSession(null);
      };

      transport.onerror = (err: Error) => {
        sendToClient(ws, { type: 'error', message: err.message });
      };

      const client = new Client(
        { name: 'mcp-fiddle', version: '1.0.0' },
        { capabilities: {} },
      );

      // Capture all notifications through the client's fallback handler
      client.fallbackNotificationHandler = async (notification: any) => {
        sendToClient(ws, {
          type: 'notification',
          method: notification.method,
          params: notification.params,
          timestamp: Date.now(),
        });
      };

      try {
        await client.connect(transport);
        const newSession: ActiveSession = { client, transport, connected: true };
        setSession(newSession);

        // The connect call performs initialize + initialized automatically
        sendToClient(ws, {
          type: 'connected',
          id,
          serverInfo: client.getServerVersion(),
          capabilities: client.getServerCapabilities(),
          timestamp: Date.now(),
        });
      } catch (err: any) {
        sendError(ws, id, -32000, `Connection failed: ${err.message}`);
        try { await transport.close(); } catch {}
      }
      break;
    }

    case 'disconnect': {
      if (session) {
        try { await session.client.close(); } catch {}
        try { await session.transport.close(); } catch {}
        setSession(null);
      }
      sendToClient(ws, { type: 'disconnected', id, reason: 'User requested' });
      break;
    }

    case 'request': {
      if (!session || !session.connected) {
        sendError(ws, id, -32000, 'Not connected to any MCP server');
        return;
      }

      const { method, params } = msg;
      const startTime = Date.now();

      try {
        const result = await dispatchMcpRequest(session.client, method, params || {});
        const duration = Date.now() - startTime;
        sendToClient(ws, {
          type: 'response',
          id,
          method,
          result,
          duration,
          timestamp: Date.now(),
        });
      } catch (err: any) {
        const duration = Date.now() - startTime;
        sendToClient(ws, {
          type: 'response',
          id,
          method,
          error: {
            code: err.code || -32603,
            message: err.message || 'Unknown error',
            data: err.data,
          },
          duration,
          timestamp: Date.now(),
        });
      }
      break;
    }

    case 'ping': {
      if (!session || !session.connected) {
        sendError(ws, id, -32000, 'Not connected');
        return;
      }
      const startTime = Date.now();
      try {
        await session.client.ping();
        sendToClient(ws, {
          type: 'response',
          id,
          method: 'ping',
          result: {},
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        });
      } catch (err: any) {
        sendError(ws, id, -32603, err.message);
      }
      break;
    }

    default:
      sendError(ws, id, -32601, `Unknown message type: ${type}`);
  }
}

/**
 * Dispatches an MCP method call to the connected client.
 */
async function dispatchMcpRequest(
  client: Client,
  method: string,
  params: Record<string, any>,
): Promise<any> {
  switch (method) {
    case 'ping':
      return client.ping();

    case 'tools/list':
      return client.listTools(params);

    case 'tools/call':
      return client.callTool({
        name: params.name,
        arguments: params.arguments || {},
      });

    case 'resources/list':
      return client.listResources(params);

    case 'resources/read':
      return client.readResource({ uri: params.uri });

    case 'resources/templates/list':
      return client.listResourceTemplates(params);

    case 'prompts/list':
      return client.listPrompts(params);

    case 'prompts/get':
      return client.getPrompt({
        name: params.name,
        arguments: params.arguments || {},
      });

    case 'logging/setLevel':
      return client.setLoggingLevel(params.level);

    case 'completion/complete':
      return client.complete({
        ref: params.ref,
        argument: params.argument,
      });

    default:
      // Generic request passthrough
      return client.request({ method, params } as any, {} as any);
  }
}

function sendToClient(ws: WebSocket, data: any): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function sendError(ws: WebSocket, id: any, code: number, message: string): void {
  sendToClient(ws, { type: 'error', id, error: { code, message } });
}
