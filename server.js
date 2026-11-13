#!/usr/bin/env node
// UI Taste: the page and the folder behind it. Plain Node, nothing to install.
// Answers only on 127.0.0.1. Start it with `node tools/taste.mjs start` (or `node server.js` to watch it run).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, ROOT } from './lib/config.js';
import { createStore, Oops, ID, PID } from './lib/store.js';

const cfg = loadConfig();
const store = createStore(cfg.tasteDir);
const PUBLIC = path.join(ROOT, 'public');
const LOG = path.join(cfg.dataDir, 'server.log');
const log = s => { try { fs.appendFileSync(LOG, `${new Date().toISOString()} ${s}\n`); } catch {} };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

// New things show up on the page by themselves: anything that changes the folder tells every open page.
const pages = new Set();
const tell = what => { for (const res of pages) { try { res.write(`event: taste\ndata: ${JSON.stringify(what)}\n\n`); } catch {} } };
setInterval(() => { for (const res of pages) { try { res.write(': still here\n\n'); } catch {} } }, 25000).unref();

const send = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
const readBody = req => new Promise((ok, no) => {
  const chunks = []; let n = 0;
  req.on('data', c => { n += c.length; if (n > 60 * 1024 * 1024) { no(new Oops(413, 'that picture is too big (60 MB at most)')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => { if (!chunks.length) return ok({}); try { ok(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { no(new Oops(400, 'that body is not JSON')); } });
  req.on('error', no);
});
const id = s => { if (!ID.test(s)) throw new Oops(400, 'bad design id'); return s; };
const pid = s => { if (!PID.test(s)) throw new Oops(400, 'bad part id'); return s; };
const sendFile = (res, file, cache) => {
  if (!file || !fs.existsSync(file)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': cache || 'no-cache' });
  fs.createReadStream(file).pipe(res);
};

async function api(req, res, p) {
  const m = req.method;
  if (m === 'GET' && p === '/api/whoami') return send(res, 200, { app: 'ui-taste', pid: process.pid, root: ROOT, port: cfg.port, data: cfg.tasteDir, node: process.version });
  if (m === 'GET' && p === '/api/config') return send(res, 200, { ai: { name: cfg.ai.name, picture: !!cfg.picturePath && fs.existsSync(cfg.picturePath) }, person: { name: cfg.person.name } });
  if (m === 'GET' && p === '/api/picture') return sendFile(res, cfg.picturePath && fs.existsSync(cfg.picturePath) ? cfg.picturePath : null);
  if (m === 'GET' && p === '/api/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write(': hello\n\n'); pages.add(res); req.on('close', () => pages.delete(res)); return;
  }

  const t = p.replace(/^\/api\/taste/, '');
  if (t === p) return send(res, 404, { error: 'no such thing' });
  const parts = t.split('/').filter(Boolean);

  if (!parts.length) {
    if (m === 'GET') return send(res, 200, { dir: store.dir, items: store.list() });
    if (m === 'POST') { const it = store.add(await readBody(req)); tell({ what: 'added', id: it.id }); log(`added ${it.id} (${it.from.how})`); return send(res, 201, it); }
  }
  if (parts.length === 1 && m === 'GET' && parts[0] === 'waiting') return send(res, 200, { waiting: store.waiting(), unsent: store.unsent() });
  if (parts.length === 1 && m === 'GET' && parts[0] === 'learned') return send(res, 200, { learned: store.learned() });
  if (parts.length === 1 && m === 'POST' && parts[0] === 'send') { const n = store.send(); if (n) { tell({ what: 'sent', n }); log(`sent ${n}`); } return send(res, 200, { sent: n }); }

  const [i, a, b, c] = parts;
  if (parts.length === 1) {
    if (m === 'PATCH') { const body = await readBody(req); const it = store.note(id(i), body.note); tell({ what: 'note', id: i }); return send(res, 200, it); }
    if (m === 'DELETE') { const it = store.remove(id(i)); tell({ what: 'removed', id: i }); return send(res, 200, it); }
  }
  if (parts.length === 2) {
    if (m === 'GET' && a === 'image') return sendFile(res, store.file(id(i)), 'max-age=31536000, immutable');
    if (m === 'POST' && a === 'keep') { const body = await readBody(req); const it = store.keep(id(i), body.note); tell({ what: 'kept', id: i }); return send(res, 200, it); }
    if (m === 'POST' && a === 'restore') { const it = store.restore(id(i)); tell({ what: 'restored', id: i }); return send(res, 200, it); }
    if (m === 'POST' && a === 'mine') { const it = store.mine(id(i), await readBody(req)); tell({ what: 'mine', id: i }); return send(res, 200, it); }
    if (m === 'POST' && a === 'points') { const pt = store.addPoint(id(i), await readBody(req)); tell({ what: 'point', id: i, point: pt.id }); return send(res, 201, pt); }
  }
  if (parts.length === 3 && a === 'points') {
    if (m === 'PATCH') { const pt = store.patchPoint(id(i), pid(b), await readBody(req)); tell({ what: 'point', id: i, point: b }); return send(res, 200, pt); }
    if (m === 'DELETE') { store.deletePoint(id(i), pid(b)); tell({ what: 'point', id: i, point: b }); return send(res, 200, { ok: true }); }
  }
  if (parts.length === 4 && a === 'points' && c === 'crop') {
    if (m === 'GET') return sendFile(res, path.join(store.cropDir, `${pid(b)}.png`));
    // The page cuts each crop itself (a canvas) and sends it here, so there is nothing to install for pictures.
    if (m === 'PUT') { store.saveCrop(id(i), pid(b), (await readBody(req)).image); tell({ what: 'crop', id: i, point: b }); return send(res, 200, { ok: true }); }
  }
  return send(res, 404, { error: 'no such thing' });
}

const server = http.createServer(async (req, res) => {
  const host = (req.headers.host || '').replace(/:\d+$/, '');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) { res.writeHead(403); return res.end('UI Taste only answers on this computer'); }
  const url = new URL(req.url, 'http://127.0.0.1');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url.pathname);
    const want = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const f = path.normalize(path.join(PUBLIC, want));
    if (!f.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
    return sendFile(res, f);
  } catch (e) {
    const code = e.status || 500; if (code === 500) log(`error ${req.method} ${url.pathname}: ${e.stack || e}`);
    if (!res.headersSent) send(res, code, { error: e.message || String(e) });
  }
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') { console.error(`Port ${cfg.port} is taken. If UI Taste is already running, that's fine: open http://127.0.0.1:${cfg.port}/. Otherwise set "port" in ui-taste.config.json.`); log(`port ${cfg.port} taken`); }
  else { console.error(e); log(`server error: ${e.stack || e}`); }
  process.exitCode = 1;
});
server.listen(cfg.port, '127.0.0.1', () => { const s = `UI Taste is running: http://127.0.0.1:${cfg.port}/  (designs in ${cfg.tasteDir})`; console.log(s); log(`started pid ${process.pid} ${process.version}`); });
