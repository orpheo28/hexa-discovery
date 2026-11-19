import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brief, deadlines, lastReview, paris, section } from './session-start.mjs';

const STATUS = `# Where the ExampleX discovery stands (review of 2026-11-16)

## Done
- x

## To do (Jane)
- [ ] Call 3 target users
- [ ] Ask for the project option

## Deadlines
- 2026-11-28: Pilot decision

## Next step
Prepare the call with a construction dispute board.
`;

const PROJECT = {
  project: 'ExampleX', owner: 'Jane Doe', language: 'fr',
  sprint: { start: '2026-11-02', draft_proposal: '2026-11-13', go_no_go: '2026-12-02' },
  targets: { calls: 40, a_players: 8, calls_per_week: 10 },
  notion: { workspace_page: 'abc' },
};

test('Paris date, ISO week and Monday', () => {
  const t = paris(new Date('2026-11-19T10:00:00Z'));
  assert.equal(t.weekday, 'Thursday');
  assert.equal(t.ymd, '2026-11-19');
  assert.equal(t.mondayYmd, '2026-11-16');
  assert.equal(t.week, 47);
  assert.equal(paris(new Date('2027-01-01T10:00:00Z')).week, 53);
  assert.equal(paris(new Date('2026-01-01T10:00:00Z')).week, 1);
  assert.equal(paris(new Date('2026-11-29T23:30:00Z')).ymd, '2026-11-30'); // Paris is already Monday
});

test('reads the last review date from the STATUS.md title', () => {
  assert.deepEqual(lastReview(STATUS), new Date(Date.UTC(2026, 10, 16)));
  assert.equal(lastReview('# Status without review'), null);
});

test('extracts a STATUS.md section by its title prefix', () => {
  assert.equal(section(STATUS, 'To do'), '- [ ] Call 3 target users\n- [ ] Ask for the project option');
  assert.equal(section(STATUS, 'Missing'), '');
});

test('deadlines come from project.json and STATUS.md, sorted', () => {
  assert.deepEqual(deadlines(PROJECT, STATUS).map((d) => d.label), ['Draft proposal', 'Pilot decision', 'IDEA Framework (go / no-go)']);
  assert.deepEqual(deadlines({}, ''), []);
});

test('the brief gives project, quotas, review, to-do, deadlines and the instruction', () => {
  const usage = { '2026-11': { exa: { calls: 120 }, firecrawl: { calls: 2, tools: { firecrawl_scrape: 2 } } } };
  const out = brief({ status: STATUS, usage, project: PROJECT, now: new Date('2026-11-19T09:00:00+01:00') });
  assert.match(out, /Thursday 2026-11-19 \(Paris\), week W47, Monday 2026-11-16/);
  assert.match(out, /Project: ExampleX · owner: Jane Doe/);
  assert.match(out, /Exa 120\/1000 calls \(12 %\)/);
  assert.match(out, /Firecrawl ~2\/1000/);
  assert.match(out, /Last review: 3 days ago\./);
  assert.doesNotMatch(out, /REVIEW DUE/);
  assert.match(out, /Call 3 target users/);
  assert.match(out, /construction dispute board/);
  assert.match(out, /Draft proposal OVERDUE by 6 days; Pilot decision in 9 days; IDEA Framework \(go \/ no-go\) in 13 days/);
  assert.match(out, /"My day"/);
});

test('review due after 7 days, and offered on Friday when not done this week', () => {
  const late = brief({ status: STATUS, project: PROJECT, now: new Date('2026-11-23T09:00:00+01:00') });
  assert.match(late, /7 days ago\. REVIEW DUE/);
  const friday = brief({ status: STATUS, project: PROJECT, now: new Date('2026-11-27T09:00:00+01:00') });
  assert.match(friday, /Friday: this week's review is not done yet/);
  const doneFriday = brief({ status: STATUS.replace('2026-11-16', '2026-11-27'), project: PROJECT, now: new Date('2026-11-27T18:00:00+01:00') });
  assert.doesNotMatch(doneFriday, /not done yet/);
});

test('without project.json, the brief asks for setup first', () => {
  const out = brief({ status: '', project: {}, now: new Date('2026-11-19T09:00:00+01:00') });
  assert.match(out, /NOT SET UP/);
  assert.match(out, /Last review: unknown/);
});

test('the hook never fails and prints to stdout', () => {
  const r = spawnSync('node', [new URL('./session-start.mjs', import.meta.url).pathname], {
    encoding: 'utf8',
    env: { ...process.env, PROJECT_FILE: join(mkdtempSync(join(tmpdir(), 'ss-')), 'absent.json'), QUOTA_USAGE_FILE: '/nowhere/usage.json' },
  });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Session starting point/);
});
