// Email check: syntax, MX record, catch-all domain. Never sends an email: the SMTP dialogue stops before DATA.
//   node scripts/lib/email-check.mjs check <file.csv>     columns: name, company, email
// Output on stdout only: emails live in the Notion CRM, never in Git.
// "untested" means the server gave no clear answer. It is never presented as verified.

import { randomBytes } from 'node:crypto';
import { resolveMx } from 'node:dns/promises';
import { readFileSync } from 'node:fs';
import { connect } from 'node:net';
import { runCli } from './http.mjs';

const SYNTAX = /^[a-z0-9][a-z0-9._%+'-]*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
export const isValidSyntax = (email) => SYNTAX.test(email.trim()) && !email.includes('..');

// French headers (nom, entreprise) are accepted too.
const ALIASES = { nom: 'name', entreprise: 'company' };

export function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const split = (line) => {
    const out = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { out.push(field.trim()); field = ''; }
      else field += c;
    }
    out.push(field.trim());
    return out;
  };
  const header = split(lines[0]).map((h) => ALIASES[h.toLowerCase()] ?? h.toLowerCase());
  for (const column of ['name', 'company', 'email']) {
    if (!header.includes(column)) throw new Error(`Missing column: ${column}. Expected columns: name, company, email`);
  }
  return lines.slice(1).map((line) => {
    const cells = split(line);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']));
  });
}

// Reads the RCPT reply for a random address: accepted means the domain takes everything.
export function classifyRcpt(code) {
  if (code >= 250 && code < 260) return 'yes';
  if (code >= 550 && code < 560) return 'no';
  return 'untested';
}

function probeCatchAll(host, domain, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const socket = connect({ host, port: 25 });
    let step = 0;
    let buffer = '';
    const finish = (result) => { socket.removeAllListeners(); socket.destroy(); resolve(result); };
    const send = (line) => socket.write(`${line}\r\n`);
    socket.setTimeout(timeoutMs, () => finish('untested'));
    socket.on('error', () => finish('untested'));
    socket.on('data', (chunk) => {
      buffer += chunk;
      const complete = buffer.split('\r\n').filter(Boolean).find((l) => /^\d{3} /.test(l));
      if (!complete) return;
      buffer = '';
      const code = Number(complete.slice(0, 3));
      if (code >= 400 && step < 3) { send('QUIT'); return finish('untested'); }
      if (step === 0) send('EHLO hexa-discovery-check.invalid');
      else if (step === 1) send('MAIL FROM:<>');
      else if (step === 2) send(`RCPT TO:<${randomBytes(12).toString('hex')}@${domain}>`);
      else { send('QUIT'); return finish(classifyRcpt(code)); }
      step++;
    });
  });
}

export async function checkEmail(email, cache = new Map()) {
  const address = email.trim();
  if (!isValidSyntax(address)) return { syntax: false, mx: false, catch_all: 'untested' };
  const domain = address.split('@')[1].toLowerCase();
  if (!cache.has(domain)) {
    let mx = [];
    try { mx = (await resolveMx(domain)).sort((a, b) => a.priority - b.priority); } catch { mx = []; }
    cache.set(domain, { mx: mx.length > 0, catch_all: mx.length ? await probeCatchAll(mx[0].exchange, domain) : 'untested' });
  }
  return { syntax: true, ...cache.get(domain) };
}

export const usable = (result) => result.syntax && result.mx && result.catch_all !== 'yes';

export const check = async (path) => {
  const cache = new Map();
  const rows = parseCsv(readFileSync(path, 'utf8'));
  const out = [];
  for (const row of rows) {
    const result = await checkEmail(row.email, cache);
    out.push({ ...row, ...result, usable: usable(result) });
  }
  return { rows: rows.length, results: out };
};

await runCli(import.meta.url, { check });
