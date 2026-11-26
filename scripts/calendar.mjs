#!/usr/bin/env node
// Opens Google Calendar on a pre-filled event (skill `calendar`). The harness never writes to a calendar itself
// (Google Calendar connector denied in .claude/settings.json, rule 4): this script builds the "action=TEMPLATE" link
// and opens it in the browser; the owner checks the account and clicks Save. Nothing is sent without them.
//
//   node scripts/calendar.mjs --title "Call Jane Doe (Acme)" --start 2026-11-20T15:30 [--minutes 30]
//        [--details "Brief: <Notion link>"] [--location "Phone"] [--invite email] [--print]
//
// --start is a wall-clock time in project.json `timezone` (default Europe/Paris), without offset.
// --invite adds a guest: Google sends the invitation only if the owner saves and confirms.
// --print, or any machine that is not a Mac, prints the link instead of opening it (cloud session, phone).
// The link is never written to the repo (it can hold an email, rule 3).
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readProject } from './lib/project.mjs';

const pad = (n) => String(n).padStart(2, '0');

// "2026-11-20T15:30" + 30 min -> ["20261120T153000", "20261120T160000"] (wall-clock times, no time zone maths)
export function range(start, minutes = 30) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(start || '');
  if (!m) throw new Error(`--start expected as YYYY-MM-DDTHH:MM (local time), got "${start}"`);
  if (!(Number(minutes) > 0)) throw new Error(`--minutes must be a positive number, got "${minutes}"`);
  const [, y, mo, d, h, mi] = m.map(Number);
  const t0 = new Date(Date.UTC(y, mo - 1, d, h, mi));
  const t1 = new Date(t0.getTime() + Number(minutes) * 60000);
  const f = (t) => `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00`;
  return [f(t0), f(t1)];
}

export function calendarLink({ title, start, minutes = 30, details = '', location = '', invite = '', timezone = 'Europe/Paris' }) {
  if (!title) throw new Error('--title missing');
  const [a, b] = range(start, minutes);
  const p = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${a}/${b}`, ctz: timezone });
  if (details) p.set('details', details);
  if (location) p.set('location', location);
  if (invite) p.set('add', invite);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const name = k.slice(2);
    if (name === 'print') {
      o.print = true;
      continue;
    }
    o[name] = argv[++i];
  }
  return o;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    const o = parseArgs(process.argv.slice(2));
    const timezone = readProject().timezone || 'Europe/Paris';
    const url = calendarLink({ ...o, timezone });
    if (o.print || process.platform !== 'darwin') {
      console.log(url);
    } else {
      execFileSync('open', [url]);
      console.log(`Google Calendar opened: "${o.title}", ${o.start.replace('T', ' at ')} (${o.minutes || 30} min, ${timezone}).${o.invite ? ' With a guest.' : ''} Check the account, then Save.`);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
}
