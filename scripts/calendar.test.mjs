// Calendar link tests. Run: node --test scripts/calendar.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { calendarLink, parseArgs, range } from './calendar.mjs';

const SCRIPT = new URL('./calendar.mjs', import.meta.url).pathname;

test('range: wall-clock start and end, across midnight', () => {
  assert.deepEqual(range('2026-11-20T15:30'), ['20261120T153000', '20261120T160000']);
  assert.deepEqual(range('2026-11-20T23:45', 30), ['20261120T234500', '20261121T001500']);
  assert.throws(() => range('20/11 15h30'), /YYYY-MM-DDTHH:MM/);
  assert.throws(() => range('2026-11-20T15:30', 0), /positive/);
});

test('link: title, dates, time zone, optional details, location and guest', () => {
  const url = new URL(calendarLink({ title: 'Call Jane Doe (Acme)', start: '2026-11-20T10:00', minutes: 45, details: 'Visio', location: 'Phone', invite: 'jane@example.com', timezone: 'Europe/London' }));
  assert.equal(url.hostname, 'calendar.google.com');
  const p = url.searchParams;
  assert.equal(p.get('action'), 'TEMPLATE');
  assert.equal(p.get('text'), 'Call Jane Doe (Acme)');
  assert.equal(p.get('dates'), '20261120T100000/20261120T104500');
  assert.equal(p.get('ctz'), 'Europe/London');
  assert.equal(p.get('details'), 'Visio');
  assert.equal(p.get('location'), 'Phone');
  assert.equal(p.get('add'), 'jane@example.com');
  assert.equal(new URL(calendarLink({ title: 'x', start: '2026-11-20T10:00' })).searchParams.get('add'), null);
  assert.throws(() => calendarLink({ start: '2026-11-20T10:00' }), /--title/);
});

test('arguments', () => {
  assert.deepEqual(parseArgs(['--title', 'Call X', '--start', '2026-11-20T10:00', '--print']), { title: 'Call X', start: '2026-11-20T10:00', print: true });
});

test('--print prints the link and opens nothing; a bad date exits 2', () => {
  const r = spawnSync('node', [SCRIPT, '--title', 'Call X', '--start', '2026-11-20T10:00', '--print'], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
  assert.equal(spawnSync('node', [SCRIPT, '--title', 'X', '--start', 'tomorrow', '--print'], { encoding: 'utf8' }).status, 2);
});
