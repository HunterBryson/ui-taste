// The folder of designs, on disk: data/taste/<id>.<ext>, data/taste/index.json, and crops/<point>.png.
// Removing a design moves it to data/taste/removed/. Nothing is ever destroyed.
//
// A design has "points": parts of the picture, boxed.
//   The person boxes a part and says what they like  -> his/her words in `his`, by: 'person'
//   The AI says back what it sees, as a short question -> `read`
//   The person answers Yes or Not quite               -> `verdict` { ok, words }
//   The AI can go first with a guess                   -> by: 'ai', with a read already
// A part the person agreed with (or boxed with words) is something the AI has learned.
import fs from 'node:fs';
import path from 'node:path';

export const KINDS = ['layout', 'navigation', 'buttons', 'colors', 'type', 'feel'];
export const ID = /^t-\d{8}-\d{6}-[a-z0-9]{4}$/;
export const PID = /^p-[a-z0-9]{6}$/;

export class Oops extends Error { constructor(status, msg) { super(msg); this.status = status; } }

const clean = (s, max) => (typeof s === 'string' ? s.trim().slice(0, max) : '');
const isPerson = p => p.by === 'person' || p.by === 'hunter';   // 'hunter' is how points were written where this was born
const isAI = p => p.by === 'ai' || p.by === 'odie';

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

  return {
    dir, cropDir, hasCrop,
    list() {
      return load().map(x => ({ status: 'kept', ...x, points: (x.points || []).map(p => ({ ...p, crop: hasCrop(p.id) })) }))
        .sort((a, b) => (b.keptAt || b.at).localeCompare(a.keptAt || a.at));
    },
    get(id) { const it = load().find(x => x.id === id); if (!it) throw new Oops(404, `no design ${id}`); return it; },

    add({ image, note, from, why, status }) {
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
      const list = load(); list.push(item); save(list);
      return item;
    },
    note(id, note) { return change(id, it => { if (typeof note === 'string') it.note = clean(note, 600); }); },
    keep(id, note) { return change(id, it => { it.status = 'kept'; it.keptAt = new Date().toISOString(); if (typeof note === 'string') it.note = clean(note, 600); }); },
    remove(id) {
      const list = load(), i = list.findIndex(x => x.id === id);
      if (i < 0) throw new Oops(404, `no design ${id}`);
      const [it] = list.splice(i, 1);
      const gone = path.join(dir, 'removed'); fs.mkdirSync(gone, { recursive: true });
      try { fs.renameSync(path.join(dir, it.file), path.join(gone, it.file)); } catch {}
      fs.writeFileSync(path.join(gone, `${it.id}.json`), JSON.stringify(it, null, 1));
      save(list); return it;
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
      if (by === 'person') p.sent = false;
      if (by === 'ai') { if (!clean(b.read, 400)) throw new Oops(400, 'a guess needs words: read'); p.read = { text: clean(b.read, 400), at }; }
      if (KINDS.includes(b.kind)) p.kind = b.kind;
      change(id, it => { (it.points ||= []).push(p); });
      return p;
    },
    patchPoint(id, pid, b) {
      const at = new Date().toISOString(); let p;
      change(id, it => {
        p = point(it, pid);
        if (typeof b.his === 'string') p.his = clean(b.his, 400);
        // Their Not quite can point at a different part than the box: the AI moves the box, and the old crop goes.
        if (b.box) { p.box = box(b.box); try { fs.unlinkSync(path.join(cropDir, `${pid}.png`)); } catch {} }
        if (typeof b.read === 'string' && clean(b.read, 400)) {
          if (p.read && p.verdict?.ok === false) (p.tries ||= []).push({ read: p.read.text, said: p.verdict.words || '', at: p.verdict.at });
          p.read = { text: clean(b.read, 400), at }; delete p.verdict;
        }
        if (KINDS.includes(b.kind)) p.kind = b.kind;
        if (b.verdict && typeof b.verdict.ok === 'boolean') { p.verdict = { ok: b.verdict.ok, words: clean(b.verdict.words, 400), at }; if (!b.verdict.ok) p.verdict.sent = false; }
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

    // What waits on the AI: parts the person boxed and sent that it hasn't read back, and reads they answered "Not quite".
    waiting() {
      const out = [];
      for (const it of load()) for (const p of it.points || []) {
        const title = it.title || it.from?.title || null;
        if (isPerson(p) && !p.read && p.sent !== false) out.push({ item: it.id, title, point: p.id, why: 'new', his: p.his || '', box: p.box, at: p.sentAt || p.at });
        else if (p.verdict && p.verdict.ok === false && p.verdict.sent !== false) out.push({ item: it.id, title, point: p.id, why: 'not quite', his: p.verdict.words || '', hisFirst: p.his || '', read: p.read?.text || '', box: p.box, at: p.verdict.at });
      }
      return out.sort((a, b) => a.at.localeCompare(b.at));
    },
    unsent() {
      let n = 0;
      for (const it of load()) for (const p of it.points || []) if ((isPerson(p) && !p.read && p.sent === false) || (p.verdict?.ok === false && p.verdict.sent === false)) n++;
      return n;
    },
    send() {
      const list = load(); let n = 0; const at = new Date().toISOString();
      for (const it of list) for (const p of it.points || []) {
        if (isPerson(p) && !p.read && p.sent === false) { p.sent = true; p.sentAt = at; n++; }
        if (p.verdict?.ok === false && p.verdict.sent === false) { p.verdict.sent = true; p.verdict.at = at; n++; }
      }
      save(list); return n;
    },
    learned() {
      const out = [];
      for (const it of load()) for (const p of it.points || []) {
        const agreed = p.verdict?.ok === true;
        if (!agreed) continue;   // learned means they said Yes to your read: their words alone are still a question
        // Their steering on the way to Yes is part of what was learned, often the most telling part.
        const said = (p.tries || []).map(t => t.said).filter(Boolean);
        out.push({ item: it.id, title: it.title || it.from?.title || null, point: p.id, kind: p.kind || null, his: p.his || '', said, read: agreed ? p.read?.text || '' : '', agreed, box: p.box, at: p.at, crop: hasCrop(p.id) });
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
