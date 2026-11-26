// Migration tests. Run: node --test scripts/migrate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate, PROJECT_DEFAULTS, SKILLS_IMPORT, STARTERS } from './migrate.mjs';

const oldRepo = () => {
  const root = mkdtempSync(join(tmpdir(), 'migrate-'));
  writeFileSync(join(root, 'project.json'), JSON.stringify({ project: 'ExampleX', owner: 'Jane', language: 'fr', partner: 'P' }, null, 2));
  writeFileSync(join(root, 'CLAUDE.md'), '# Discovery harness: ExampleX\n\nOur own text.\n');
  return root;
};

test('an old repo gets the starter files, the new settings and the skills import, its content untouched', () => {
  const root = oldRepo();
  const changes = migrate(root);
  assert.equal(changes.length, Object.keys(STARTERS).length + 2);
  for (const f of Object.keys(STARTERS)) assert.ok(existsSync(join(root, f)), f);
  const project = JSON.parse(readFileSync(join(root, 'project.json'), 'utf8'));
  assert.equal(project.project, 'ExampleX');
  assert.equal(project.partner, 'P');
  for (const [k, v] of Object.entries(PROJECT_DEFAULTS)) assert.equal(project[k], v);
  assert.deepEqual(Object.keys(project).slice(0, 5), ['project', 'owner', 'language', 'timezone', 'team_channel']);
  const claude = readFileSync(join(root, 'CLAUDE.md'), 'utf8');
  assert.ok(claude.startsWith('# Discovery harness: ExampleX\n\nOur own text.\n'));
  assert.ok(claude.includes(SKILLS_IMPORT));
});

test('migration is idempotent and never overwrites', () => {
  const root = oldRepo();
  migrate(root);
  writeFileSync(join(root, '1-idea', 'hypotheses-journal.md'), '# mine\n');
  const project = JSON.parse(readFileSync(join(root, 'project.json'), 'utf8'));
  project.timezone = 'America/New_York';
  writeFileSync(join(root, 'project.json'), JSON.stringify(project));
  assert.deepEqual(migrate(root), []);
  assert.equal(readFileSync(join(root, '1-idea', 'hypotheses-journal.md'), 'utf8'), '# mine\n');
  assert.equal(JSON.parse(readFileSync(join(root, 'project.json'), 'utf8')).timezone, 'America/New_York');
});

test('a broken project.json is left alone', () => {
  const root = oldRepo();
  writeFileSync(join(root, 'project.json'), '{broken');
  migrate(root);
  assert.equal(readFileSync(join(root, 'project.json'), 'utf8'), '{broken');
});

test('the template itself needs no migration', () => {
  assert.deepEqual(migrate(new URL('..', import.meta.url).pathname), []);
});
