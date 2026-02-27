import React, { useState } from 'react';

interface ResponseViewerProps {
  data: any;
  method?: string;
  isError?: boolean;
  duration?: number;
  timestamp?: number;
}

export default function ResponseViewer({
  data,
  method,
  isError,
  duration,
  timestamp,
}: ResponseViewerProps) {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  const jsonStr = JSON.stringify(data, null, 2);

  return (
    <div className={`panel h-full flex flex-col ${isError ? 'border-red-700/50' : ''}`}>
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{isError ? '✗ Error' : '✓ Response'}</span>
          {method && (
            <span className="text-[11px] font-mono font-normal normal-case tracking-normal text-fiddle-accent">
              {method}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {duration !== undefined && (
            <span className="text-[10px] font-normal normal-case tracking-normal text-gray-500">
              {duration}ms
            </span>
          )}
          {timestamp && (
            <span className="text-[10px] font-normal normal-case tracking-normal text-gray-500">
              {new Date(timestamp).toLocaleTimeString()}
            </span>
          )}
          <div className="flex gap-1">
            <button
              className={`text-[10px] px-2 py-0.5 rounded font-normal normal-case tracking-normal ${
                viewMode === 'formatted'
                  ? 'bg-fiddle-accent text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              onClick={() => setViewMode('formatted')}
            >
              Formatted
            </button>
            <button
              className={`text-[10px] px-2 py-0.5 rounded font-normal normal-case tracking-normal ${
                viewMode === 'raw'
                  ? 'bg-fiddle-accent text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              onClick={() => setViewMode('raw')}
            >
              Raw
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 overflow-auto flex-1 min-h-0">
        {viewMode === 'raw' ? (
          <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap break-all">
            {jsonStr}
          </pre>
        ) : (
          <JsonTree data={data} isError={isError} />
        )}
      </div>
    </div>
  );
}

function JsonTree({ data, isError, depth = 0 }: { data: any; isError?: boolean; depth?: number }) {
  if (data === null) return <span className="text-gray-500">null</span>;
  if (data === undefined) return <span className="text-gray-500">undefined</span>;

  if (typeof data === 'string') {
    return (
      <span className={isError ? 'text-red-400' : 'text-green-400'}>
        "{data}"
      </span>
    );
  }

  if (typeof data === 'number') {
    return <span className="text-amber-400">{data}</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="text-purple-400">{data.toString()}</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-gray-500">[]</span>;
    return <CollapsibleNode label={`Array(${data.length})`} data={data} depth={depth} isError={isError} />;
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span className="text-gray-500">{'{}'}</span>;
    return <CollapsibleNode label={`Object(${keys.length})`} data={data} depth={depth} isError={isError} />;
  }

  return <span className="text-gray-300">{String(data)}</span>;
}

function CollapsibleNode({
  label,
  data,
  depth,
  isError,
}: {
  label: string;
  data: any;
  depth: number;
  isError?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(depth > 2);
  const isArray = Array.isArray(data);
  const entries = isArray ? data.map((v: any, i: number) => [i, v]) : Object.entries(data);

  return (
    <div className="text-xs font-mono">
      <button
        className="text-gray-500 hover:text-gray-300 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? '▸' : '▾'}{' '}
        <span className="text-gray-400 text-[10px]">{label}</span>
      </button>
      {!collapsed && (
        <div className="ml-4 border-l border-fiddle-border/50 pl-2 space-y-0.5 mt-0.5">
          {entries.map((entry: any) => (
            <div key={entry[0]} className="flex gap-1">
              <span className={isArray ? 'text-gray-500' : 'text-blue-400'}>
                {isArray ? `${entry[0]}:` : `"${entry[0]}":`}
              </span>
              <JsonTree data={entry[1]} depth={depth + 1} isError={isError} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
