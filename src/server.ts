/**
 * Tiny HTTP server exposing pipeline data to the dashboard.
 * No deps beyond Node built-ins.
 */

import http from 'http';
import { getAllScripts, getStats, getMeta } from './db.js';

const PORT = parseInt(process.env.PORT ?? '8787');

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

export function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url!, `http://localhost:${PORT}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
      res.end();
      return;
    }

    switch (url.pathname) {
      case '/api/scripts':
        return json(res, getAllScripts());

      case '/api/stats': {
        const stats = getStats();
        const lastPoll = getMeta('last_poll');
        return json(res, { ...stats, lastPoll });
      }

      case '/api/health':
        return json(res, { ok: true, ts: new Date().toISOString() });

      default:
        return json(res, { error: 'not found' }, 404);
    }
  });

  server.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] 📡 API server → http://localhost:${PORT}`);
  });

  return server;
}
