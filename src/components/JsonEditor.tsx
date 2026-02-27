import React, { useRef, useEffect } from 'react';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  maxHeight?: string;
  minHeight?: string;
}

export default function JsonEditor({
  value,
  onChange,
  placeholder,
  readOnly = false,
  maxHeight = '300px',
  minHeight = '80px',
}: JsonEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        parseInt(maxHeight),
      )}px`;
    }
  }, [value, maxHeight]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }

  function handleFormat() {
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, 2));
    } catch {
      // Can't format invalid JSON — leave as is
    }
  }

  const isValidJson = (() => {
    if (!value.trim()) return true;
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        className={`input-field font-mono text-xs resize-y ${
          !isValidJson ? 'border-fiddle-error focus:border-fiddle-error focus:ring-fiddle-error' : ''
        }`}
        style={{ minHeight, maxHeight }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
      />
      {!readOnly && value.trim() && (
        <button
          className="absolute top-1 right-1 text-[10px] text-gray-500 hover:text-gray-300 bg-fiddle-panel px-1.5 py-0.5 rounded"
          onClick={handleFormat}
          title="Format JSON"
        >
          Format
        </button>
      )}
      {!isValidJson && (
        <div className="text-[10px] text-fiddle-error mt-0.5">Invalid JSON</div>
      )}
    </div>
  );
}
