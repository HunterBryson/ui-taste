#!/usr/bin/env node
// Your hands on UI Taste. Every command starts the server first if it isn't running, so nothing has to stay on.
//
//   open [design]                     start it and open the page on their screen (its own window if Chrome or Edge is there)
//   add <image file> ["their words"] [--title t] [--url u]      a design they gave you, saved as theirs (like a paste on the page)
//   waiting                           everything they sent with ➤ Send: parts they boxed (and "Not this" parts), Not quites,
//                                     Yeses, and designs they want built. Yeses and want-builts show once, then count as heard
//   see <design> [part]               the picture's path, their line, every part (box, their words, your read, their answer), each crop's path
//   read <design> <part> "what I see" [--kind layout|navigation|buttons|colors|type|feel] [--box x,y,w,h]
//                                     say back what you see in their part, as a short question they can answer Yes to.
//                                     --box moves the part, when their Not quite points somewhere else on the picture
//   guess <design> x,y,w,h "what I think you like here" [--kind k]
//                                     go first: box a part yourself (0..1 of the picture) and ask
//   take <design> "what I take from this one"   ·   title <design> "Linear"   ·   used <design> "the settings page"
//   learned [kind]                    every part they said Yes to or boxed with words (and Not this), by kind, with their words,
//                                     the Not quites they gave on the way, and the crop. Pull this before any UI.
//   his                               what waits on THEM: your reads with no answer yet, designs you brought they haven't touched,
//                                     glass saves still asking "like it, or want it built?". Bring these up when UI work starts, never as a nudge
//   ours <screenshot> "their words" --love|--no [--title t] [--url u]
//                                     one of the screens you two made, with their verdict on it (what they dislike counts too)
//   bring <image file> "why I brought it" [--title t] [--url u]      a design for them to look at (sits in their list with a small tag)
//   unyes <design> <part>             take back a Yes (theirs by mistake, or yours set on their word): the read waits for their answer again
//   drop <design> <part>              remove one part from a design (its crop goes too)
//   remove <design>                   set a whole design aside (data/taste/removed/; nothing is deleted)  ·  restore <id>  brings it back
//   list [kept|inbox|removed]         every design
//   watch                             one line each time they press ➤ Send, the moment they do (for a background watch; optional)
//   skill [--remove]                  install the ui-taste skill into ~/.claude/skills/ui-taste with this clone's paths, so every chat
//                                     knows the moves (--remove takes it back)
//   start · stop · restart · status · doctor    the server itself (restart after changing the config); doctor checks everything and says how to fix it
//
// <design> is its id, the last four characters of its id, or part of its name.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = fileURLToPath(import.meta.url);
const cfgFile = path.join(ROOT, 'ui-taste.config.json');
const [cmd, ...a] = process.argv.slice(2);
const say = (...s) => console.log(...s);
const fail = s => { say(s); process.exitCode = 1; };
// A broken config never falls back to the defaults: that would quietly start a second copy on another port.
let cfg = {}, cfgError = null;
if (fs.existsSync(cfgFile)) { try { cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')); } catch (e) { cfgError = e.message; } }
// The Node to print in hints: the exact one running now, so a copied hint works even where plain 'node' is another program.
const q = p => process.platform === 'win32' && /\s/.test(p) ? '"' + p + '"' : p;
const NODE = q(process.execPath);
const RUN = `${NODE} ${q(SELF)}`;   // every hint names this: works from any folder
if (cfgError && cmd !== 'doctor') { fail(`ui-taste.config.json isn't valid JSON (${cfgError}).\nFix it (${cfgFile}), then run this again. Nothing was started.`); process.exit(); }
const PORT = +(process.env.UI_TASTE_PORT || cfg.port || 7960);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA = path.resolve(ROOT, cfg.data || 'data');
const opt = k => { const i = a.indexOf(k); if (i < 0) return null; const v = a[i + 1]; a.splice(i, 2); return v; };
const flag = k => { const i = a.indexOf(k); if (i < 0) return false; a.splice(i, 1); return true; };
const same = p => path.resolve(p || '').toLowerCase() === ROOT.toLowerCase();
const fwd = p => p.replace(/\\/g, '/');
const SKILL_SRC = path.join(ROOT, 'skill', 'SKILL.md');
const SKILL_DIR = path.join(process.env.UI_TASTE_SKILLS_DIR || path.join(os.homedir(), '.claude', 'skills'), 'ui-taste');
const SKILL_DST = path.join(SKILL_DIR, 'SKILL.md');

// Who answers on our port: nothing (null), this copy, another copy of UI Taste ({ elsewhere }), or another program ({ other }).
const whoami = async () => {
  let r; try { r = await fetch(BASE + '/api/whoami', { signal: AbortSignal.timeout(1500) }); } catch { return null; }
  const j = await r.json().catch(() => null);
  if (!j || j.app !== 'ui-taste') return { other: true };
  return same(j.root) ? j : { ...j, elsewhere: true };
};
const portTaken = w => w.other
  ? `Another program is using port ${PORT}. Set "port" in ${cfgFile} to a free one (7961, say), then run this again.`
  : `Port ${PORT} is UI Taste running from another folder (${w.root}), not this one (${ROOT}).\nIf it's an old copy you moved: run ${NODE} "${path.join(w.root, 'tools', 'taste.mjs')}" stop, then try again here. If it's a second copy on purpose, give this one its own "port" in ${cfgFile}.`;
async function up(quiet) {
  const w = await whoami();
  if (w && !w.other && !w.elsewhere) return w;
  if (w) { if (!quiet) fail(portTaken(w)); else process.exitCode = 1; return null; }
  fs.mkdirSync(DATA, { recursive: true });
  const out = fs.openSync(path.join(DATA, 'server.log'), 'a');
  const child = spawn(process.execPath, [path.join(ROOT, 'server.js')], { cwd: ROOT, detached: true, stdio: ['ignore', out, out], windowsHide: true });
  child.unref();
  for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 150)); const w2 = await whoami(); if (w2 && !w2.other && !w2.elsewhere) return w2; if (w2) break; }
  if (!quiet) fail(`UI Taste didn't start. The last lines of ${path.join(DATA, 'server.log')} say why; ${RUN} doctor checks the rest.`); else process.exitCode = 1;
  return null;
}
const j = async (p, method, body) => {
  if (!(await up())) return null;
  const r = await fetch(BASE + '/api/taste' + p, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({})); if (!r.ok) { fail('failed: ' + (d.error || r.status)); return null; } return d;
};
const all = async () => await j('', 'GET');
const find = (d, q) => q && (d.items.find(x => x.id === q) || d.items.find(x => x.id.endsWith(q)) || d.items.find(x => (x.title || x.from?.title || '').toLowerCase().includes(String(q).toLowerCase())));
const name = it => it.title || it.from?.title || (it.from?.how === 'glass' && it.from?.app) || 'Untitled';
const pct = b => `${Math.round(b.x * 100)},${Math.round(b.y * 100)} ${Math.round(b.w * 100)}x${Math.round(b.h * 100)}%`;
const cropPath = (d, p) => { const f = path.join(d.dir, 'crops', `${p.id || p.point}.png`); return fs.existsSync(f) ? f : `${f}  (not cut yet: it appears once the page is open; until then look at the whole picture at ${pct(p.box)})`; };
const isAI = p => p.by === 'ai' || p.by === 'odie';
const line = (d, p) => {
  const v = p.verdict;
  const st = v?.ok === true ? `they said Yes${v.sent === false ? ' (not sent yet)' : ''}` : v?.ok === false ? `NOT QUITE: "${v.words || ''}"${v.sent === false ? ' (not sent yet)' : ''}` : p.read ? 'waiting on their Yes / Not quite' : p.sent === false ? 'drafted, not sent to you yet' : 'you have not read this one';
  return `  ${p.id}  ${isAI(p) ? 'your guess' : p.dislike ? 'their box, NOT THIS (a part they dislike)' : 'their box'} at ${pct(p.box)}${p.kind ? ' · ' + p.kind : ''} · ${st}\n      theirs: ${p.his || '—'}${(p.tries || []).map(t => `\n      you first said: ${t.read}\n      they corrected: ${t.said || '(no words)'}`).join('')}\n      yours: ${p.read?.text || '—'}\n      crop: ${cropPath(d, p)}`;
};
const imageArg = file => { const ext = path.extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg'); return `data:image/${ext};base64,` + fs.readFileSync(file).toString('base64'); };
const partOf = async (usage) => {
  const d = await all(); if (!d) return null; const it = find(d, a[0]);
  if (!it || !a[1]) { fail(usage); return null; }
  const p = (it.points || []).find(x => x.id === a[1]); if (!p) { fail(`No part ${a[1]} on "${name(it)}". ${RUN} see ${it.id.slice(-4)} lists its parts.`); return null; }
  return { d, it, p };
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

// The skill, as installed: this clone's paths filled in.
const skillText = () => fs.readFileSync(SKILL_SRC, 'utf8').replaceAll('{{TASTE}}', fwd(SELF)).replaceAll('{{NODE}}', fwd(process.execPath));

// Every command lives in main(), so a failure returns and Node exits by itself (a hard process.exit() right after a
// fetch can trip a libuv assertion on Windows).
async function main() {
if (cmd === 'start' || cmd === 'status') {
  const w = cmd === 'start' ? await up() : await whoami();
  if (w && !w.other && !w.elsewhere) say(`UI Taste is running: ${BASE}/  (pid ${w.pid}, designs in ${w.data})`);
  else if (cmd === 'status') { if (w) fail(portTaken(w)); else say(`UI Taste is not running. ${RUN} start starts it.`); }
} else if (cmd === 'stop' || cmd === 'restart') {
  // Only ever stops this folder's copy: another copy on the same port is someone's designs.
  const w = await whoami();
  if (w?.other || w?.elsewhere) { fail(portTaken(w)); return; }
  if (!w) say('UI Taste is not running.');
  else { try { process.kill(w.pid); for (let i = 0; i < 30 && await whoami(); i++) await new Promise(r => setTimeout(r, 100)); say('UI Taste stopped.'); } catch (e) { fail(`Couldn't stop pid ${w.pid}: ${e.message}`); } }
  if (cmd === 'restart' && !process.exitCode) { const w2 = await up(); if (w2) say(`UI Taste is running again: ${BASE}/ (it read the config fresh)`); }
} else if (cmd === 'add') {
  // A design your person gave you (a file, a screenshot you took for them): it's theirs, same as a paste on the page.
  const title = opt('--title'), url = opt('--url'); const [file, words] = a;
  if (!file || !fs.existsSync(file)) { fail('add <image file> ["their words about it"] [--title t] [--url u]'); return; }
  const r = await j('', 'POST', { image: imageArg(file), note: words || '', from: { how: 'given', url, title } });
  if (r) say(`Added to their designs: ${r.id}${title ? ' · ' + title : ''}. Open the page so they see it (${RUN} open ${r.id.slice(-4)}).`);
} else if (cmd === 'open') {
  const d = await all(); if (!d) return;
  const it = a[0] ? find(d, a[0]) : null;
  const how = openPage(`${BASE}/${it ? '?open=' + it.id : ''}`);
  say(`UI Taste is open in ${how}: ${BASE}/`);
} else if (cmd === 'waiting') {
  const w = await j('/waiting', 'GET'); if (!w) return; const d = await all();
  if (!w.waiting.length) say(`Nothing waiting on you in UI Taste.${w.unsent ? ` (${w.unsent} saved on the page but not sent yet: they press ➤ Send when they're ready.)` : ''}`);
  const yes = w.waiting.filter(x => x.why === 'yes'), want = w.waiting.filter(x => x.why === 'want');
  for (const x of yes) say(`THEY SAID YES on "${x.title || 'Untitled'}" (${x.item.slice(-4)} ${x.point}): ${x.read}${x.his ? `\n  their words had been: ${x.his}` : ''}\n  That's learned now. (If they didn't mean it: ${RUN} unyes ${x.item.slice(-4)} ${x.point})`);
  for (const x of want) { const it = find(d, x.item); say(`THEY WANT THIS BUILT: "${x.title || 'Untitled'}" (${x.item})\n  a request from their screen, not a taste. Their words: ${x.his || '(none)'}\n  the picture: ${it ? path.join(d.dir, it.file) : '?'}`); }
  for (const x of w.waiting.filter(x => x.why === 'new' || x.why === 'not quite')) say(`${x.why === 'new' ? (x.dislike ? 'THEY BOXED A PART THEY DO NOT LIKE (Not this)' : 'THEY BOXED A PART') : 'NOT QUITE'} on "${x.title || 'Untitled'}"  (${x.item} ${x.point})\n  their words: ${x.his || '(none, just the box)'}${x.read ? `\n  what you had said: ${x.read}${x.hisFirst ? `\n  their first words: ${x.hisFirst}` : ''}` : ''}\n  the part: ${cropPath(d, x)}\n  the whole picture: ${path.join(d.dir, find(d, x.item).file)}\n  answer: ${RUN} read ${x.item.slice(-4)} ${x.point} "what you see, as a short question" --kind <kind>${x.why === 'not quite' ? '  (add --box x,y,w,h if their words point at a different part)' : ''}`);
  // Yeses and want-builts show once: you've seen them now.
  if (yes.length || want.length) await j('/heard', 'POST', { points: yes.map(x => x.point), items: want.map(x => x.item) });
} else if (cmd === 'see') {
  const d = await all(); if (!d) return; const it = find(d, a[0]); if (!it) { fail(`No design like that. ${RUN} list shows them all.`); return; }
  const whose = it.want ? 'they want this built (a request, not a taste)' : it.status === 'inbox' ? 'you brought it; they haven\'t boxed anything on it yet' : 'theirs';
  say(`${name(it)}  (${it.id}, ${whose}${it.ours ? `, one of yours: they ${it.ours === 'love' ? 'loved it' : 'did NOT like it'}` : ''}${it.ask ? ', from the glass: still asking them "like it, or want it built?"' : ''})\n  picture: ${path.join(d.dir, it.file)}\n  their line: ${it.note || '—'}\n  your take: ${it.take || '—'}${it.why ? `\n  why you brought it: ${it.why}` : ''}${(it.used || []).length ? `\n  used in: ${it.used.map(u => u.what).join(', ')}` : ''}`);
  for (const p of (it.points || []).filter(p => !a[1] || p.id === a[1])) say(line(d, p));
} else if (cmd === 'read') {
  const kind = opt('--kind'), bx = opt('--box'), d = await all(); if (!d) return; const it = find(d, a[0]);
  if (!it || !a[1] || !a[2]) { fail('read <design> <part> "what you see" [--kind layout|navigation|buttons|colors|type|feel] [--box x,y,w,h]'); return; }
  let box; if (bx) { const [x, y, w, h] = bx.split(',').map(Number); if (![x, y, w, h].every(Number.isFinite)) { fail('--box is x,y,w,h, each 0..1 of the picture'); return; } box = { x, y, w, h }; }
  const p = await j(`/${it.id}/points/${a[1]}`, 'PATCH', { read: a[2], kind: kind || undefined, box }); if (p) say(`Said back on "${name(it)}" ${p.id}: ${p.read.text}${p.kind ? ` (${p.kind})` : ' (no kind yet: add --kind so it lands in the right place in what you have learned)'}${box ? `\n  The box moved to ${pct(p.box)}; the page cuts its new crop next time it's open.` : ''}`);
} else if (cmd === 'guess') {
  const kind = opt('--kind'), d = await all(); if (!d) return; const it = find(d, a[0]); const [x, y, w, h] = String(a[1] || '').split(',').map(Number);
  if (!it || !a[2] || ![x, y, w, h].every(Number.isFinite)) { fail('guess <design> x,y,w,h "what I think you like here" [--kind k]   (x,y,w,h are 0..1 of the picture)'); return; }
  const p = await j(`/${it.id}/points`, 'POST', { by: 'ai', box: { x, y, w, h }, read: a[2], kind: kind || undefined }); if (p) say(`Your guess is on "${name(it)}": ${p.id}. It shows on their page now.`);
} else if (cmd === 'take' || cmd === 'used' || cmd === 'title') {
  const d = await all(); if (!d) return; const it = find(d, a[0]); if (!it || !a[1]) { fail(`${cmd} <design> "words"`); return; }
  const r = await j(`/${it.id}/mine`, 'POST', { [cmd]: a[1] }); if (r) say(`${cmd} on "${name(r)}": ${a[1]}`);
} else if (cmd === 'learned') {
  const l = await j('/learned', 'GET'); if (!l) return; const d = await all();
  const list = l.learned.filter(p => !a[0] || p.kind === a[0]);
  for (const p of list) say(`${(p.kind || 'unsorted').padEnd(10)} "${p.title || 'Untitled'}"${p.dislike ? ' · NOT THIS: a part they dislike, what to avoid' : ''}${p.ours === 'no' ? ' · ONE OF YOURS THEY DID NOT LIKE: what to avoid' : p.ours === 'love' ? ' · one of yours, they loved it' : ''}${p.agreed ? ' · they said Yes' : ' · their own box and words (no Yes to a read yet)'}${p.line ? `\n      their line on the whole design: ${p.line}` : ''}\n      theirs: ${p.his || '—'}${(p.corrected || []).map(c => `\n      you first said: ${c.mine}\n      THEY CORRECTED: ${c.theirs || '(no words)'}`).join('')}${p.read ? `\n      yours: ${p.read}` : ''}\n      crop: ${cropPath(d, p)}`);
  if (!list.length) say(a[0] ? `Nothing about ${a[0]} yet.` : 'Nothing learned yet. Ask them to paste a design they like into UI Taste and box the part they mean.');
} else if (cmd === 'his') {
  const h = await j('/his', 'GET'); if (!h) return;
  for (const r of h.reads) say(`"${r.title || 'Untitled'}" (${r.item.slice(-4)} ${r.point}): your read, no answer yet since ${r.at.slice(0, 10)}\n    ${r.read}`);
  for (const b of h.brought) say(`"${b.title || 'Untitled'}" (${b.item.slice(-4)}): you brought it ${b.at.slice(0, 10)}; they haven't boxed anything on it${b.why ? `\n    why: ${b.why}` : ''}`);
  for (const s of h.asking) say(`"${s.title || 'Untitled'}" (${s.item.slice(-4)}): saved from the glass ${s.at.slice(0, 10)}; still asking them "like it, or want it built?"`);
  if (!h.reads.length && !h.brought.length && !h.asking.length) say('Nothing in UI Taste waits on them.');
} else if (cmd === 'ours') {
  // One of the screens you made together, with their verdict in their words: --love or --no. It goes in their list with
  // their words as its line, so you can box the part you think earned the verdict and ask them (guess).
  const sign = flag('--no') ? 'no' : flag('--love') ? 'love' : null;
  const title = opt('--title'), url = opt('--url'); const [file, words] = a;
  if (!file || !fs.existsSync(file) || !words || !sign) { fail('ours <screenshot of something you made> "their words on it" --love|--no [--title "The settings page"] [--url u]'); return; }
  const r = await j('', 'POST', { image: imageArg(file), note: words, ours: sign, status: 'kept', from: { how: 'ours', url, title } });
  if (r) { if (title) await j(`/${r.id}/mine`, 'POST', { title }); say(`Ours (${sign === 'love' ? 'they loved it' : 'they did not'}): ${r.id}${title ? ' · ' + title : ''}\n  next: box the part you think earned it, as a question: ${RUN} guess ${r.id.slice(-4)} x,y,w,h "..." --kind <kind>`); }
} else if (cmd === 'unyes') {
  const { it, p } = await partOf('unyes <design> <part>   (takes back a Yes; the read waits for their answer again)');
  if (p.verdict?.ok !== true) { fail(`"${name(it)}" ${p.id} has no Yes to take back.`); return; }
  const r = await j(`/${it.id}/points/${p.id}`, 'PATCH', { verdict: null }); if (r) say(`Took back the Yes on "${name(it)}" ${p.id}. Your read is waiting for their answer again.`);
} else if (cmd === 'drop') {
  const got = await partOf('drop <design> <part>   (removes one part from a design)'); if (!got) return; const { it, p } = got;
  const r = await j(`/${it.id}/points/${p.id}`, 'DELETE'); if (r) say(`Removed part ${p.id} from "${name(it)}"${p.his ? ` (their words were: ${p.his})` : ''}.`);
} else if (cmd === 'remove') {
  const d = await all(); if (!d) return; const it = find(d, a[0]); if (!it) { fail('remove <design>   (sets it aside; restore <id> brings it back)'); return; }
  const r = await j('/' + it.id, 'DELETE'); if (r) say(`Set aside: "${name(it)}" (${it.id}), in ${path.join(d.dir, 'removed')}. Bring it back with ${RUN} restore ${it.id}`);
} else if (cmd === 'restore') {
  let id = a[0]; if (!id) { fail('restore <id>   (list removed shows what was set aside)'); return; }
  if (!/^t-\d{8}-\d{6}-[a-z0-9]{4}$/.test(id)) { const rm = await j('/removed', 'GET'); if (!rm) return; const m = rm.removed.find(x => x.id.endsWith(id) || (x.title || x.from?.title || '').toLowerCase().includes(id.toLowerCase())); if (!m) { fail(`Nothing set aside like "${id}". ${RUN} list removed shows them.`); return; } id = m.id; }
  const r = await j(`/${id}/restore`, 'POST', {}); if (r) say(`Back in their designs: "${name(r)}" (${r.id}).`);
} else if (cmd === 'bring') {
  const url = opt('--url'), title = opt('--title'); const [file, why] = a;
  if (!file || !fs.existsSync(file)) { fail('bring <image file> "why I brought it" [--title t] [--url u]'); return; }
  const r = await j('', 'POST', { image: imageArg(file), why: why || '', status: 'inbox', from: { how: 'ai', url, title } });
  if (r) say(`Brought: ${r.id}${title ? ' · ' + title : ''}. It's in their list with a small tag saying you brought it; when they box a part on it, it's theirs.`);
} else if (cmd === 'list') {
  if (a[0] === 'removed') {
    const rm = await j('/removed', 'GET'); if (!rm) return;
    for (const it of rm.removed) say(`removed ${it.id}  ${name(it)} · ${(it.points || []).length} parts   (${RUN} restore ${it.id})`);
    if (!rm.removed.length) say('Nothing set aside.');
  } else {
    const d = await all(); if (!d) return;
    const items = d.items.filter(x => !a[0] || x.status === a[0]);
    for (const it of items) say(`${it.want ? 'BUILD  ' : it.status === 'inbox' ? 'brought' : 'theirs '} ${it.id}  ${name(it)} · ${(it.points || []).length} parts${it.ours ? ` · ours, ${it.ours === 'love' ? 'loved' : 'not liked'}` : ''}\n      ${path.join(d.dir, it.file)}\n      their line: ${it.note || '—'}${it.why ? `\n      why you brought it: ${it.why}` : ''}`);
    if (!items.length) say(a[0] ? `None in ${a[0]}.` : 'No designs yet. They paste one into the page (Ctrl+V), drop one on it, or you bring one.');
  }
} else if (cmd === 'watch') {
  // Listens on the page's own live stream, so a Send is printed the moment it happens, however fast. Reconnects if the server restarts.
  if (!(await up())) return;
  const seen = new Set(); let first = true;
  const report = async () => {
    try {
      const w = (await (await fetch(BASE + '/api/taste/waiting')).json()).waiting || [];
      for (const x of w) { const k = (x.point || x.item) + x.why + x.at; if (seen.has(k)) continue; seen.add(k);
        const what = x.why === 'new' ? (x.dislike ? 'they boxed a part they do NOT like on' : 'they boxed a part of') : x.why === 'yes' ? 'they said YES on' : x.why === 'want' ? 'they want this built:' : 'they said NOT QUITE on';
        say(`UI TASTE, THEY PRESSED ➤: ${what} "${x.title || 'Untitled'}"${first ? ' (was already waiting)' : ''}: ${x.his || x.read || '(no words, just the box)'} · run: ${RUN} waiting`); }
      first = false;
    } catch {}
  };
  await report();
  for (;;) {
    try {
      const r = await fetch(BASE + '/api/events');
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf('\n\n')) >= 0) { const ev = buf.slice(0, i); buf = buf.slice(i + 2); if (/^data: .*"what":"(sent|added|note)"/m.test(ev)) await report(); }
      }
    } catch {}
    await new Promise(r => setTimeout(r, 2000)); await up(true); await report();
  }
} else if (cmd === 'skill') {
  if (flag('--remove')) {
    if (!fs.existsSync(SKILL_DST)) { say(`The ui-taste skill isn't installed (${SKILL_DIR}).`); return; }
    if (!/^name:\s*ui-taste\s*$/m.test(fs.readFileSync(SKILL_DST, 'utf8'))) { fail(`${SKILL_DST} isn't this skill (no "name: ui-taste"), so it was left alone.`); return; }
    fs.rmSync(SKILL_DIR, { recursive: true, force: true }); say(`Removed the ui-taste skill: ${SKILL_DIR}`);
  } else {
    if (!fs.existsSync(SKILL_SRC)) { fail(`skill/SKILL.md is missing from this clone (${SKILL_SRC}). git pull, then try again.`); return; }
    if (fs.existsSync(SKILL_DST) && !/^name:\s*ui-taste\s*$/m.test(fs.readFileSync(SKILL_DST, 'utf8'))) { fail(`${SKILL_DST} is already there and isn't this skill, so it was left alone.`); return; }
    fs.mkdirSync(SKILL_DIR, { recursive: true }); fs.writeFileSync(SKILL_DST, skillText());
    say(`Installed the ui-taste skill: ${SKILL_DST}\n  It runs ${fwd(SELF)} with ${fwd(process.execPath)}. New chats pick it up; run "skill" again after a git pull to refresh it.`);
  }
} else if (cmd === 'doctor') {
  const ok = s => say('  ✓ ' + s), warn = (s, fix) => say('  ⚠ ' + s + (fix ? '\n      fix: ' + fix : '')), bad = (s, fix) => { say('  ✗ ' + s + '\n      fix: ' + fix); process.exitCode = 1; };
  say('UI Taste doctor'); let startFailed = false;
  const major = +process.versions.node.split('.')[0];
  if (major >= 18) ok(`Node ${process.version}${major > 24 ? ' (newer than any we tested on; tell your person if something odd happens)' : ''}`); else bad(`Node ${process.version} is too old`, 'install Node 18 or newer from nodejs.org');
  const exe = path.basename(process.execPath).toLowerCase();
  if (exe !== 'node.exe' && exe !== 'node') bad(`"node" here is really ${process.execPath}, a different program`, `run every command with the real Node by its full path, e.g. "C:\\Program Files\\nodejs\\node.exe" "${SELF}" doctor (where.exe node lists them all)`);
  if (cfgError) { bad(`ui-taste.config.json isn't valid JSON (${cfgError})`, `fix ${cfgFile} (usually a single backslash in a path: write paths with forward slashes, C:/Users/...; or a stray comma or quote), or cut it down to {}. Nothing else runs until it's fixed.`); return; }
  if (fs.existsSync(cfgFile)) ok(`config: ${cfgFile}`);
  else say('  · no ui-taste.config.json yet: the AI is called "Claude" with its first letter as its face. Setup step 3 makes one.');
  if (cfg.ai?.picture) { const pic = path.resolve(ROOT, cfg.ai.picture); fs.existsSync(pic) ? ok(`picture: ${pic}`) : bad(`the picture isn't there: ${pic}`, 'fix "ai.picture" in the config (a png, jpg or webp), or remove it to use the letter'); }
  try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(path.join(DATA, '.write-test'), 'x'); fs.unlinkSync(path.join(DATA, '.write-test')); ok(`can write designs to ${DATA}`); } catch (e) { bad(`can't write to ${DATA}: ${e.message}`, 'set "data" in the config to a folder you can write to'); }
  const w = await whoami();
  if (w?.other) bad(`another program is answering on port ${PORT}`, `set "port" in ${cfgFile} to a free one (7961, say), then "start"`);
  else if (w?.elsewhere) bad(`port ${PORT} is UI Taste running from another folder: ${w.root}`, `if that's an old copy you moved, run ${NODE} "${path.join(w.root, 'tools', 'taste.mjs')}" stop, then "start" here. If it's a second copy on purpose, give this one its own "port"`);
  else if (w) ok(`running: ${BASE}/ (pid ${w.pid})`);
  else { const started = await up(true); if (!started) startFailed = true; started ? ok(`it wasn't running, started it: ${BASE}/`) : bad('it would not start', `read the end of ${path.join(DATA, 'server.log')} (below)`); }
  if (w && !w.other && !w.elsewhere || !w) { try { const r = await fetch(BASE + '/api/taste'); const d = await r.json(); ok(`${d.items.length} design${d.items.length === 1 ? '' : 's'}, ${d.items.reduce((n, x) => n + (x.points || []).length, 0)} parts`); } catch {} }
  // The glass is optional; when it's there, its ♥ Taste needs GLASS_TASTE_URL pointing here.
  let gUrl = process.env.GLASS_TASTE_URL || '', gWhere = gUrl ? 'this shell' : '';
  if (!gUrl) { try { gUrl = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude', 'settings.json'), 'utf8'))?.env?.GLASS_TASTE_URL || ''; if (gUrl) gWhere = '~/.claude/settings.json'; } catch {} }
  if (!gUrl) warn(`the glass's ♥ Taste isn't pointed at UI Taste (no GLASS_TASTE_URL). Fine if they don't use the glass.`, `${NODE} "${path.join(ROOT, 'tools', 'fit.mjs')}" --settings sets it, then glass.js restart`);
  else if (gUrl.replace(/\/+$/, '') !== BASE && gUrl.replace(/\/+$/, '') !== `http://localhost:${PORT}`) warn(`GLASS_TASTE_URL is ${gUrl} (in ${gWhere}), but this UI Taste is on ${BASE}`, `change it to ${BASE} in ~/.claude/settings.json, then glass.js restart`);
  else ok(`the glass's ♥ Taste points here (GLASS_TASTE_URL, in ${gWhere})`);
  // The skill: so every chat knows the moves, not only chats opened in this folder.
  if (!fs.existsSync(SKILL_DST)) warn(`the ui-taste skill isn't installed, so only chats opened in this folder know how UI Taste works`, `${RUN} skill`);
  else if (!/^name:\s*ui-taste\s*$/m.test(fs.readFileSync(SKILL_DST, 'utf8'))) warn(`${SKILL_DST} is some other skill, not this one`, 'look at it before changing anything');
  else if (fs.existsSync(SKILL_SRC) && fs.readFileSync(SKILL_DST, 'utf8') !== skillText()) warn(`the ui-taste skill is installed but older than this clone's skill/SKILL.md (or points at another clone)`, `${RUN} skill`);
  else ok(`the ui-taste skill is installed: ${SKILL_DST}`);
  const log = path.join(DATA, 'server.log'); if (startFailed && fs.existsSync(log)) { const last = fs.readFileSync(log, 'utf8').trim().split('\n').slice(-3); say('  last lines of the log:\n' + last.map(l => '      ' + l).join('\n')); }
  if (!process.exitCode) say('All good.');
} else fail(`${cmd ? `"${cmd}" isn't a command. ` : ''}taste.mjs open | add | waiting | see | read | guess | take | used | title | learned | his | ours | bring | unyes | drop | remove | restore | list | watch | skill | start | stop | restart | status | doctor   (the top of this file says how)`);
}
await main();
