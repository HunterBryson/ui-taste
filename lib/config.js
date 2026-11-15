// ui-taste.config.json: what to call your AI and you, its picture, and the port. Every field is optional.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONFIG = path.join(ROOT, 'ui-taste.config.json');

const DEFAULTS = {
  ai: { name: 'Claude', picture: '' },   // picture: a path to a png/jpg; empty shows the first letter of the name
  person: { name: '' },                  // empty shows "You"
  port: 7960,
  data: 'data',                          // where the designs live, inside this folder unless you give a full path
  homebase: '',                          // a Homebase address (http://127.0.0.1:7940/) shows a '← Homebase' link on the page; empty hides it
};

export function loadConfig() {
  let mine = {};
  if (fs.existsSync(CONFIG)) {
    try { mine = JSON.parse(fs.readFileSync(CONFIG, 'utf8')); }
    // Never fall back to the defaults: that would start a second copy on the default port.
    catch (e) { console.error(`ui-taste.config.json isn't valid JSON (${e.message}). Fix it, then start again.`); process.exit(1); }
  }
  const cfg = { ...DEFAULTS, ...mine, ai: { ...DEFAULTS.ai, ...(mine.ai || {}) }, person: { ...DEFAULTS.person, ...(mine.person || {}) } };
  if (process.env.UI_TASTE_PORT) cfg.port = +process.env.UI_TASTE_PORT;
  cfg.dataDir = path.resolve(ROOT, cfg.data);
  cfg.tasteDir = path.join(cfg.dataDir, 'taste');
  cfg.picturePath = cfg.ai.picture ? path.resolve(ROOT, cfg.ai.picture) : '';
  return cfg;
}
