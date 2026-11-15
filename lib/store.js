// The folder of designs, on disk: data/taste/<id>.<ext>, data/taste/index.json, and crops/<point>.png.
// Removing a design moves it to data/taste/removed/. Nothing is ever destroyed.
//
// A design has "points": parts of the picture, boxed.
//   The person boxes a part and says what they like  -> their words in `his`, by: 'person'
//     ...or a part they DON'T like ("Not this")        -> dislike: true
//   The AI says back what it sees, as a short question -> `read`
//   The person answers Yes or Not quite               -> `verdict` { ok, words }
//   The AI can go first with a guess                   -> by: 'ai', with a read already
// A part the person agreed with, or boxed with words (or as Not this), is something the AI has learned.
//
// One rule for Send: everything the person does (a box, a Yes, a Not quite, "want built") saves at once with
// sent:false and reaches the AI only when they press ➤ Send. `unsent` counts all of them, so the Send count
// matches their clicks. After the AI has seen a Yes or a "want built", `heard` stops it showing as waiting.
//
// Older data stays readable: points written as by 'hunter' / 'odie' (where this was born) count as person / ai.
import fs from 'node:fs';
import path from 'node:path';

export const KINDS = ['layout', 'navigation', 'buttons', 'colors', 'type', 'feel'];
export const ID = /^t-\d{8}-\d{6}-[a-z0-9]{4}$/;
export const PID = /^p-[a-z0-9]{6}$/;

export class Oops extends Error { constructor(status, msg) { super(msg); this.status = status; } }

const clean = (s, max) => (typeof s === 'string' ? s.trim().slice(0, max) : '');
export const isPerson = p => p.by === 'person' || p.by === 'hunter';
export const isAI = p => p.by === 'ai' || p.by === 'odie';

export function createStore(dir) {
  const indexFile = path.join(dir, 'index.json');
  const cropDir = path.join(dir, 'crops');
  fs.mkdirSync(cropDir, { recursive: true });

  const load = () => { try { const d = JSON.parse(fs.readFileSync(indexFile, 'utf8')); return Array.isArray(d) ? d : []; } catch { return []; } };
  const save = list => {
    fs.mkdirSync(dir, { recursive: true });
    const tmp = indexFile + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(list, null, 1));
    fs.renameSync(tmp, indexFile);
  };
  const newId = at => {
    const p = n => String(n).padStart(2, '0');
    const s = `${at.getFullYear()}${p(at.getMonth() + 1)}${p(at.getDate())}-${p(at.getHours())}${p(at.getMinutes())}${p(at.getSeconds())}`;
    return `t-${s}-${Math.random().toString(36).slice(2, 6).padEnd(4, '0')}`;
  };
  const change = (id, fn) => {
    const list = load(), it = list.find(x => x.id === id);
    if (!it) throw new Oops(404, `no design ${id}`);
    const out = fn(it, list); save(list); return out === undefined ? it : out;
  };
  const point = (it, pid) => {
    const p = (it.points || []).find(x => x.id === pid);
    if (!p) throw new Oops(404, `no part ${pid} on ${it.id}`);
    return p;
  };
  const hasCrop = pid => fs.existsSync(path.join(cropDir, `${pid}.png`));
  const titleOf = it => it.title || it.from?.title || (it.from?.how === 'glass' && it.from?.app) || null;
  // Each answer that waits for Send: a new box, a verdict, a "want built".
  const pendingBox = p => isPerson(p) && !p.read && p.sent === false;
  const pendingVerdict = p => !!p.verdict && p.verdict.sent === false;
  const pendingWant = it => !!it.want && it.want.sent === false;

  return {
    dir, cropDir, hasCrop,
    list() {
      return load().map(x => ({ status: 'kept', ...x, points: (x.points || []).map(p => ({ ...p, crop: hasCrop(p.id) })) }))
        .sort((a, b) => (b.keptAt || b.at).localeCompare(a.keptAt || a.at));
    },
    get(id) { const it = load().find(x => x.id === id); if (!it) throw new Oops(404, `no design ${id}`); return it; },

    add({ image, note, from, why, status, group, ours }) {
      if (typeof image !== 'string' || !image) throw new Oops(400, 'image is required (base64, or a data: URL)');
      const m = image.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.*)$/s);
      const ext = m ? (m[1] === 'jpeg' || m[1] === 'jpg' ? 'jpg' : m[1]) : 'png';
      const buf = Buffer.from(m ? m[2] : image, 'base64');
      if (buf.length < 100) throw new Oops(400, 'that image is empty');
      const at = new Date(), id = newId(at), file = `${id}.${ext}`;
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, file), buf);
      const f = from && typeof from === 'object' ? from : {};
      const item = {
        id, file, at: at.toISOString(), status: status === 'inbox' ? 'inbox' : 'kept', note: clean(note, 600), why: clean(why, 600) || null,
        from: { how: clean(f.how, 40) || 'paste', app: clean(f.app, 120) || null, title: clean(f.title, 300) || null, url: clean(f.url, 1000) || null },
        w: Number(f.w) || null, h: Number(f.h) || null,
      };
      if (item.status === 'kept') item.keptAt = item.at;
      if (clean(group, 40)) item.group = clean(group, 40);
      // One of their own builds, with their verdict on it: loved, or not. What they dislike is half their taste.
      if (ours === 'love' || ours === 'no') item.ours = ours;
      // Saved from the glass's ♥: the page asks once whether it's a taste or something they want built.
      if (item.from.how === 'glass') item.ask = true;
      const list = load(); list.push(item); save(list);
      return item;
    },
    // Edit one: their line (note), which pile it sits in (group, rank), or their answer to "like it, or want it built?" (want).
    note(id, b = {}) {
      return change(id, it => {
        if (typeof b.note === 'string') it.note = clean(b.note, 600);
        if (typeof b.group === 'string') { const g = clean(b.group, 40); if (g) it.group = g; else delete it.group; }
        if (Number.isFinite(b.rank)) it.rank = b.rank;
        if (b.want === true) { it.want = { at: new Date().toISOString(), sent: false }; delete it.ask; }
        if (b.want === false) { delete it.want; delete it.ask; }
      });
    },
    keep(id, note) { return change(id, it => { it.status = 'kept'; it.keptAt = new Date().toISOString(); if (typeof note === 'string') it.note = clean(note, 600); }); },
    unkeep(id) { return change(id, it => { it.status = 'inbox'; delete it.keptAt; }); },
    remove(id) {
      const list = load(), i = list.findIndex(x => x.id === id);
      if (i < 0) throw new Oops(404, `no design ${id}`);
      const [it] = list.splice(i, 1);
      const gone = path.join(dir, 'removed'); fs.mkdirSync(gone, { recursive: true });
      try { fs.renameSync(path.join(dir, it.file), path.join(gone, it.file)); } catch {}
      fs.writeFileSync(path.join(gone, `${it.id}.json`), JSON.stringify(it, null, 1));
      save(list); return it;
    },
    removed() {
      const gone = path.join(dir, 'removed');
      try { return fs.readdirSync(gone).filter(f => f.endsWith('.json')).map(f => { try { return JSON.parse(fs.readFileSync(path.join(gone, f), 'utf8')); } catch { return null; } }).filter(Boolean); } catch { return []; }
    },
    restore(id) {
      const gone = path.join(dir, 'removed'), meta = path.join(gone, `${id}.json`);
      if (!fs.existsSync(meta)) throw new Oops(404, `nothing set aside as ${id}`);
      const it = JSON.parse(fs.readFileSync(meta, 'utf8'));
      try { fs.renameSync(path.join(gone, it.file), path.join(dir, it.file)); } catch {}
      fs.unlinkSync(meta);
      const list = load(); if (!list.some(x => x.id === id)) list.push(it); save(list); return it;
    },

    // ---- looking together ----
    addPoint(id, b) {
      const by = b.by === 'ai' || b.by === 'odie' ? 'ai' : 'person', at = new Date().toISOString();
      const p = { id: 'p-' + Math.random().toString(36).slice(2, 8).padEnd(6, '0'), by, box: box(b.box), his: by === 'person' ? clean(b.his, 400) : '', at };
      if (by === 'person') { p.sent = false; if (b.dislike === true) p.dislike = true; }
      if (by === 'ai') { if (!clean(b.read, 400)) throw new Oops(400, 'a guess needs words: read'); p.read = { text: clean(b.read, 400), at }; }
      if (KINDS.includes(b.kind)) p.kind = b.kind;
      change(id, it => {
        (it.points ||= []).push(p);
        // Boxing a part of something the AI brought means they like it enough to keep it.
        if (by === 'person' && it.status === 'inbox') { it.status = 'kept'; it.keptAt = at; }
      });
      return p;
    },
    patchPoint(id, pid, b) {
      const at = new Date().toISOString(); let p;
      change(id, it => {
        p = point(it, pid);
        if (typeof b.his === 'string') p.his = clean(b.his, 400);
        if (typeof b.dislike === 'boolean' && isPerson(p)) { if (b.dislike) p.dislike = true; else delete p.dislike; }
        // Their Not quite can point at a different part than the box: the AI moves the box, and the old crop goes.
        if (b.box) { p.box = box(b.box); try { fs.unlinkSync(path.join(cropDir, `${pid}.png`)); } catch {} }
        if (typeof b.read === 'string' && clean(b.read, 400)) {
          if (p.read && p.verdict?.ok === false) (p.tries ||= []).push({ read: p.read.text, said: p.verdict.words || '', at: p.verdict.at });
          p.read = { text: clean(b.read, 400), at }; delete p.verdict;
        }
        if (KINDS.includes(b.kind)) p.kind = b.kind;
        // Every answer, Yes or Not quite, waits for their Send (one rule).
        if (b.verdict && typeof b.verdict.ok === 'boolean') p.verdict = { ok: b.verdict.ok, words: clean(b.verdict.words, 400), at, sent: false };
        if (b.verdict === null) delete p.verdict;
      });
      return p;
    },
    deletePoint(id, pid) {
      change(id, it => { point(it, pid); it.points = it.points.filter(x => x.id !== pid); });
      try { fs.unlinkSync(path.join(cropDir, `${pid}.png`)); } catch {}
    },
    saveCrop(id, pid, image) {
      point(this.get(id), pid);
      const m = String(image || '').match(/^data:image\/png;base64,(.*)$/s);
      const buf = Buffer.from(m ? m[1] : String(image || ''), 'base64');
      if (buf.length < 60) throw new Oops(400, 'that crop is empty');
      fs.writeFileSync(path.join(cropDir, `${pid}.png`), buf);
    },
    mine(id, b) {
      return change(id, it => {
        if (typeof b.title === 'string') it.title = clean(b.title, 80);
        if (typeof b.take === 'string') it.take = clean(b.take, 300);
        if (clean(b.used, 80)) (it.used ||= []).push({ what: clean(b.used, 80), at: new Date().toISOString() });
      });
    },

    // What waits on the AI, once the person pressed Send:
    //   new        a part they boxed (dislike: true when it's a "Not this") that the AI hasn't read back
    //   not quite  a read they answered Not quite, with their words
    //   yes        a read they said Yes to (shows until `heard`)
    //   want       a design they want built, not a taste (shows until `heard`)
    waiting() {
      const out = [];
      for (const it of load()) {
        const title = titleOf(it);
        if (it.want && it.want.sent === true && !it.want.heard) out.push({ item: it.id, title, why: 'want', his: it.note || '', at: it.want.sentAt || it.want.at });
        for (const p of it.points || []) {
          if (isPerson(p) && !p.read && p.sent !== false) out.push({ item: it.id, title, point: p.id, why: 'new', dislike: !!p.dislike, his: p.his || '', box: p.box, at: p.sentAt || p.at });
          else if (p.verdict?.ok === true && p.verdict.sent === true && !p.verdict.heard) out.push({ item: it.id, title, point: p.id, why: 'yes', his: p.his || '', read: p.read?.text || '', box: p.box, at: p.verdict.at });
          else if (p.verdict?.ok === false && p.verdict.sent !== false) out.push({ item: it.id, title, point: p.id, why: 'not quite', his: p.verdict.words || '', hisFirst: p.his || '', read: p.read?.text || '', box: p.box, at: p.verdict.at });
        }
      }
      return out.sort((a, b) => a.at.localeCompare(b.at));
    },
    unsent() {
      let n = 0;
      for (const it of load()) { if (pendingWant(it)) n++; for (const p of it.points || []) if (pendingBox(p) || pendingVerdict(p)) n++; }
      return n;
    },
    send() {
      const list = load(); let n = 0; const at = new Date().toISOString();
      for (const it of list) {
        if (pendingWant(it)) { it.want.sent = true; it.want.sentAt = at; n++; }
        for (const p of it.points || []) {
          if (pendingBox(p)) { p.sent = true; p.sentAt = at; n++; }
          if (pendingVerdict(p)) { p.verdict.sent = true; p.verdict.at = at; n++; }
        }
      }
      if (n) save(list); return n;
    },
    // The AI has seen these Yeses (part ids) and "want built" designs (design ids): they stop showing as waiting.
    heard({ points = [], items = [] } = {}) {
      const list = load(); let n = 0;
      for (const it of list) {
        if (items.includes(it.id) && it.want && !it.want.heard) { it.want.heard = true; n++; }
        for (const p of it.points || []) if (points.includes(p.id) && p.verdict?.ok === true && !p.verdict.heard) { p.verdict.heard = true; n++; }
      }
      if (n) save(list); return n;
    },
    // What waits on the PERSON: the AI's reads with no Yes / Not quite yet, designs the AI brought they haven't boxed or
    // removed, and glass saves still asking "like it, or want it built?". For the AI to bring up when UI work starts, never as a nudge.
    his() {
      const reads = [], brought = [], asking = [];
      for (const it of load()) {
        const title = titleOf(it);
        for (const p of it.points || []) if (p.read && !p.verdict) reads.push({ item: it.id, title, point: p.id, read: p.read.text, at: p.read.at });
        if (it.status === 'inbox') brought.push({ item: it.id, title, why: it.why || '', at: it.at });
        if (it.ask) asking.push({ item: it.id, title, at: it.at });
      }
      return { reads, brought, asking };
    },
    learned() {
      const out = [];
      for (const it of load()) {
        if (it.want) continue;   // something they want built, not a taste
        for (const p of it.points || []) {
          const agreed = p.verdict?.ok === true;
          // A Yes, or their own sent box with words or as Not this. Drafts don't count until they press Send.
          if (!agreed && !(isPerson(p) && p.sent !== false && (p.his || p.dislike))) continue;
          // Their corrections are the why: each Not quite they gave on the way, with what the AI had said.
          const corrected = (p.tries || []).map(t => ({ mine: t.read, theirs: t.said }));
          out.push({ item: it.id, title: titleOf(it), ours: it.ours || null, line: it.note || '', point: p.id, kind: p.kind || null, dislike: !!p.dislike,
            his: p.his || '', read: agreed ? p.read?.text || '' : '', agreed, corrected, said: corrected.map(c => c.theirs).filter(Boolean), box: p.box, at: p.at, crop: hasCrop(p.id) });
        }
      }
      return out;
    },
    file(id) { return path.join(dir, this.get(id).file); },
    isAI,
  };
}

function box(b) {
  const n = k => Number(b?.[k]);
  const x = Math.min(1, Math.max(0, n('x'))), y = Math.min(1, Math.max(0, n('y')));
  const w = Math.min(1 - x, n('w')), h = Math.min(1 - y, n('h'));
  if (![x, y, w, h].every(Number.isFinite) || w < 0.008 || h < 0.008) throw new Oops(400, 'box is {x,y,w,h}, each 0..1 of the picture');
  return { x, y, w, h };
}
