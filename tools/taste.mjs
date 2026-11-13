#!/usr/bin/env node
// Your hands on UI Taste. Every command starts the server first if it isn't running, so nothing has to stay on.
//
//   open                              start it and open the page for your person (its own window if Chrome or Edge is there)
//   waiting                           parts they boxed and sent that you haven't read back, and reads they answered "Not quite"
//   see <design> [part]               the picture's path, their line, every part (box, their words, your read, their answer), each crop's path
//   read <design> <part> "what I see" [--kind layout|navigation|buttons|colors|type|feel]
//                                     say back what you see in their part, as a short question they can answer Yes to
//   guess <design> x,y,w,h "what I think you like here" [--kind k]
//                                     go first: box a part yourself (0..1 of the picture) and ask
//   take <design> "what I take from this one"   ·   title <design> "Linear"   ·   used <design> "the settings page"
//   learned [kind]                    everything they boxed with words or said Yes to, by kind, with crop paths. Pull this before any UI.
//   bring <image file> "why I brought it" [--title t] [--url u]      a design for them to keep or clear
//   list [kept|inbox]                 every design
//   watch                             one line each time they press ➤ Send (for a background watch; optional)
//   start · stop · status · doctor    the server itself; doctor checks everything and says how to fix it
//
// <design> is its id, the last four characters of its id, or part of its name.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfgFile = path.join(ROOT, 'ui-taste.config.json');
let cfg = {}; try { cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')); } catch {}
const PORT = +(process.env.UI_TASTE_PORT || cfg.port || 7960);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA = path.resolve(ROOT, cfg.data || 'data');
const [cmd, ...a] = process.argv.slice(2);
const opt = k => { const i = a.indexOf(k); if (i < 0) return null; const v = a[i + 1]; a.splice(i, 2); return v; };
const say = (...s) => console.log(...s);
const fail = s => { say(s); process.exitCode = 1; };

const whoami = async () => { try { const r = await fetch(BASE + '/api/whoami', { signal: AbortSignal.timeout(1500) }); const j = await r.json(); return j.app === 'ui-taste' ? j : { other: true }; } catch { return null; } };
async function up() {
  const w = await whoami();
  if (w && !w.other) return w;
  if (w?.other) { fail(`Something else is on port ${PORT}. Set "port" in ${cfgFile} to a free one (7961, say), then run this again.`); return null; }
  fs.mkdirSync(DATA, { recursive: true });
  const out = fs.openSync(path.join(DATA, 'server.log'), 'a');
  const child = spawn(process.execPath, [path.join(ROOT, 'server.js')], { cwd: ROOT, detached: true, stdio: ['ignore', out, out], windowsHide: true });
  child.unref();
  for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 150)); const w2 = await whoami(); if (w2 && !w2.other) return w2; }
  fail(`UI Taste didn't start. The last lines of ${path.join(DATA, 'server.log')} say why; "node tools/taste.mjs doctor" checks the rest.`);
  return null;
}
const j = async (p, method, body) => {
  if (!(await up())) return null;
  const r = await fetch(BASE + '/api/taste' + p, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({})); if (!r.ok) { fail('failed: ' + (d.error || r.status)); return null; } return d;
};
const all = async () => await j('', 'GET');
const find = (d, q) => q && (d.items.find(x => x.id === q) || d.items.find(x => x.id.endsWith(q)) || d.items.find(x => (x.title || x.from?.title || '').toLowerCase().includes(String(q).toLowerCase())));
const name = it => it.title || it.from?.title || 'Untitled';
const pct = b => `${Math.round(b.x * 100)},${Math.round(b.y * 100)} ${Math.round(b.w * 100)}x${Math.round(b.h * 100)}%`;
const cropPath = (d, p) => { const f = path.join(d.dir, 'crops', `${p.id || p.point}.png`); return fs.existsSync(f) ? f : `${f}  (not cut yet: it appears once the page is open; until then look at the whole picture at ${pct(p.box)})`; };
const isAI = p => p.by === 'ai' || p.by === 'odie';
const line = (d, p) => {
  const st = p.verdict?.ok === true ? 'they said Yes' : p.verdict?.ok === false ? `NOT QUITE: "${p.verdict.words || ''}"` : p.read ? 'waiting on their Yes / Not quite' : p.sent === false ? 'drafted, not sent to you yet' : 'you have not read this one';
  return `  ${p.id}  ${isAI(p) ? 'your guess' : 'their box'} at ${pct(p.box)}${p.kind ? ' · ' + p.kind : ''} · ${st}\n      theirs: ${p.his || '—'}\n      yours: ${p.read?.text || '—'}\n      crop: ${cropPath(d, p)}`;
};

function openPage(url) {
  const browsers = process.platform === 'win32'
    ? [process.env['ProgramFiles(x86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe', process.env.ProgramFiles + '\\Google\\Chrome\\Application\\chrome.exe', process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe', process.env['ProgramFiles(x86)'] + '\\Google\\Chrome\\Application\\chrome.exe']
    : process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'] : [];
  const b = browsers.find(f => f && fs.existsSync(f));
  if (b) { spawn(b, [`--app=${url}`, '--start-maximized'], { detached: true, stdio: 'ignore' }).unref(); return 'its own window'; }
  if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  else spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  return 'the browser';
}

if (cmd === 'start' || cmd === 'status') {
  const w = cmd === 'start' ? await up() : await whoami();
  if (w && !w.other) say(`UI Taste is running: ${BASE}/  (pid ${w.pid}, designs in ${w.data})`);
  else if (cmd === 'status') say(w?.other ? `Something else is on port ${PORT}.` : 'UI Taste is not running. "node tools/taste.mjs start" starts it.');
} else if (cmd === 'stop') {
  const w = await whoami();
  if (!w || w.other) say('UI Taste is not running.');
  else { try { process.kill(w.pid); say('UI Taste stopped.'); } catch (e) { fail(`Couldn't stop pid ${w.pid}: ${e.message}`); } }
} else if (cmd === 'open') {
  const d = await all(); if (!d) process.exit();
  const it = a[0] ? find(d, a[0]) : null;
  const how = openPage(`${BASE}/${it ? '?open=' + it.id : ''}`);
  say(`UI Taste is open in ${how}: ${BASE}/`);
} else if (cmd === 'waiting') {
  const w = (await j('/waiting', 'GET')); if (!w) process.exit(); const d = await all();
  if (!w.waiting.length) say(`Nothing waiting on you in UI Taste.${w.unsent ? ` (${w.unsent} drafted on the page but not sent yet: they press ➤ Send when they're ready.)` : ''}`);
  for (const x of w.waiting) say(`${x.why === 'new' ? 'THEY BOXED A PART' : 'NOT QUITE'} on "${x.title || 'Untitled'}"  (${x.item} ${x.point})\n  their words: ${x.his || '(none, just the box)'}${x.read ? `\n  what you had said: ${x.read}${x.hisFirst ? `\n  their first words: ${x.hisFirst}` : ''}` : ''}\n  the part: ${cropPath(d, x)}\n  the whole picture: ${path.join(d.dir, find(d, x.item).file)}\n  answer: node tools/taste.mjs read ${x.item.slice(-4)} ${x.point} "what you see, as a short question" --kind <kind>`);
} else if (cmd === 'see') {
  const d = await all(); if (!d) process.exit(); const it = find(d, a[0]); if (!it) { fail('No design like that. "list" shows them all.'); process.exit(); }
  say(`${name(it)}  (${it.id}, ${it.status === 'inbox' ? 'you brought it, waiting on their keep or clear' : 'theirs'})\n  picture: ${path.join(d.dir, it.file)}\n  their line: ${it.note || '—'}\n  your take: ${it.take || '—'}${it.why ? `\n  why you brought it: ${it.why}` : ''}${(it.used || []).length ? `\n  used in: ${it.used.map(u => u.what).join(', ')}` : ''}`);
  for (const p of (it.points || []).filter(p => !a[1] || p.id === a[1])) say(line(d, p));
} else if (cmd === 'read') {
  const kind = opt('--kind'), d = await all(); if (!d) process.exit(); const it = find(d, a[0]);
  if (!it || !a[1] || !a[2]) { fail('read <design> <part> "what you see" [--kind layout|navigation|buttons|colors|type|feel]'); process.exit(); }
  const p = await j(`/${it.id}/points/${a[1]}`, 'PATCH', { read: a[2], kind: kind || undefined }); if (p) say(`Said back on "${name(it)}" ${p.id}: ${p.read.text}${p.kind ? ` (${p.kind})` : ' (no kind yet: add --kind so it lands in the right place in what you have learned)'}`);
} else if (cmd === 'guess') {
  const kind = opt('--kind'), d = await all(); if (!d) process.exit(); const it = find(d, a[0]); const [x, y, w, h] = String(a[1] || '').split(',').map(Number);
  if (!it || !a[2] || ![x, y, w, h].every(Number.isFinite)) { fail('guess <design> x,y,w,h "what I think you like here" [--kind k]   (x,y,w,h are 0..1 of the picture)'); process.exit(); }
  const p = await j(`/${it.id}/points`, 'POST', { by: 'ai', box: { x, y, w, h }, read: a[2], kind: kind || undefined }); if (p) say(`Your guess is on "${name(it)}": ${p.id}. It shows on their page now.`);
} else if (cmd === 'take' || cmd === 'used' || cmd === 'title') {
  const d = await all(); if (!d) process.exit(); const it = find(d, a[0]); if (!it || !a[1]) { fail(`${cmd} <design> "words"`); process.exit(); }
  const r = await j(`/${it.id}/mine`, 'POST', { [cmd]: a[1] }); if (r) say(`${cmd} on "${name(r)}": ${a[1]}`);
} else if (cmd === 'learned') {
  const l = await j('/learned', 'GET'); if (!l) process.exit(); const d = await all();
  const list = l.learned.filter(p => !a[0] || p.kind === a[0]);
  for (const p of list) say(`${(p.kind || 'unsorted').padEnd(10)} "${p.title || 'Untitled'}"${p.agreed ? ' · they said Yes' : ''}\n      theirs: ${p.his || '—'}${p.read ? `\n      yours: ${p.read}` : ''}\n      crop: ${cropPath(d, p)}`);
  if (!list.length) say(a[0] ? `Nothing about ${a[0]} yet.` : 'Nothing learned yet. Ask them to paste a design they like into UI Taste and box the part they mean.');
} else if (cmd === 'bring') {
  const url = opt('--url'), title = opt('--title'); const [file, why] = a;
  if (!file || !fs.existsSync(file)) { fail('bring <image file> "why I brought it" [--title t] [--url u]'); process.exit(); }
  const ext = path.extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg');
  const image = `data:image/${ext};base64,` + fs.readFileSync(file).toString('base64');
  const r = await j('', 'POST', { image, why: why || '', status: 'inbox', from: { how: 'ai', url, title } });
  if (r) say(`Brought: ${r.id}${title ? ' · ' + title : ''}. It's under "brought these" on their page, waiting on ♥ Keep or Clear.`);
} else if (cmd === 'list') {
  const d = await all(); if (!d) process.exit();
  const items = d.items.filter(x => !a[0] || x.status === a[0]);
  for (const it of items) say(`${it.status === 'inbox' ? 'brought' : 'theirs '} ${it.id}  ${name(it)} · ${(it.points || []).length} parts\n      ${path.join(d.dir, it.file)}\n      their line: ${it.note || '—'}${it.why ? `\n      why you brought it: ${it.why}` : ''}`);
  if (!items.length) say('No designs yet. They paste one into the page (Ctrl+V), drop one on it, or you bring one.');
} else if (cmd === 'watch') {
  if (!(await up())) process.exit();
  const seen = new Set(); let first = true;
  for (;;) {
    try {
      const w = (await (await fetch(BASE + '/api/taste/waiting')).json()).waiting || [];
      for (const x of w) { const k = x.point + x.at; if (seen.has(k)) continue; seen.add(k);
        say(`UI TASTE, THEY PRESSED ➤: ${x.why === 'new' ? 'they boxed a part of' : 'they said NOT QUITE on'} "${x.title || 'Untitled'}"${first ? ' (was already waiting)' : ''}: ${x.his || '(no words, just the box)'} · run: node tools/taste.mjs waiting`); }
      first = false;
    } catch {}
    await new Promise(r => setTimeout(r, 2500));
  }
} else if (cmd === 'doctor') {
  const ok = s => say('  ✓ ' + s), bad = (s, fix) => { say('  ✗ ' + s + '\n      fix: ' + fix); process.exitCode = 1; };
  say('UI Taste doctor');
  const major = +process.versions.node.split('.')[0];
  if (major >= 18) ok(`Node ${process.version}${major > 24 ? ' (newer than any we tested on; tell your person if something odd happens)' : ''}`); else bad(`Node ${process.version} is too old`, 'install Node 18 or newer from nodejs.org');
  if (fs.existsSync(cfgFile)) { try { JSON.parse(fs.readFileSync(cfgFile, 'utf8')); ok(`config: ${cfgFile}`); } catch (e) { bad(`ui-taste.config.json isn't valid JSON (${e.message})`, 'fix the file, or delete its contents down to {}'); } }
  else say('  · no ui-taste.config.json yet: the AI is called "Claude" with its first letter as its face. Setup step 3 makes one.');
  if (cfg.ai?.picture) { const pic = path.resolve(ROOT, cfg.ai.picture); fs.existsSync(pic) ? ok(`picture: ${pic}`) : bad(`the picture isn't there: ${pic}`, 'fix "ai.picture" in the config (a png or jpg), or remove it to use the letter'); }
  try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(path.join(DATA, '.write-test'), 'x'); fs.unlinkSync(path.join(DATA, '.write-test')); ok(`can write designs to ${DATA}`); } catch (e) { bad(`can't write to ${DATA}: ${e.message}`, 'set "data" in the config to a folder you can write to'); }
  const w = await whoami();
  if (w?.other) bad(`something else is answering on port ${PORT}`, `set "port" in the config to a free one (7961, say)`);
  else if (w) { ok(`running: ${BASE}/ (pid ${w.pid}, from ${w.root})`); if (path.resolve(w.root) !== ROOT) bad(`the copy running is a different folder: ${w.root}`, `"node tools/taste.mjs stop" there, then "start" here`); }
  else { const started = await up(); started ? ok(`it wasn't running, started it: ${BASE}/`) : bad('it would not start', `read the end of ${path.join(DATA, 'server.log')}`); }
  try { const r = await fetch(BASE + '/api/taste'); const d = await r.json(); ok(`${d.items.length} design${d.items.length === 1 ? '' : 's'}, ${d.items.reduce((n, x) => n + (x.points || []).length, 0)} parts`); } catch {}
  const log = path.join(DATA, 'server.log'); if (fs.existsSync(log)) { const last = fs.readFileSync(log, 'utf8').trim().split('\n').slice(-3); say('  last lines of the log:\n' + last.map(l => '      ' + l).join('\n')); }
} else say('taste.mjs open | waiting | see | read | guess | take | used | title | learned | bring | list | watch | start | stop | status | doctor   (the top of this file says how)');
