import React from 'react';

interface SidebarProps {
  tools: any[];
  resources: any[];
  resourceTemplates: any[];
  prompts: any[];
  isConnected: boolean;
  onDiscover: (method: string) => void;
  onSelectTool: (tool: any) => void;
  onSelectResource: (resource: any) => void;
  onSelectPrompt: (prompt: any) => void;
}

export default function Sidebar({
  tools,
  resources,
  resourceTemplates,
  prompts,
  isConnected,
  onDiscover,
  onSelectTool,
  onSelectResource,
  onSelectPrompt,
}: SidebarProps) {
  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">Discovery</div>

      <div className="p-3 space-y-1 border-b border-fiddle-border flex-shrink-0">
        <div className="flex gap-1.5 flex-wrap">
          <button
            className="btn-secondary text-xs py-1.5 px-3"
            disabled={!isConnected}
            onClick={() => onDiscover('tools/list')}
          >
            List Tools
          </button>
          <button
            className="btn-secondary text-xs py-1.5 px-3"
            disabled={!isConnected}
            onClick={() => onDiscover('resources/list')}
          >
            List Resources
          </button>
          <button
            className="btn-secondary text-xs py-1.5 px-3"
            disabled={!isConnected}
            onClick={() => onDiscover('prompts/list')}
          >
            List Prompts
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Tools */}
        {tools.length > 0 && (
          <Section
            title={`Tools (${tools.length})`}
            icon="🔧"
          >
            {tools.map((tool: any) => (
              <ItemCard
                key={tool.name}
                title={tool.name}
                description={tool.description}
                onClick={() => onSelectTool(tool)}
                badge="tool"
                badgeColor="text-blue-400 bg-blue-500/10"
              />
            ))}
          </Section>
        )}

        {/* Resources */}
        {resources.length > 0 && (
          <Section
            title={`Resources (${resources.length})`}
            icon="📄"
          >
            {resources.map((resource: any) => (
              <ItemCard
                key={resource.uri}
                title={resource.name || resource.uri}
                description={resource.description || resource.uri}
                onClick={() => onSelectResource(resource)}
                badge="resource"
                badgeColor="text-green-400 bg-green-500/10"
              />
            ))}
          </Section>
        )}

        {/* Resource Templates */}
        {resourceTemplates.length > 0 && (
          <Section
            title={`Templates (${resourceTemplates.length})`}
            icon="📋"
          >
            {resourceTemplates.map((tpl: any) => (
              <ItemCard
                key={tpl.uriTemplate}
                title={tpl.name || tpl.uriTemplate}
                description={tpl.description || tpl.uriTemplate}
                onClick={() => {}}
                badge="template"
                badgeColor="text-cyan-400 bg-cyan-500/10"
              />
            ))}
          </Section>
        )}

        {/* Prompts */}
        {prompts.length > 0 && (
          <Section
            title={`Prompts (${prompts.length})`}
            icon="💬"
          >
            {prompts.map((prompt: any) => (
              <ItemCard
                key={prompt.name}
                title={prompt.name}
                description={prompt.description}
                onClick={() => onSelectPrompt(prompt)}
                badge="prompt"
                badgeColor="text-amber-400 bg-amber-500/10"
              />
            ))}
          </Section>
        )}

        {/* Empty state */}
        {tools.length === 0 && resources.length === 0 && prompts.length === 0 && resourceTemplates.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-600 text-xs p-4 text-center">
            {isConnected
              ? 'Click the buttons above to discover tools, resources, and prompts.'
              : 'Connect to a server to discover its capabilities.'}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-fiddle-border/50">
      <div className="px-3 py-2 text-xs text-gray-400 font-medium flex items-center gap-1.5">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <div className="px-2 pb-2 space-y-1">{children}</div>
    </div>
  );
}

function ItemCard({
  title,
  description,
  onClick,
  badge,
  badgeColor,
}: {
  title: string;
  description?: string;
  onClick: () => void;
  badge: string;
  badgeColor: string;
}) {
  return (
    <button
      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-fiddle-bg/70 transition-colors group"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-gray-200 group-hover:text-white truncate flex-1">
          {title}
        </span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${badgeColor}`}>
          {badge}
        </span>
      </div>
      {description && (
        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{description}</p>
      )}
    </button>
  );
}
