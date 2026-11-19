// LinkedIn network tests, without a real file. Run: node --test scripts/network.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCsv, toCsv, readConnections, parsePasted, merge, search, linkedInDate, normName, sortByDate } from './network.mjs';

const PASTED_FR = `Mathis Anselme

ESSEC | VERSO

Connexion le 9 novembre 2026

Message

Photo de profil de Wolfgang A. Kolb (private account)
Wolfgang A. Kolb (private account)

Global Head of Sales & Aftermarket bei RENK Group

Connexion le 6 novembre 2026

Message

Photo de profil de Rafael Licursi, PhD
Rafael Licursi, PhD

Founder & CEO at Stronghold AI | Former military pilot

Connexion le 5 novembre 2026

Message`;

const PASTED_EN = `Jane Doe's profile picture
Jane Doe
Head of Legal at Acme
Connected on November 12, 2026
Message`;

test('reads text pasted from the French Connections page', () => {
  const r = parsePasted(PASTED_FR, '2026-11-09');
  assert.equal(r.length, 3);
  assert.deepEqual([r[0]['First Name'], r[0]['Last Name'], r[0].Position, r[0]['Connected On']], ['Mathis', 'Anselme', 'ESSEC | VERSO', '09 Nov 2026']);
  assert.equal(`${r[1]['First Name']} ${r[1]['Last Name']}`, 'Wolfgang A. Kolb');
  assert.equal(`${r[2]['First Name']} ${r[2]['Last Name']}`, 'Rafael Licursi');
  assert.equal(r[0].Source, 'added 2026-11-09');
});

test('reads text pasted from the English Connections page', () => {
  const [r] = parsePasted(PASTED_EN, '2026-11-12');
  assert.deepEqual([r['First Name'], r['Last Name'], r.Position, r['Connected On']], ['Jane', 'Doe', 'Head of Legal at Acme', '12 Nov 2026']);
});

test('French and English LinkedIn dates are normalised', () => {
  assert.equal(linkedInDate('Connexion le 9 novembre 2026'), '09 Nov 2026');
  assert.equal(linkedInDate('Connected on November 9, 2026'), '09 Nov 2026');
  assert.equal(linkedInDate('04 Nov 2026'), '04 Nov 2026');
});

test('the LinkedIn export is read without its notes or emails', () => {
  const raw = 'Notes:\n"When exporting your connection data, you may notice..."\n\nFirst Name,Last Name,URL,Email Address,Company,Position,Connected On\nJo,"Doe, Jr",https://www.linkedin.com/in/jo,jo@acme.com,Acme,"Buyer, parts",04 Nov 2026\n';
  const [r] = readConnections(raw);
  assert.equal(r['Last Name'], 'Doe, Jr');
  assert.equal(r.Position, 'Buyer, parts');
  assert.equal('Email Address' in r, false);
});

test('the CSV round-trips without loss', () => {
  const rows = [{ 'First Name': 'Jo', 'Last Name': 'Doe', URL: '', Company: 'A, B', Position: 'Say "hi"', 'Connected On': '01 Jan 2026', Source: 'x' }];
  assert.deepEqual(readConnections(toCsv(rows)), rows);
  assert.deepEqual(parseCsv('a,"b\nc"\n'), [['a', 'b\nc']]);
});

test('a known connection is completed, never duplicated', () => {
  const base = [{ 'First Name': 'Héléna', 'Last Name': 'Jérôme', URL: 'https://www.linkedin.com/in/hj/', Company: 'Safehear', Position: 'CEO', 'Connected On': '15 Apr 2025', Source: 'export' }];
  const { list, added, updated } = merge(base, [
    { 'First Name': 'Helena', 'Last Name': 'JEROME', Position: 'CEO & Co-Founder', 'Connected On': '15 Apr 2025' },
    { 'First Name': 'Marcin', 'Last Name': 'K', Position: 'building mini radars @ Valkyrie', 'Connected On': '09 Nov 2026' },
  ]);
  assert.equal(list.length, 2);
  assert.deepEqual([added, updated], [1, 1]);
  assert.equal(list[0].Position, 'CEO'); // without replace, a known value is kept
  const r = merge(base, [{ 'First Name': 'x', 'Last Name': 'y', URL: 'http://linkedin.com/in/hj', Position: 'CEO & Co-Founder' }], { replace: true });
  assert.equal(r.list.length, 1);
  assert.equal(r.list[0].Position, 'CEO & Co-Founder');
});

test('search covers name, position and company', () => {
  const l = [{ 'First Name': 'Eva', 'Last Name': 'Debette', Position: 'Manufacturing Engineer', Company: 'Allude' }, { 'First Name': 'Jo', 'Last Name': 'Doe', Position: 'Sales', Company: 'Acme' }];
  assert.deepEqual(search(l, 'manufactur|usinage').map((r) => r['Last Name']), ['Debette']);
  assert.equal(normName('Rafael Licursi, PhD'), 'rafael licursi');
});

test('the file is sorted from the most recent connection to the oldest', () => {
  const l = [{ 'Last Name': 'A', 'Connected On': '04 Nov 2026' }, { 'Last Name': 'B', 'Connected On': '10 Nov 2026' }, { 'Last Name': 'C', 'Connected On': '15 Mar 2024' }, { 'Last Name': 'D', 'Connected On': '10 Nov 2026' }];
  assert.deepEqual(sortByDate(l).map((r) => r['Last Name']), ['B', 'D', 'A', 'C']);
});

test('the CLI adds, imports a CSV, searches and counts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'network-'));
  const env = { ...process.env, NETWORK_FILE: join(dir, 'connections.csv') };
  const cli = (...args) => spawnSync('node', [new URL('./network.mjs', import.meta.url).pathname, ...args], { encoding: 'utf8', env });
  const pasted = join(dir, 'pasted.txt');
  writeFileSync(pasted, PASTED_EN);
  assert.match(cli('add', pasted).stdout, /1 pasted: 1 added, 0 already known\. Total: 1\./);
  const exportCsv = join(dir, 'linkedin-export.csv'); // not Connections.csv: same file as connections.csv on macOS
  writeFileSync(exportCsv, 'First Name,Last Name,URL,Email Address,Company,Position,Connected On\nJane,Doe,,jane@acme.com,Acme,General Counsel,12 Nov 2026\nTom,Roe,,,Beta,CFO,01 Oct 2026\n');
  assert.match(cli('import', exportCsv).stdout, /2 connections, 1 new, 1 updated\. Total: 2\./);
  assert.doesNotMatch(readFileSync(env.NETWORK_FILE, 'utf8'), /@/);
  assert.match(cli('search', 'counsel|cfo').stdout, /2 connection\(s\)/);
  assert.match(cli('stats').stdout, /2 connections/);
  assert.equal(cli('unknown').status, 1);
});
