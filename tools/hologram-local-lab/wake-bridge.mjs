#!/usr/bin/env node
// Local-only, ephemeral STT -> hologram state signalling. No transcript and no media are stored.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

export function validWakeEvent(body) {
  return body !== null && typeof body === 'object' && !Array.isArray(body) &&
    (body.target === 'bob' || body.target === 'lina') &&
    body.action === 'LISTENING';
}
const isAllowedOrigin = value => !value || /^http:\/\/(localhost|127\.0\.0\.1):3001$/.test(value);
const clients = new Set();
const server = createServer((req, res) => {
  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin)) { res.writeHead(403).end('Origin rejected'); return; }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Cache-Control', 'no-store');
  const url = new URL(req.url || '/', 'http://127.0.0.1:7891');
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, {'Content-Type':'application/json'}).end(JSON.stringify({ ok: true, service: 'wake-bridge', clients: clients.size }));
    return;
  }
  if (req.method === 'GET' && url.pathname === '/events') {
    const persona = url.searchParams.get('persona');
    if (persona !== 'bob' && persona !== 'lina') { res.writeHead(400).end('Unknown persona'); return; }
    res.writeHead(200, {'Content-Type':'text/event-stream', 'Cache-Control':'no-store, no-transform', 'Connection':'keep-alive', 'X-Accel-Buffering':'no'});
    res.write(': connected\n\n');
    const client = {res, persona}; clients.add(client);
    req.on('close', () => clients.delete(client));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/wake') {
    if (req.headers['content-type']?.split(';')[0] !== 'application/json') { res.writeHead(415).end('JSON required'); return; }
    let body = '', exceeded = false;
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024) { exceeded = true; req.destroy(); }
    });
    req.on('end', () => {
      if (exceeded) return;
      let payload;
      try { payload = JSON.parse(body); } catch { res.writeHead(400).end('Malformed JSON'); return; }
      if (!validWakeEvent(payload)) { res.writeHead(400).end('Invalid wake event'); return; }
      const event = JSON.stringify({ id: randomUUID(), target: payload.target, action: payload.action, at: Date.now() });
      for (const client of clients) {
        if (client.persona === payload.target) client.res.write('data: ' + event + '\n\n');
      }
      res.writeHead(202, {'Content-Type':'application/json'}).end(JSON.stringify({ accepted: true, target: payload.target, listeners: [...clients].filter(c => c.persona === payload.target).length }));
    });
    return;
  }
  res.writeHead(404).end('Not found');
});
const keepalive = setInterval(() => {
  for (const client of clients) client.res.write(': heartbeat\n\n');
}, 15000);
server.on('close', () => clearInterval(keepalive));
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  server.listen(7891, '127.0.0.1', () => {
    console.log('Wake bridge listening at http://127.0.0.1:7891 (LOCAL LAB ONLY)');
  });
}
export { server };
