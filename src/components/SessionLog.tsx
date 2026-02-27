import React, { useRef, useEffect, useState, useMemo } from 'react';
import { LogEntry } from '../hooks/useMcpSession';
import ResponseViewer from './ResponseViewer';

interface SessionLogProps {
  log: LogEntry[];
  onClear: () => void;
}

type FilterType = 'all' | 'request' | 'response' | 'notification' | 'error' | 'system';
type DirectionFilter = 'all' | 'client' | 'server';

export default function SessionLog({ log, onClear }: SessionLogProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [dirFilter, setDirFilter] = useState<DirectionFilter>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const filteredLog = useMemo(() => {
    return log.filter((entry) => {
      if (typeFilter !== 'all' && entry.type !== typeFilter) return false;
      if (dirFilter !== 'all' && entry.direction !== dirFilter) return false;
      return true;
    });
  }, [log, typeFilter, dirFilter]);

  useEffect(() => {
    if (autoScroll) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLog, autoScroll]);

  const typeColors: Record<string, string> = {
    request: 'text-blue-400 bg-blue-500/10',
    response: 'text-green-400 bg-green-500/10',
    notification: 'text-amber-400 bg-amber-500/10',
    error: 'text-red-400 bg-red-500/10',
    system: 'text-purple-400 bg-purple-500/10',
  };

  const dirIcons: Record<string, string> = {
    client: '→',
    server: '←',
  };

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header flex items-center justify-between flex-shrink-0">
        <span>Session Log ({filteredLog.length})</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-fiddle-border bg-fiddle-bg text-fiddle-accent
                         focus:ring-fiddle-accent focus:ring-offset-0 h-3 w-3"
            />
            <span className="text-[10px] font-normal normal-case tracking-normal text-gray-500">
              Auto-scroll
            </span>
          </label>
          <button
            className="text-[10px] font-normal normal-case tracking-normal text-gray-500 hover:text-gray-300"
            onClick={onClear}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 py-2 border-b border-fiddle-border flex gap-2 flex-wrap flex-shrink-0">
        <FilterGroup
          label="Type"
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as FilterType)}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Request', value: 'request' },
            { label: 'Response', value: 'response' },
            { label: 'Notification', value: 'notification' },
            { label: 'Error', value: 'error' },
            { label: 'System', value: 'system' },
          ]}
        />
        <div className="w-px bg-fiddle-border" />
        <FilterGroup
          label="Direction"
          value={dirFilter}
          onChange={(v) => setDirFilter(v as DirectionFilter)}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Client→', value: 'client' },
            { label: '←Server', value: 'server' },
          ]}
        />
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredLog.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            {log.length === 0
              ? 'No messages yet. Connect to a server to begin.'
              : 'No messages match the current filters.'}
          </div>
        ) : (
          <div className="divide-y divide-fiddle-border/50">
            {filteredLog.map((entry) => (
              <div
                key={entry.id}
                className="px-3 py-2 hover:bg-fiddle-bg/50 cursor-pointer transition-colors"
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600 font-mono w-16 flex-shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-gray-500 w-3">{dirIcons[entry.direction]}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      typeColors[entry.type] || 'text-gray-400'
                    }`}
                  >
                    {entry.type.toUpperCase()}
                  </span>
                  {entry.method && (
                    <span className="font-mono text-gray-300">{entry.method}</span>
                  )}
                  {entry.duration !== undefined && (
                    <span className="text-gray-600 text-[10px] ml-auto">{entry.duration}ms</span>
                  )}
                </div>
                {expandedId === entry.id && (
                  <div className="mt-2">
                    <ResponseViewer
                      data={entry.data}
                      method={entry.method}
                      isError={entry.type === 'error'}
                      duration={entry.duration}
                      timestamp={entry.timestamp}
                    />
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-gray-600 mr-1">{label}:</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
            value === opt.value
              ? 'bg-fiddle-accent/20 text-fiddle-accent'
              : 'text-gray-500 hover:text-gray-300'
          }`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
