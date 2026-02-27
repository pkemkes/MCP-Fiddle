/**
 * MCP method definitions with their expected parameters.
 */

export interface McpMethodDef {
  method: string;
  label: string;
  description: string;
  params: McpParamDef[];
  category: 'lifecycle' | 'tools' | 'resources' | 'prompts' | 'utility';
}

export interface McpParamDef {
  name: string;
  label: string;
  type: 'string' | 'json' | 'select';
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: { label: string; value: string }[];
}

export const MCP_METHODS: McpMethodDef[] = [
  {
    method: 'ping',
    label: 'Ping',
    description: 'Health check — verifies the server is responsive.',
    params: [],
    category: 'lifecycle',
  },
  {
    method: 'tools/list',
    label: 'List Tools',
    description: 'List all tools the server exposes.',
    params: [],
    category: 'tools',
  },
  {
    method: 'tools/call',
    label: 'Call Tool',
    description: 'Invoke a specific tool with arguments.',
    params: [
      {
        name: 'name',
        label: 'Tool Name',
        type: 'string',
        required: true,
        placeholder: 'e.g., read_file',
      },
      {
        name: 'arguments',
        label: 'Arguments (JSON)',
        type: 'json',
        required: false,
        placeholder: '{ "path": "/tmp/example.txt" }',
      },
    ],
    category: 'tools',
  },
  {
    method: 'resources/list',
    label: 'List Resources',
    description: 'List available resources.',
    params: [],
    category: 'resources',
  },
  {
    method: 'resources/read',
    label: 'Read Resource',
    description: 'Read the contents of a specific resource.',
    params: [
      {
        name: 'uri',
        label: 'Resource URI',
        type: 'string',
        required: true,
        placeholder: 'e.g., file:///tmp/example.txt',
      },
    ],
    category: 'resources',
  },
  {
    method: 'resources/templates/list',
    label: 'List Resource Templates',
    description: 'List available resource templates.',
    params: [],
    category: 'resources',
  },
  {
    method: 'prompts/list',
    label: 'List Prompts',
    description: 'List available prompts.',
    params: [],
    category: 'prompts',
  },
  {
    method: 'prompts/get',
    label: 'Get Prompt',
    description: 'Get a prompt by name, optionally with arguments.',
    params: [
      {
        name: 'name',
        label: 'Prompt Name',
        type: 'string',
        required: true,
        placeholder: 'e.g., summarize',
      },
      {
        name: 'arguments',
        label: 'Arguments (JSON)',
        type: 'json',
        required: false,
        placeholder: '{ "text": "..." }',
      },
    ],
    category: 'prompts',
  },
  {
    method: 'logging/setLevel',
    label: 'Set Log Level',
    description: 'Set the server log level.',
    params: [
      {
        name: 'level',
        label: 'Level',
        type: 'select',
        required: true,
        options: [
          { label: 'Debug', value: 'debug' },
          { label: 'Info', value: 'info' },
          { label: 'Notice', value: 'notice' },
          { label: 'Warning', value: 'warning' },
          { label: 'Error', value: 'error' },
          { label: 'Critical', value: 'critical' },
          { label: 'Alert', value: 'alert' },
          { label: 'Emergency', value: 'emergency' },
        ],
      },
    ],
    category: 'utility',
  },
  {
    method: 'completion/complete',
    label: 'Complete',
    description: 'Request argument completions.',
    params: [
      {
        name: 'ref',
        label: 'Reference (JSON)',
        type: 'json',
        required: true,
        placeholder: '{ "type": "ref/prompt", "name": "..." }',
      },
      {
        name: 'argument',
        label: 'Argument (JSON)',
        type: 'json',
        required: true,
        placeholder: '{ "name": "...", "value": "..." }',
      },
    ],
    category: 'utility',
  },
];

export function getMethodDef(method: string): McpMethodDef | undefined {
  return MCP_METHODS.find((m) => m.method === method);
}

export const METHOD_CATEGORIES = [
  { key: 'lifecycle', label: 'Lifecycle' },
  { key: 'tools', label: 'Tools' },
  { key: 'resources', label: 'Resources' },
  { key: 'prompts', label: 'Prompts' },
  { key: 'utility', label: 'Utility' },
] as const;
