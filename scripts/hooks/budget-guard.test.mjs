// Budget guard and usage counter tests, against a fake local Firecrawl and a temporary counter.
// Run: node --test scripts/hooks/budget-guard.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { monthKey } from '../lib/quota.mjs';

const GUARD = new URL('./budget-guard.mjs', import.meta.url).pathname;
const COUNTER = new URL('./usage-counter.mjs', import.meta.url).pathname;
const PROJECT = join(mkdtempSync(join(tmpdir(), 'bg-project-')), 'absent.json');
let remaining = 500;
let down = false;
let server;
let base;

before(async () => {
  server = createServer((req, res) => {
    if (down) {
      res.writeHead(500);
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (req.url === '/fc/team/credit-usage') {
      return res.end(JSON.stringify({ data: { remainingCredits: remaining, planCredits: 1000, billingPeriodStart: '2026-10-14T00:00:00Z' } }));
    }
    res.end(JSON.stringify({ periods: [] }));
  });
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}/fc`;
});
after(() => server.close());

const tmpUsage = (content) => {
  const file = join(mkdtempSync(join(tmpdir(), 'usage-')), 'usage.json');
  if (content !== undefined) writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
  return file;
};

const run = (script, event, usageFile = tmpUsage(), { apiKey = true } = {}) => new Promise((resolve) => {
  const env = {
    ...process.env, FIRECRAWL_BASE_URL: base, PROJECT_FILE: PROJECT,
    QUOTA_FIRECRAWL_BASELINE: join(mkdtempSync(join(tmpdir(), 'bg-')), 'q.json'),
    QUOTA_USAGE_FILE: usageFile,
  };
  if (apiKey) env.FIRECRAWL_API_KEY = 'test-key';
  else delete env.FIRECRAWL_API_KEY;
  const child = spawn('node', [script], { env });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (c) => (stdout += c));
  child.stderr.on('data', (c) => (stderr += c));
  child.on('exit', (status) => resolve({ status, stdout, stderr }));
  child.stdin.end(typeof event === 'string' ? event : JSON.stringify(event));
});

const FC = 'mcp__claude_ai_Firecrawl__firecrawl_scrape';
const EXA = 'mcp__claude_ai_Exa__web_search_exa';
const pre = (tool_name, tool_input, file, opts) => run(GUARD, { hook_event_name: 'PreToolUse', tool_name, tool_input }, file, opts);
const HUNTER = { alexandria: { provider: 'hunter', capability: 'people/email-find', options: {} } };
const exaCount = (n) => ({ [monthKey()]: { exa: { calls: n, tools: { web_search_exa: n } } } });

test('Firecrawl: a page read passes with no decision, even with the API down', async () => {
  down = true;
  const r = await pre(FC, { url: 'https://example.com' });
  down = false;
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('Alexandria under 80 %: passes with no decision', async () => {
  remaining = 500;
  const r = await pre(FC, HUNTER);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('Alexandria without an API key: the local estimate decides', async () => {
  down = true;
  const r = await pre(FC, HUNTER, tmpUsage(), { apiKey: false });
  down = false;
  assert.equal(r.status, 0);
  const full = { [monthKey()]: { firecrawl: { calls: 1, tools: { firecrawl_scrape: 1 }, alexandria: [{ tool: 'firecrawl_scrape' }], creditsAlexandria: 800 } } };
  const r2 = await pre('mcp__claude_ai_Firecrawl__alexandria_library_read', { calls: [HUNTER.alexandria] }, tmpUsage(full), { apiKey: false });
  assert.equal(r2.status, 2);
  assert.match(r2.stderr, /Paid Firecrawl call refused: Firecrawl quota at 80 %/);
});

test('Alexandria people/match or people/info: confirmation asked', async () => {
  remaining = 500;
  for (const capability of ['people/match', 'people/info']) {
    const r = await pre(FC, { alexandria: [HUNTER.alexandria, { provider: 'apollo', capability, options: {} }] });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout).hookSpecificOutput;
    assert.equal(out.permissionDecision, 'ask');
    assert.match(out.permissionDecisionReason, new RegExp(`apollo ${capability}`));
    assert.doesNotMatch(out.permissionDecisionReason, /hunter/);
  }
});

test('paid contact details and firecrawl_agent: confirmation asked', async () => {
  remaining = 500;
  const r = await pre('mcp__claude_ai_Firecrawl__people_company_enrich', { people: [{}], contact_fields: ['email'] });
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'ask');
  const r2 = await pre('mcp__claude_ai_Firecrawl__firecrawl_agent', { prompt: 'x' });
  assert.equal(JSON.parse(r2.stdout).hookSpecificOutput.permissionDecision, 'ask');
  const r3 = await pre('mcp__claude_ai_Firecrawl__people_company_search', { query: 'x' });
  assert.equal(r3.status, 0);
  assert.equal(r3.stdout, '');
});

test('Alexandria at 80 %: refused, even for people/match', async () => {
  remaining = 200;
  for (const capability of ['people/email-find', 'people/match']) {
    const r = await pre(FC, { alexandria: { provider: 'hunter', capability } });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Paid Firecrawl call refused: Firecrawl quota at 80 %/);
  }
  remaining = 500;
});

test('Alexandria, unreadable Firecrawl quota: refused', async () => {
  down = true;
  const r = await pre(FC, HUNTER);
  down = false;
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Firecrawl quota unreadable/);
});

test('Exa under 80 %: passes with no decision, even without a counter', async () => {
  assert.equal((await pre(EXA, { query: 'x' })).status, 0);
  const r = await pre(EXA, { query: 'x' }, tmpUsage(exaCount(799)));
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('Exa at 80 %: refused (also for servers added with claude mcp add)', async () => {
  const r = await pre('mcp__claude_ai_Exa__web_fetch_exa', { urls: [] }, tmpUsage(exaCount(800)));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Exa call refused: 800 calls out of 1000/);
  assert.equal((await pre('mcp__exa__web_search_exa', { query: 'x' }, tmpUsage(exaCount(800)))).status, 2);
});

test('Exa, unreadable counter: refused', async () => {
  const r = await pre(EXA, { query: 'x' }, tmpUsage('{not json'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Exa call refused: counter data\/usage.json unreadable/);
});

test('unreadable call: refused', async () => {
  const r = await run(GUARD, 'not json');
  assert.equal(r.status, 2);
});

test('the counter adds every Exa and Firecrawl call to the month, with the Alexandria cost', async () => {
  const file = tmpUsage();
  const post = (tool_name, tool_input, tool_response) =>
    run(COUNTER, { hook_event_name: 'PostToolUse', tool_name, tool_input, tool_response }, file);
  assert.equal((await post(EXA, { query: 'a' }, [{ type: 'text', text: '{}' }])).status, 0);
  assert.equal((await post(EXA, { query: 'b' }, [])).status, 0);
  assert.equal((await post(FC, { url: 'https://example.com' }, [])).status, 0);
  const response = [{ type: 'text', text: JSON.stringify({ data: { alexandria: [{ creditsCost: 10 }, { creditsCost: 0 }] } }) }];
  assert.equal((await post(FC, { alexandria: [HUNTER.alexandria, { provider: 'apollo', capability: 'people/search' }] }, response)).status, 0);
  assert.equal((await post(FC, HUNTER, [{ type: 'text', text: 'no cost' }])).status, 0);
  const month = JSON.parse(readFileSync(file, 'utf8'))[monthKey()];
  assert.equal(month.exa.calls, 2);
  assert.equal(month.firecrawl.calls, 3);
  assert.equal(month.firecrawl.tools.firecrawl_scrape, 3);
  assert.equal(month.firecrawl.alexandria.length, 2);
  assert.deepEqual(month.firecrawl.alexandria[0].calls, ['hunter people/email-find', 'apollo people/search']);
  assert.equal(month.firecrawl.alexandria[0].creditsCost, 10);
  assert.equal(month.firecrawl.alexandria[1].creditsCost, null);
  assert.equal(month.firecrawl.creditsAlexandria, 10);
  assert.equal(month.firecrawl.unknownCosts, 1);
});

test('the counter reports a failure to Claude without blocking', async () => {
  const r = await run(COUNTER, { hook_event_name: 'PostToolUse', tool_name: EXA, tool_input: {} }, tmpUsage('[broken'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Usage counter not updated/);
});
