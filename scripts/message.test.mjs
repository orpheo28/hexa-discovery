// Message check tests. Run: node --test scripts/message.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { check } from './message.mjs';

const SCRIPT = new URL('./message.mjs', import.meta.url).pathname;
const good = "Hello Jane,\n\nJe bosse avec Paul chez Hexa, il m'a conseillé de t'écrire. On veut lancer notre prochaine startup sur la gestion des contrats.\n\nTu aurais 20 min jeudi ? ;)";

test('a message that follows the rules passes, also as a note', () => {
  assert.deepEqual(check(good, { note: true }).problems, []);
});

test('a LinkedIn note over 300 characters is flagged, a message is not', () => {
  const r = check('a'.repeat(301), { note: true });
  assert.equal(r.length, 301);
  assert.match(r.problems.join(), /too long/);
  assert.deepEqual(check('a'.repeat(301)).problems, []);
});

test('accented letters count as one character', () => {
  assert.equal(check('éàç').length, 3);
});

test('AI tells and forbidden openers, French and English', () => {
  const fr = check("Je me permets de te relancer — petite question : ce n'est pas un outil, c'est un service.").problems.join(' | ');
  for (const re of [/em dash/, /Je me permets/, /Petite question/, /ce n’est pas X/]) assert.match(fr, re);
  const en = check("I hope this email finds you well. I'm reaching out because it's not a tool, it's a service. Quick question.").problems.join(' | ');
  for (const re of [/finds you well/, /reaching out/, /it’s not X/, /Quick question/]) assert.match(en, re);
  assert.match(check('Just following up on my last message.').problems.join(), /following up/);
});

test('a thank-you after a call is flagged', () => {
  assert.match(check('Merci pour le call, tu peux me présenter Paul ?').problems.join(), /thank-you/);
  assert.match(check('Thanks for your time, could you introduce me to Paul?').problems.join(), /thank-you/);
});

test('too many asks and an unfilled variable', () => {
  const p = check('Hello {first name}, free? Thursday? Or Friday?').problems.join(' | ');
  assert.match(p, /one ask only/);
  assert.match(p, /variable/);
});

test('the CLI exits 1 when something must be fixed, 0 otherwise', () => {
  assert.equal(spawnSync('node', [SCRIPT, '--note'], { input: good, encoding: 'utf8' }).status, 0);
  const bad = spawnSync('node', [SCRIPT], { input: 'Quick question — free?', encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /To fix:/);
});
