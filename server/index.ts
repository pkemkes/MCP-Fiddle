import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupWebSocketRelay } from './wsRelay.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();
app.use(express.json());

// In production, serve the built frontend
const distPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// SPA fallback for production
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const server = createServer(app);

// Set up WebSocket relay
setupWebSocketRelay(server);

server.listen(PORT, () => {
  console.log(`MCP Fiddle backend listening on http://localhost:${PORT}`);
});
