# MCP Fiddle — Plan

## Overview

MCP Fiddle is a browser-based tool for inspecting and interacting with MCP (Model Context Protocol) servers. It lets you configure a server connection, send standard MCP requests manually, and inspect the raw JSON-RPC responses — like Postman, but purpose-built for MCP.

---

## Architecture

```
┌──────────────────────────┐       HTTP/WS        ┌──────────────────────┐    stdio/SSE    ┌────────────┐
│  Browser (React SPA)     │  ◄──────────────────► │  Backend (Node.js)   │ ◄─────────────► │ MCP Server │
│                          │                       │  Express + WS proxy  │                 │            │
│  - Server config form    │                       │  - Spawns MCP server │                 └────────────┘
│  - Request builder       │                       │  - Proxies JSON-RPC  │
│  - Response viewer       │                       │  - Manages lifecycle  │
│  - Session history       │                       │                      │
└──────────────────────────┘                       └──────────────────────┘
```

**Why a backend proxy?**
MCP servers typically communicate over **stdio** (spawned as a child process) or **SSE** (HTTP streaming). Browsers cannot spawn processes, so a lightweight Node.js backend acts as a bridge: it spawns/connects to the MCP server and relays JSON-RPC messages to the browser over a WebSocket.

---

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React 18 + TypeScript, Vite         |
| Styling  | Tailwind CSS                        |
| Backend  | Node.js, Express, `ws` (WebSocket)  |
| MCP SDK  | `@modelcontextprotocol/sdk`         |
| Mono     | Single package, npm scripts         |

---

## Core Features

### 1. Server Definition & Connection

- **Stdio mode**: User provides `command` and `args[]` (e.g., `npx -y @modelcontextprotocol/server-filesystem /tmp`). The backend spawns the process.
- **SSE/Streamable HTTP mode**: User provides a URL. The backend connects via SSE or HTTP.
- Connect / Disconnect button with connection status indicator.
- Support environment variables passed to the spawned process.

### 2. MCP Lifecycle Requests

Provide dedicated UI panels or a request builder for each standard MCP method:

| Method                        | Purpose                                |
| ----------------------------- | -------------------------------------- |
| `initialize`                  | Handshake, exchange capabilities       |
| `notifications/initialized`   | Client signals ready                   |
| `ping`                        | Health check                           |
| `tools/list`                  | List available tools                   |
| `tools/call`                  | Invoke a tool with arguments           |
| `resources/list`              | List available resources               |
| `resources/read`              | Read a specific resource               |
| `resources/subscribe`         | Subscribe to resource changes          |
| `prompts/list`                | List available prompts                 |
| `prompts/get`                 | Get a prompt with arguments            |
| `logging/setLevel`            | Set server log level                   |
| `completion/complete`         | Request argument completions           |

### 3. Request Builder

- Dropdown to select method.
- Auto-generated form fields based on the selected method's expected params (e.g., tool name + arguments JSON for `tools/call`).
- Raw JSON editor as an alternative for full control.
- "Send" button → dispatches the JSON-RPC message.

### 4. Response Viewer

- Formatted JSON view of each response (collapsible, syntax-highlighted).
- Raw view toggle.
- Error responses highlighted in red.
- Timestamp and round-trip duration displayed.

### 5. Session Log / History

- Chronological list of all sent requests and received responses/notifications.
- Includes server-initiated notifications (e.g., resource change events, log messages).
- Filterable by method type or direction (client→server, server→client).
- Clearable.

### 6. Discovery Shortcuts

After connecting and initializing:
- One-click buttons: **List Tools**, **List Resources**, **List Prompts**.
- Results populate a sidebar that lets you click a tool/resource/prompt to pre-fill the request builder.

---

## Project Structure

```
mcp-fiddle/
├── PLAN.md
├── Dockerfile
├── .dockerignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html                  # Vite entry
├── server/
│   ├── index.ts                # Express + WS server entry
│   ├── mcpManager.ts           # Spawn/connect to MCP servers, manage lifecycle
│   └── wsRelay.ts              # WebSocket relay: browser ↔ MCP server
├── src/
│   ├── main.tsx                # React entry
│   ├── App.tsx                 # Layout, routing
│   ├── components/
│   │   ├── ConnectionPanel.tsx # Server config + connect/disconnect
│   │   ├── RequestBuilder.tsx  # Method selector + params form + raw JSON
│   │   ├── ResponseViewer.tsx  # Formatted/raw JSON response display
│   │   ├── SessionLog.tsx      # Chronological message history
│   │   ├── Sidebar.tsx         # Tools/resources/prompts discovery list
│   │   └── JsonEditor.tsx      # Reusable JSON editor component
│   ├── hooks/
│   │   ├── useWebSocket.ts     # WS connection to backend
│   │   └── useMcpSession.ts    # MCP state management (tools, resources, etc.)
│   ├── lib/
│   │   ├── mcpMethods.ts       # Method definitions, param schemas
│   │   └── jsonRpc.ts          # JSON-RPC message helpers
│   └── styles/
│       └── globals.css         # Tailwind base
└── public/
```

---

## Implementation Phases

### Phase 1 — Skeleton & Connection (MVP)

1. Scaffold Vite + React + Tailwind project.
2. Build Express + WebSocket backend that can spawn a stdio MCP server.
3. Implement `ConnectionPanel` — configure command/args, connect/disconnect.
4. Wire up WebSocket relay between browser and spawned MCP process.
5. Send `initialize` + `notifications/initialized` on connect.
6. Display raw JSON responses in a basic `ResponseViewer`.

### Phase 2 — Request Builder & Discovery

1. Build the `RequestBuilder` with method dropdown and param forms.
2. Implement `tools/list`, `resources/list`, `prompts/list` and show results in `Sidebar`.
3. Click-to-fill: clicking a discovered tool/resource/prompt populates the request builder.
4. Add `tools/call`, `resources/read`, `prompts/get` with argument input.

### Phase 3 — Session Log & Polish

1. Build the `SessionLog` with all messages (requests, responses, notifications).
2. Add filtering, timestamps, duration tracking.
3. Syntax-highlighted JSON with collapse/expand.
4. Error highlighting and connection status improvements.
5. Support SSE/Streamable HTTP transport in addition to stdio.

### Phase 4 — Docker & Deployment

1. Create a multi-stage `Dockerfile`:
   - **Stage 1 (build)**: Node.js image, install deps, build the Vite frontend and compile the backend TypeScript.
   - **Stage 2 (runtime)**: Slim Node.js image, copy built assets + production deps, expose port, run the Express server which serves the static frontend and the WebSocket endpoint.
2. Add `.dockerignore` (exclude `node_modules`, `.git`, `dist`, etc.).
3. The Express server serves the built frontend in production mode so only a single container/port is needed.
4. Document `docker build` / `docker run` commands.

### Phase 5 — Nice-to-haves

- Save/load server definitions to localStorage.
- Export session log as JSON.
- Dark/light theme toggle.
- Schema-aware form generation for tool arguments (using tool `inputSchema`).
- Multiple simultaneous server connections (tabs).
- Auto-reconnect on disconnect.

---

## Key Design Decisions

1. **Backend proxy is required** — stdio servers can't be reached from the browser directly. Even for SSE servers, proxying through the backend keeps the architecture consistent and avoids CORS issues.

2. **WebSocket for browser ↔ backend** — provides full-duplex communication needed to relay both client requests and server notifications in real-time.

3. **Use the official MCP SDK on the backend** — `@modelcontextprotocol/sdk` handles JSON-RPC framing, transport abstraction, and protocol compliance. The backend uses it to create a proper MCP client that the browser controls remotely.

4. **Keep the frontend "dumb"** — the browser is essentially a remote control. It sends high-level commands ("connect to this server", "send this method") and receives relayed JSON-RPC messages. All protocol logic lives on the backend.

---

## Getting Started (after implementation)

### Local Development

```bash
npm install
npm run dev        # Starts both Vite dev server (frontend) and Express (backend)
```

Open `http://localhost:5173`, enter a server command like:

```
Command: npx
Args:    -y @modelcontextprotocol/server-filesystem /tmp
```

Click **Connect**, then use the request builder to explore the server.

### Docker

```bash
docker build -t mcp-fiddle .
docker run -p 3000:3000 mcp-fiddle
```

Open `http://localhost:3000`. The container runs the production build (Express serves both the API/WebSocket and the static frontend on a single port).

> **Note:** When running in Docker, stdio MCP servers are spawned _inside_ the container. You may need to install additional runtimes (Python, etc.) in the Dockerfile or mount volumes for servers that access the host filesystem. For SSE/HTTP servers running on the host, use `host.docker.internal` as the hostname.
