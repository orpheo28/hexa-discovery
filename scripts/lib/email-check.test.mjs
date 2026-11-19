// Email check tests, no network. Run: node --test scripts/lib/email-check.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyRcpt, isValidSyntax, parseCsv, usable } from './email-check.mjs';

test('syntax refuses malformed addresses', () => {
  assert.ok(isValidSyntax('jo.smith@acme-tool.com'));
  for (const bad of ['jo@', 'jo smith@acme.com', 'jo..s@acme.com', 'jo@acme', '@acme.com']) assert.equal(isValidSyntax(bad), false);
});

test('the CSV needs name, company and email (French headers accepted)', () => {
  assert.deepEqual(parseCsv('Name,Company,Email\n"Doe, Jo",Acme,jo@acme.com\n'), [{ name: 'Doe, Jo', company: 'Acme', email: 'jo@acme.com' }]);
  assert.deepEqual(parseCsv('Nom,Entreprise,Email\nJo,Acme,jo@acme.com\n'), [{ name: 'Jo', company: 'Acme', email: 'jo@acme.com' }]);
  assert.throws(() => parseCsv('name,email\nJo,jo@acme.com\n'), /Missing column: company/);
});

test('an unclear server gives untested, never a firm answer', () => {
  assert.deepEqual([250, 550, 450, 421, 0].map(classifyRcpt), ['yes', 'no', 'untested', 'untested', 'untested']);
});

test('a catch-all is not usable; untested stays flagged but usable', () => {
  assert.equal(usable({ syntax: true, mx: true, catch_all: 'yes' }), false);
  assert.equal(usable({ syntax: true, mx: false, catch_all: 'untested' }), false);
  assert.equal(usable({ syntax: true, mx: true, catch_all: 'untested' }), true);
});
