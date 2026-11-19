#!/usr/bin/env node
// The user's LinkedIn network (1st-degree connections), in data/linkedin/connections.csv.
// The file is local and git-ignored: never committed, never an email in it.
//
//   node scripts/network.mjs stats                      number of connections, latest added
//   node scripts/network.mjs search "<regex>"           case-insensitive search on name, position, company
//   node scripts/network.mjs add <file.txt|->           adds connections pasted from LinkedIn's Connections page
//   node scripts/network.mjs import <export.zip|.csv>   merges a LinkedIn data export (Connections.csv)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const FILE = process.env.NETWORK_FILE ?? join(ROOT, 'data', 'linkedin', 'connections.csv');
export const COLUMNS = ['First Name', 'Last Name', 'URL', 'Company', 'Position', 'Connected On', 'Source'];

const MONTHS = {
  janvier: 'Jan', février: 'Feb', fevrier: 'Feb', mars: 'Mar', avril: 'Apr', mai: 'May', juin: 'Jun',
  juillet: 'Jul', août: 'Aug', aout: 'Aug', septembre: 'Sep', octobre: 'Oct', novembre: 'Nov', décembre: 'Dec', decembre: 'Dec',
  january: 'Jan', february: 'Feb', march: 'Mar', april: 'Apr', may: 'May', june: 'Jun', july: 'Jul',
  august: 'Aug', september: 'Sep', october: 'Oct', november: 'Nov', december: 'Dec',
};
const MONTH_NUM = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

// --- CSV (quotes, commas and line breaks inside fields) ---
export function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x !== ''));
}

const esc = (v = '') => (/[",\n\r]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
export const toCsv = (rows) => [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => esc(r[c] ?? '')).join(','))].join('\n') + '\n';

// Reads a connections CSV (ours, or LinkedIn's Connections.csv, which starts with "Notes:" lines).
export function readConnections(text) {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  const h = rows.findIndex((r) => r[0] === 'First Name');
  if (h < 0) throw new Error('Header "First Name" not found');
  const head = rows[h];
  return rows.slice(h + 1).map((r) => {
    const o = Object.fromEntries(head.map((k, i) => [k, (r[i] ?? '').trim()]));
    delete o['Email Address']; // never an email outside the CRM
    return o;
  });
}

// --- Identity of a connection ---
export const normName = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\(.*?\)/g, '').split(',')[0].replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const normUrl = (u) => (u || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');
const key = (r) => normName(`${r['First Name']} ${r['Last Name']}`);

export function linkedInDate(s) {
  // "9 novembre 2026", "November 9, 2026", "09 Nov 2026"
  let m = /(\d{1,2})\s+([a-zéû]+)\.?\s+(\d{4})/i.exec(s);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[1].padStart(2, '0')} ${MONTHS[m[2].toLowerCase()]} ${m[3]}`;
  const short = m && m[2].slice(0, 1).toUpperCase() + m[2].slice(1, 3).toLowerCase();
  if (m && MONTH_NUM[short] !== undefined) return `${m[1].padStart(2, '0')} ${short} ${m[3]}`;
  m = /([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/i.exec(s);
  if (m && MONTHS[m[1].toLowerCase()]) return `${m[2].padStart(2, '0')} ${MONTHS[m[1].toLowerCase()]} ${m[3]}`;
  return '';
}
const when = (d) => { const m = /(\d{2}) (\w{3}) (\d{4})/.exec(d || ''); return m ? Date.UTC(+m[3], MONTH_NUM[m[2]] ?? 0, +m[1]) : 0; };

// --- Text pasted from LinkedIn's "Connections" page (French or English interface) ---
// Blocks: [Profile photo of X] / Name / Headline / "Connected on November 9, 2026" (or "Connexion le …") / Message
const NOISE = /^(photo de profil de|voir le profil|message$|envoyer un message|profile photo of|view .*profile|send message|.*'s profile picture)/i;
export function parsePasted(text, today = new Date().toISOString().slice(0, 10)) {
  const L = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !NOISE.test(l));
  const out = [];
  L.forEach((l, i) => {
    if (!/^(connexion le|connected on)/i.test(l) || i < 2) return;
    const name = L[i - 2].replace(/\s*\(private account\)/i, '').replace(/,\s*(phd|mba|recrute|hiring).*$/i, '').trim();
    const [first, ...rest] = name.split(/\s+/);
    const url = (L[i - 1].match(/https?:\/\/\S*linkedin\.com\/in\/\S+/) || [''])[0];
    out.push({ 'First Name': first, 'Last Name': rest.join(' '), URL: url, Company: '', Position: L[i - 1].replace(url, '').trim(), 'Connected On': linkedInDate(l), Source: `added ${today}` });
  });
  return out;
}

// Merge: a known connection (same URL or same name) is completed, never duplicated.
export function merge(existing, incoming, { replace = false } = {}) {
  const byKey = new Map(); const byUrl = new Map();
  const list = existing.map((r) => ({ ...r }));
  list.forEach((r) => { byKey.set(key(r), r); if (r.URL) byUrl.set(normUrl(r.URL), r); });
  let added = 0; let updated = 0;
  for (const n of incoming) {
    const known = (n.URL && byUrl.get(normUrl(n.URL))) || byKey.get(key(n));
    if (known) {
      for (const c of COLUMNS) if (n[c] && (replace || !known[c])) known[c] = n[c];
      updated++;
    } else {
      const r = Object.fromEntries(COLUMNS.map((c) => [c, n[c] ?? '']));
      list.push(r); byKey.set(key(r), r); if (r.URL) byUrl.set(normUrl(r.URL), r); added++;
    }
  }
  return { list, added, updated };
}

export function search(list, pattern) {
  const re = new RegExp(pattern, 'i');
  return list.filter((r) => re.test(`${r['First Name']} ${r['Last Name']} | ${r.Position} | ${r.Company}`));
}

// File order: most recent connection first, like the LinkedIn export (stable sort on equal dates).
export const sortByDate = (list) => [...list].sort((a, b) => when(b['Connected On']) - when(a['Connected On']));

const load = () => (existsSync(FILE) ? readConnections(readFileSync(FILE, 'utf8')) : []);
const save = (list) => { mkdirSync(dirname(FILE), { recursive: true }); writeFileSync(FILE, toCsv(sortByDate(list))); };
const line = (r) => `${r['First Name']} ${r['Last Name']} | ${r.Position} | ${r.Company || '-'} | ${r['Connected On']} | ${r.URL || 'no link'}`;

// Reads Connections.csv from a LinkedIn export zip (needs `unzip`), or a CSV given directly.
function exportText(path) {
  if (/\.csv$/i.test(path)) return readFileSync(path, 'utf8');
  try {
    return execFileSync('unzip', ['-p', path, 'Connections.csv'], { encoding: 'utf8', maxBuffer: 50e6 });
  } catch {
    throw new Error('Could not read Connections.csv from the zip (needs `unzip`, and the full export, not the first partial one). You can also unzip it and pass the CSV.');
  }
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  const [cmd, arg] = process.argv.slice(2);
  const list = load();
  try {
    if (cmd === 'stats') {
      console.log(`${list.length} connections (${FILE.replace(ROOT + '/', '')}). Latest 5:`);
      sortByDate(list).slice(0, 5).forEach((r) => console.log('- ' + line(r)));
    } else if (cmd === 'search' && arg) {
      const res = search(list, arg);
      console.log(`${res.length} connection(s) for /${arg}/i`);
      res.slice(0, 200).forEach((r) => console.log('- ' + line(r)));
    } else if (cmd === 'add' && arg) {
      const incoming = parsePasted(readFileSync(arg === '-' ? 0 : arg, 'utf8'));
      if (!incoming.length) { console.error('No connection recognised (the "Connected on …" / "Connexion le …" lines are needed).'); process.exit(1); }
      const { list: l, added, updated } = merge(list, incoming);
      save(l);
      console.log(`${incoming.length} pasted: ${added} added, ${updated} already known. Total: ${l.length}.`);
      incoming.forEach((r) => console.log('- ' + line(r)));
    } else if (cmd === 'import' && arg) {
      const date = (arg.match(/(\d{2})-(\d{2})-(\d{4})/) || []).slice(1);
      const source = date.length ? `export ${date[2]}-${date[0]}-${date[1]}` : `export ${new Date().toISOString().slice(0, 10)}`;
      const incoming = readConnections(exportText(arg)).map((r) => ({ ...r, Source: source }));
      const { list: l, added, updated } = merge(list, incoming, { replace: true });
      save(l);
      console.log(`Export: ${incoming.length} connections, ${added} new, ${updated} updated. Total: ${l.length}.`);
    } else {
      console.log('Usage: node scripts/network.mjs stats | search "<regex>" | add <file.txt|-> | import <export.zip|Connections.csv>');
      process.exit(cmd ? 1 : 0);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
