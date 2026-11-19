// Repository checks: they guard the discovery's content, and pass on an empty template.
// Run: node --test scripts/repo.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CONTENT_DIRS = ['1-idea', '2-calls', '3-knowledge', '4-sources', '5-research', '6-templates', 'docs'];
const CONTENT_FILES = ['STATUS.md', 'README.md', 'CLAUDE.md', 'AGENTS.md', 'project.json'];

function walk(dir) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((name) => {
    const p = join(abs, name);
    return statSync(p).isDirectory() ? walk(relative(ROOT, p)) : [relative(ROOT, p)];
  });
}
const mdIn = (dir) => walk(dir).filter((f) => f.endsWith('.md'));
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

// Placeholders and examples are allowed; a real address is not.
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const EMAIL_OK = /@(example|acme|company|domain|yourcompany)\.|^(noreply|no-reply)@/i;
const PHONE_FR = /(?<![0-9A-Fa-f])(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}(?![0-9A-Fa-f])/;
const PHONE_INTL = /\+\d{1,3}[\s.-]\(?\d{1,4}\)?(?:[\s.-]\d{2,4}){2,4}\b/;

test('no email or phone number in the repository content (they live only in the Notion CRM)', () => {
  const files = [...CONTENT_DIRS.flatMap(walk), ...CONTENT_FILES.filter((f) => existsSync(join(ROOT, f)))];
  const leaks = [];
  for (const f of files) {
    if (!/\.(md|json|csv|txt)$/i.test(f)) continue;
    const t = read(f);
    const emails = (t.match(EMAIL) ?? []).filter((e) => !EMAIL_OK.test(e));
    if (emails.length) leaks.push(`${f}: email ${emails[0]}`);
    const phone = PHONE_FR.exec(t) ?? PHONE_INTL.exec(t);
    if (phone) leaks.push(`${f}: phone ${phone[0]}`);
  }
  assert.deepEqual(leaks, [], `personal data outside the CRM:\n${leaks.join('\n')}`);
});

test('every call, source and research file starts with its YAML header', () => {
  const missing = ['2-calls', '4-sources', '5-research']
    .flatMap(mdIn)
    .filter((f) => !f.endsWith('README.md'))
    .filter((f) => !read(f).startsWith('---\n'));
  assert.deepEqual(missing, [], `files without a YAML header: ${missing.join(', ')}`);
});

// Incidents of the first harness (9 and 10 Nov. 2026): a script and a skill rewrote the hypotheses register and
// the value-chain map with only their additions. A file that had content in the last commit must not shrink by
// more than half before the next one.
test('knowledge and idea files are not overwritten (no loss of more than half since the last commit)', (t) => {
  let tracked;
  try {
    tracked = execFileSync('git', ['-C', ROOT, 'ls-tree', '-r', '--name-only', 'HEAD', '--', '1-idea', '3-knowledge'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n').filter((f) => f.endsWith('.md'));
  } catch {
    t.skip('no git history yet');
    return;
  }
  const shrunk = [];
  for (const f of tracked) {
    const before = execFileSync('git', ['-C', ROOT, 'show', `HEAD:${f}`], { encoding: 'utf8', maxBuffer: 50e6 }).length;
    if (before < 2000) continue;
    const now = existsSync(join(ROOT, f)) ? read(f).length : 0;
    if (now < before / 2) shrunk.push(`${f}: ${before} → ${now} characters`);
  }
  assert.deepEqual(shrunk, [], `files that lost more than half of their content (restore with git checkout, then add instead of rewriting):\n${shrunk.join('\n')}`);
});

// No source left unused (first harness, 12 Nov. 2026: 93 sources read and never reported). Every file of 4-sources/ is
// cited (by its file name) in 3-knowledge/ or 1-idea/, or carries `knowledge: "dropped on YYYY-MM-DD: reason"`
// in its header.
test('every source feeds the knowledge, or is dropped with its reason', () => {
  const corpus = [...mdIn('3-knowledge'), ...mdIn('1-idea')].map(read).join('\n');
  const orphans = mdIn('4-sources')
    .filter((f) => !f.endsWith('README.md'))
    .filter((f) => {
      const name = f.split('/').pop().slice(0, -3);
      const header = read(f).split('\n---')[0];
      return !corpus.includes(name) && !/^knowledge:/m.test(header);
    });
  assert.deepEqual(orphans, [], `sources never reported in 3-knowledge/ or 1-idea/ nor dropped: ${orphans.join(', ')}`);
});

test('data/ and .env are ignored by Git', () => {
  const ignore = read('.gitignore');
  for (const p of ['data/', '.env']) assert.ok(ignore.split('\n').includes(p), `.gitignore must contain ${p}`);
});
