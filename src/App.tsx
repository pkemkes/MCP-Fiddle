import React, { useState, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useMcpSession } from './hooks/useMcpSession';
import ConnectionPanel from './components/ConnectionPanel';
import RequestBuilder from './components/RequestBuilder';
import ResponseViewer from './components/ResponseViewer';
import SessionLog from './components/SessionLog';
import Sidebar from './components/Sidebar';

export default function App() {
  const { wsState, send, addMessageListener } = useWebSocket();
  const { state, connect, disconnect, sendRequest, ping, clearLog } = useMcpSession({
    send,
    addMessageListener,
  });

  const [prefill, setPrefill] = useState<{ method: string; params?: Record<string, any> } | null>(
    null,
  );

  // Latest response for the main viewer
  const latestResponse = [...state.log]
    .reverse()
    .find((e) => e.direction === 'server' && (e.type === 'response' || e.type === 'error'));

  const handleDiscover = useCallback(
    (method: string) => {
      sendRequest(method);
    },
    [sendRequest],
  );

  const handleSelectTool = useCallback((tool: any) => {
    setPrefill({
      method: 'tools/call',
      params: { name: tool.name, arguments: {} },
    });
  }, []);

  const handleSelectResource = useCallback((resource: any) => {
    setPrefill({
      method: 'resources/read',
      params: { uri: resource.uri },
    });
  }, []);

  const handleSelectPrompt = useCallback((prompt: any) => {
    setPrefill({
      method: 'prompts/get',
      params: { name: prompt.name, arguments: {} },
    });
  }, []);

  const handleSend = useCallback(
    (method: string, params?: Record<string, any>) => {
      sendRequest(method, params);
    },
    [sendRequest],
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-fiddle-border bg-fiddle-panel px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-fiddle-accent">MCP</span>{' '}
            <span className="text-gray-200">Fiddle</span>
          </h1>
          <span className="text-[10px] text-gray-500 bg-fiddle-bg px-2 py-0.5 rounded-full">
            v{import.meta.env.VITE_APP_VERSION}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                wsState === 'connected'
                  ? 'bg-green-500'
                  : wsState === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-gray-600'
              }`}
            />
            <span className="text-[10px] text-gray-500">
              WS: {wsState}
            </span>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar — Discovery */}
        <div className="w-64 flex-shrink-0 border-r border-fiddle-border overflow-hidden">
          <Sidebar
            tools={state.tools}
            resources={state.resources}
            resourceTemplates={state.resourceTemplates}
            prompts={state.prompts}
            isConnected={state.connectionStatus === 'connected'}
            onDiscover={handleDiscover}
            onSelectTool={handleSelectTool}
            onSelectResource={handleSelectResource}
            onSelectPrompt={handleSelectPrompt}
          />
        </div>

        {/* Center — Connection + Request Builder + Response */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-shrink-0 p-4 pb-0 space-y-4">
            <ConnectionPanel
              connectionStatus={state.connectionStatus}
              serverInfo={state.serverInfo}
              capabilities={state.capabilities}
              error={state.error}
              onConnect={connect}
              onDisconnect={disconnect}
              onPing={ping}
            />

            <RequestBuilder
              onSend={handleSend}
              isConnected={state.connectionStatus === 'connected'}
              prefill={prefill}
            />
          </div>

          {latestResponse && (
            <div className="flex-1 min-h-0 p-4">
              <ResponseViewer
                data={latestResponse.data}
                method={latestResponse.method}
                isError={latestResponse.type === 'error'}
                duration={latestResponse.duration}
                timestamp={latestResponse.timestamp}
              />
            </div>
          )}
        </div>

        {/* Right panel — Session Log */}
        <div className="w-96 flex-shrink-0 border-l border-fiddle-border overflow-hidden">
          <SessionLog log={state.log} onClear={clearLog} />
        </div>
      </div>
    </div>
  );
}
