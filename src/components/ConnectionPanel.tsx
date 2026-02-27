import React, { useState } from 'react';
import { ServerConfig } from '../lib/jsonRpc';
import { McpConnectionStatus } from '../hooks/useMcpSession';

interface ConnectionPanelProps {
  connectionStatus: McpConnectionStatus;
  serverInfo: any | null;
  capabilities: any | null;
  error: string | null;
  onConnect: (config: ServerConfig) => void;
  onDisconnect: () => void;
  onPing: () => void;
}

type TransportType = 'stdio' | 'sse' | 'streamable-http';

export default function ConnectionPanel({
  connectionStatus,
  serverInfo,
  capabilities,
  error,
  onConnect,
  onDisconnect,
  onPing,
}: ConnectionPanelProps) {
  const [transport, setTransport] = useState<TransportType>('stdio');
  const [command, setCommand] = useState('npx');
  const [args, setArgs] = useState('-y @modelcontextprotocol/server-filesystem /tmp');
  const [url, setUrl] = useState('http://localhost:8080/sse');
  const [envVars, setEnvVars] = useState('');
  const [showEnv, setShowEnv] = useState(false);

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  function handleConnect() {
    if (transport === 'stdio') {
      const parsedArgs = args
        .split(/\s+/)
        .map((a) => a.trim())
        .filter(Boolean);
      const env: Record<string, string> = {};
      if (envVars.trim()) {
        envVars.split('\n').forEach((line) => {
          const eq = line.indexOf('=');
          if (eq > 0) {
            env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
          }
        });
      }
      onConnect({ transport: 'stdio', command, args: parsedArgs, env });
    } else if (transport === 'sse') {
      onConnect({ transport: 'sse', url });
    } else {
      onConnect({ transport: 'streamable-http', url });
    }
  }

  return (
    <div className="panel">
      <div className="panel-header flex items-center justify-between">
        <span>Server Connection</span>
        <div className="flex items-center gap-2">
          <span
            className={
              isConnected
                ? 'status-connected'
                : isConnecting
                  ? 'status-connecting'
                  : 'status-disconnected'
            }
          />
          <span className="text-xs font-normal normal-case tracking-normal text-gray-400">
            {isConnected ? 'Connected' : isConnecting ? 'Connecting…' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Transport selector */}
        <div className="flex gap-2">
          {(['stdio', 'sse', 'streamable-http'] as TransportType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTransport(t)}
              disabled={isConnected || isConnecting}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                transport === t
                  ? 'bg-fiddle-accent text-white'
                  : 'bg-fiddle-bg text-gray-400 hover:text-gray-200 border border-fiddle-border'
              } disabled:opacity-50`}
            >
              {t === 'stdio' ? 'Stdio' : t === 'sse' ? 'SSE' : 'Streamable HTTP'}
            </button>
          ))}
        </div>

        {/* Stdio fields */}
        {transport === 'stdio' && (
          <>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Command</label>
              <input
                type="text"
                className="input-field font-mono"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="npx"
                disabled={isConnected || isConnecting}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Arguments</label>
              <input
                type="text"
                className="input-field font-mono"
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                placeholder="-y @modelcontextprotocol/server-filesystem /tmp"
                disabled={isConnected || isConnecting}
              />
            </div>
            <div>
              <button
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                onClick={() => setShowEnv(!showEnv)}
              >
                {showEnv ? '▾' : '▸'} Environment Variables
              </button>
              {showEnv && (
                <textarea
                  className="input-field font-mono mt-1 h-20 resize-y"
                  value={envVars}
                  onChange={(e) => setEnvVars(e.target.value)}
                  placeholder={'KEY=value\nANOTHER_KEY=value'}
                  disabled={isConnected || isConnecting}
                />
              )}
            </div>
          </>
        )}

        {/* URL field for SSE / Streamable HTTP */}
        {transport !== 'stdio' && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Server URL</label>
            <input
              type="text"
              className="input-field font-mono"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                transport === 'sse'
                  ? 'http://localhost:8080/sse'
                  : 'http://localhost:8080/mcp'
              }
              disabled={isConnected || isConnecting}
            />
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Connect / Disconnect buttons */}
        <div className="flex gap-2">
          {!isConnected ? (
            <button
              className="btn-primary flex-1"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connecting…
                </span>
              ) : (
                'Connect'
              )}
            </button>
          ) : (
            <>
              <button className="btn-danger flex-1" onClick={onDisconnect}>
                Disconnect
              </button>
              <button className="btn-secondary" onClick={onPing}>
                Ping
              </button>
            </>
          )}
        </div>

        {/* Server info */}
        {isConnected && serverInfo && (
          <div className="bg-fiddle-bg rounded-lg p-3 text-xs space-y-1">
            <div className="text-gray-400">
              Server:{' '}
              <span className="text-gray-200">
                {serverInfo.name} {serverInfo.version && `v${serverInfo.version}`}
              </span>
            </div>
            {capabilities && (
              <div className="text-gray-400">
                Capabilities:{' '}
                <span className="text-gray-200 font-mono">
                  {Object.keys(capabilities).join(', ') || 'none'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
