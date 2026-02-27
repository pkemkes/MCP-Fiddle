import React, { useState, useEffect } from 'react';
import { MCP_METHODS, McpMethodDef, METHOD_CATEGORIES, McpParamDef } from '../lib/mcpMethods';
import JsonEditor from './JsonEditor';

interface RequestBuilderProps {
  onSend: (method: string, params?: Record<string, any>) => void;
  isConnected: boolean;
  prefill?: { method: string; params?: Record<string, any> } | null;
}

export default function RequestBuilder({ onSend, isConnected, prefill }: RequestBuilderProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('tools/list');
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [rawMode, setRawMode] = useState(false);
  const [rawJson, setRawJson] = useState('{}');

  const methodDef = MCP_METHODS.find((m) => m.method === selectedMethod);

  // Handle prefill from sidebar
  useEffect(() => {
    if (prefill) {
      setSelectedMethod(prefill.method);
      if (prefill.params) {
        const values: Record<string, string> = {};
        for (const [key, val] of Object.entries(prefill.params)) {
          values[key] = typeof val === 'string' ? val : JSON.stringify(val, null, 2);
        }
        setParamValues(values);
      } else {
        setParamValues({});
      }
    }
  }, [prefill]);

  function handleMethodChange(method: string) {
    setSelectedMethod(method);
    setParamValues({});
    setRawJson('{}');
  }

  function handleParamChange(name: string, value: string) {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleSend() {
    if (rawMode) {
      try {
        const parsed = JSON.parse(rawJson);
        onSend(selectedMethod, parsed);
      } catch {
        return; // Don't send invalid JSON
      }
    } else {
      const params: Record<string, any> = {};
      if (methodDef) {
        for (const param of methodDef.params) {
          const val = paramValues[param.name];
          if (val !== undefined && val !== '') {
            if (param.type === 'json') {
              try {
                params[param.name] = JSON.parse(val);
              } catch {
                return; // Don't send if JSON param is invalid
              }
            } else {
              params[param.name] = val;
            }
          }
        }
      }
      onSend(selectedMethod, Object.keys(params).length > 0 ? params : undefined);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="panel" onKeyDown={handleKeyDown}>
      <div className="panel-header flex items-center justify-between">
        <span>Request Builder</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={rawMode}
              onChange={(e) => setRawMode(e.target.checked)}
              className="rounded border-fiddle-border bg-fiddle-bg text-fiddle-accent
                         focus:ring-fiddle-accent focus:ring-offset-0 h-3 w-3"
            />
            <span className="text-[10px] text-gray-500 font-normal normal-case tracking-normal">
              Raw JSON
            </span>
          </label>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Method selector */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Method</label>
          <select
            className="input-field font-mono text-sm"
            value={selectedMethod}
            onChange={(e) => handleMethodChange(e.target.value)}
          >
            {METHOD_CATEGORIES.map((cat) => (
              <optgroup key={cat.key} label={cat.label}>
                {MCP_METHODS.filter((m) => m.category === cat.key).map((m) => (
                  <option key={m.method} value={m.method}>
                    {m.method}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {methodDef && (
            <p className="text-[11px] text-gray-500 mt-1">{methodDef.description}</p>
          )}
        </div>

        {/* Parameters */}
        {rawMode ? (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Parameters (Raw JSON)</label>
            <JsonEditor
              value={rawJson}
              onChange={setRawJson}
              placeholder='{ "name": "example" }'
              minHeight="100px"
            />
          </div>
        ) : (
          methodDef &&
          methodDef.params.length > 0 && (
            <div className="space-y-3">
              {methodDef.params.map((param) => (
                <ParamInput
                  key={param.name}
                  param={param}
                  value={paramValues[param.name] || ''}
                  onChange={(val) => handleParamChange(param.name, val)}
                />
              ))}
            </div>
          )
        )}

        {/* Send button */}
        <button
          className="btn-primary w-full"
          onClick={handleSend}
          disabled={!isConnected}
        >
          {isConnected ? (
            <span className="flex items-center justify-center gap-2">
              Send
              <kbd className="text-[10px] bg-indigo-700/50 px-1.5 py-0.5 rounded text-indigo-200">
                Ctrl+Enter
              </kbd>
            </span>
          ) : (
            'Connect first'
          )}
        </button>
      </div>
    </div>
  );
}

function ParamInput({
  param,
  value,
  onChange,
}: {
  param: McpParamDef;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">
        {param.label}
        {param.required && <span className="text-fiddle-error ml-1">*</span>}
      </label>
      {param.type === 'select' && param.options ? (
        <select className="input-field text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {param.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : param.type === 'json' ? (
        <JsonEditor
          value={value}
          onChange={onChange}
          placeholder={param.placeholder}
          minHeight="60px"
        />
      ) : (
        <input
          type="text"
          className="input-field font-mono text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={param.placeholder}
        />
      )}
      {param.description && (
        <p className="text-[10px] text-gray-500 mt-0.5">{param.description}</p>
      )}
    </div>
  );
}
