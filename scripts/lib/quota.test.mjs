// Quota counter tests, no external call. Run: node --test scripts/lib/quota.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TMP = mkdtempSync(join(tmpdir(), 'quota-'));
process.env.PROJECT_FILE = join(TMP, 'absent-project.json'); // defaults: 1000 / 1000 / 0.8
delete process.env.FIRECRAWL_API_KEY;

const { loadDotEnv } = await import('./http.mjs');
const { budget } = await import('./project.mjs');
const {
  addCall, alexandriaCalls, creditsCosts, currentPeriodUsed, exa, firecrawl, firecrawlApi, firecrawlUsage, localFirecrawlCredits,
  monthKey, nextBaseline, OVER_PLAN_NOTE, readUsage, serviceOf, table, usage, withLocalFirecrawl,
} = await import('./quota.mjs');

const NOW = new Date('2026-11-06T12:00:00Z');
const PERIOD = '2026-10-14T14:22:40.925Z';
const credit = (remainingCredits, planCredits = 1000) => ({ remainingCredits, planCredits, billingPeriodStart: PERIOD });
const periods = (novUsed) => [
  { startDate: '2026-10-01T00:00:00.000Z', endDate: '2026-11-01T00:00:00.000Z', creditsUsed: 276 },
  { startDate: '2026-11-01T00:00:00.000Z', endDate: null, creditsUsed: novUsed },
];

test('budget: defaults, and project.json values when valid', () => {
  assert.deepEqual(budget({}), { exa_monthly: 1000, firecrawl_monthly: 1000, stop_at: 0.8 });
  assert.deepEqual(budget({ budget: { exa_monthly: 500, stop_at: 0.9 } }), { exa_monthly: 500, firecrawl_monthly: 1000, stop_at: 0.9 });
  assert.equal(budget({ budget: { exa_monthly: 'x' } }).exa_monthly, 1000);
});

test('the counter stops at the stop ratio, not before', () => {
  assert.equal(usage('x', 799, 1000, 'credits').stop, false);
  assert.equal(usage('x', 800, 1000, 'credits').stop, true);
  assert.equal(usage('x', 850, 1000, 'credits', 0.9).stop, false);
});

test('normal case: used = plan − balance, stop at 80 %', () => {
  assert.equal(firecrawlUsage({ credit: credit(201), now: NOW }).stop, false);
  const r = firecrawlUsage({ credit: credit(200), now: NOW });
  assert.equal(r.used, 800);
  assert.equal(r.stop, true);
  assert.equal(r.balance, 200);
});

test('balance above the plan: never a negative usage, the balance is returned and flagged', () => {
  const r = firecrawlUsage({ credit: credit(30274), periods: periods(0), now: NOW });
  assert.equal(r.used, 0);
  assert.equal(r.limit, 1000);
  assert.equal(r.balance, 30274);
  assert.equal(r.stop, false);
  assert.match(r.note, new RegExp(OVER_PLAN_NOTE));
});

test('balance above the plan: stop at 800 credits used since the baseline', () => {
  const baseline = { billingPeriodStart: PERIOD, remainingCredits: 30274, observedAt: '2026-11-06T10:00:00Z' };
  assert.equal(firecrawlUsage({ credit: credit(29475), periods: periods(0), baseline, now: NOW }).stop, false);
  const r = firecrawlUsage({ credit: credit(29474), periods: periods(0), baseline, now: NOW });
  assert.equal(r.used, 800);
  assert.equal(r.stop, true);
});

test('balance above the plan: the month history counts when the baseline underestimates', () => {
  const baseline = { billingPeriodStart: PERIOD, remainingCredits: 30274, observedAt: '2026-11-06T10:00:00Z' };
  const r = firecrawlUsage({ credit: credit(30264), periods: periods(850), baseline, now: NOW });
  assert.equal(r.used, 850);
  assert.equal(r.stop, true);
});

test('balance above the plan with no measure: stop and explicit error', () => {
  const r = firecrawlUsage({ credit: credit(30274), periods: [], baseline: null, now: NOW });
  assert.equal(r.stop, true);
  assert.match(r.error, /origin to confirm/);
});

test('a baseline from another period is ignored and replaced', () => {
  const old = { billingPeriodStart: '2026-09-14T00:00:00Z', remainingCredits: 99999, observedAt: 'x' };
  assert.equal(firecrawlUsage({ credit: credit(30000), periods: [], baseline: old, now: NOW }).stop, true);
  const next = nextBaseline(credit(30000), old, NOW);
  assert.deepEqual(next, { billingPeriodStart: PERIOD, remainingCredits: 30000, observedAt: NOW.toISOString() });
  assert.equal(nextBaseline(credit(29000), next, NOW), next);
});

test('the current history period is the one containing the date', () => {
  assert.equal(currentPeriodUsed(periods(12), NOW), 12);
  assert.equal(currentPeriodUsed(periods(12), new Date('2026-10-15T00:00:00Z')), 276);
  assert.equal(currentPeriodUsed([], NOW), null);
});

test('loadDotEnv loads a file without overwriting an existing variable, and nothing under node --test by default', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'env-')), '.env');
  writeFileSync(file, 'QUOTA_TEST_NEW=new\nQUOTA_TEST_KEEP=file\n');
  process.env.QUOTA_TEST_KEEP = 'environment';
  assert.equal(loadDotEnv(file), false);
  assert.equal(process.env.QUOTA_TEST_NEW, undefined);
  assert.equal(loadDotEnv(file, { underTest: false }), true);
  assert.equal(process.env.QUOTA_TEST_NEW, 'new');
  assert.equal(process.env.QUOTA_TEST_KEEP, 'environment');
  assert.equal(loadDotEnv(join(file, 'absent'), { underTest: false }), false);
});

let server;
let remaining = 30274;
before(async () => {
  server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (req.url === '/fc/team/credit-usage') return res.end(JSON.stringify({ success: true, data: credit(remaining) }));
    if (req.url === '/fc/team/credit-usage/historical') return res.end(JSON.stringify({ success: true, periods: periods(0) }));
    res.end('{}');
  });
  await new Promise((r) => server.listen(0, r));
  process.env.FIRECRAWL_BASE_URL = `http://127.0.0.1:${server.address().port}/fc`;
});
after(() => server.close());

test('without FIRECRAWL_API_KEY, Firecrawl is the local estimate', async () => {
  delete process.env.FIRECRAWL_API_KEY;
  const file = join(mkdtempSync(join(tmpdir(), 'usage-')), 'usage.json');
  writeFileSync(file, JSON.stringify({ [monthKey(NOW)]: { firecrawl: { calls: 3, tools: { firecrawl_scrape: 2, firecrawl_search: 1 } } } }));
  const r = await firecrawl({ file, now: NOW });
  assert.equal(r.used, 4);
  assert.match(r.note, /local estimate/);
});

test('firecrawlApi() sets the baseline on first pass, then measures the balance drop', async () => {
  process.env.FIRECRAWL_API_KEY = 'test-key';
  const file = join(mkdtempSync(join(tmpdir(), 'quota-')), 'data', 'quota-firecrawl.json');
  remaining = 30274;
  assert.equal((await firecrawlApi({ baselineFile: file, now: NOW })).used, 0);
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).remainingCredits, 30274);
  remaining = 30000;
  const r = await firecrawlApi({ baselineFile: file, now: NOW });
  assert.equal(r.used, 274);
  assert.equal(r.balance, 30000);
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).remainingCredits, 30274);
  delete process.env.FIRECRAWL_API_KEY;
});

test('the counter month is the Paris month', () => {
  assert.equal(monthKey(new Date('2026-11-30T22:30:00Z')), '2026-11');
  assert.equal(monthKey(new Date('2026-11-30T23:30:00Z')), '2026-12');
});

test('Exa and Firecrawl are counted, through claude.ai connectors or added servers', () => {
  assert.equal(serviceOf('mcp__claude_ai_Exa__web_search_exa'), 'exa');
  assert.equal(serviceOf('mcp__exa__web_search_exa'), 'exa');
  assert.equal(serviceOf('mcp__claude_ai_Firecrawl__firecrawl_search'), 'firecrawl');
  assert.equal(serviceOf('mcp__firecrawl__firecrawl_scrape'), 'firecrawl');
  assert.equal(serviceOf('mcp__claude_ai_Notion__notion-fetch'), null);
  assert.deepEqual(addCall({}, { tool_name: 'mcp__claude_ai_Notion__notion-fetch' }, NOW), {});
});

test('Alexandria calls are read from firecrawl_scrape and alexandria_library_read', () => {
  assert.equal(alexandriaCalls({ alexandria: { provider: 'hunter' } }).length, 1);
  assert.equal(alexandriaCalls({ calls: [{ provider: 'apollo' }, { provider: 'hunter' }] }).length, 2);
  assert.deepEqual(alexandriaCalls({ url: 'x' }), []);
});

test('Alexandria cost: a total wins over the detail, JSON text blocks are read', () => {
  assert.deepEqual(creditsCosts([{ type: 'text', text: '{"creditsCost":30,"data":[{"creditsCost":10}]}' }]), [30]);
  assert.deepEqual(creditsCosts({ data: { alexandria: [{ creditsCost: 10 }, { error: 'x' }, { creditsCost: 0 }] } }), [10, 0]);
  assert.deepEqual(creditsCosts([{ type: 'text', text: 'not json' }]), []);
});

test('Exa counter: missing = 0, unreadable = error, stop at 80 % of the limit', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'usage-')), 'usage.json');
  assert.deepEqual(readUsage(file), {});
  assert.equal(exa({ file, now: NOW }).used, 0);
  writeFileSync(file, '{broken');
  assert.throws(() => exa({ file, now: NOW }), /unreadable/);
  writeFileSync(file, JSON.stringify({ [monthKey(NOW)]: { exa: { calls: 800, tools: {} } } }));
  assert.equal(exa({ file, now: NOW }).stop, true);
  assert.equal(exa({ file, now: new Date('2026-12-02T12:00:00Z') }).used, 0);
});

test('the table says STOP and flags an unreadable measure', () => {
  const out = table([
    { ...usage('Firecrawl', 120, 1000, 'credits'), balance: 880 },
    { tool: 'Exa', error: 'counter data/usage.json unreadable (invalid JSON)', stop: true },
  ], { firecrawl: { calls: 4, alexandria: [{}], creditsAlexandria: 10 } }, '2026-11');
  assert.match(out, /Firecrawl\s+120 \/ 1,000 credits\s+12 %\s+OK/);
  assert.match(out, /Exa\s+unreadable\s+STOP/);
  assert.match(out, /4 calls this month, 1 of them paid data \(Alexandria\) \(10 credits announced\)/);
  assert.match(out, /STOP: Exa/);
});

test('Firecrawl local estimate: announced costs, scrapes without Alexandria, searches at 2', () => {
  const month = {
    firecrawl: {
      calls: 5,
      tools: { firecrawl_scrape: 3, firecrawl_search: 1, alexandria_library_read: 1 },
      alexandria: [{ tool: 'firecrawl_scrape' }, { tool: 'alexandria_library_read' }],
      creditsAlexandria: 40,
    },
  };
  assert.equal(localFirecrawlCredits(month), 40 + 2 + 2);
  const api = { ...usage('Firecrawl', 0, 1000, 'credits'), balance: 30274 };
  const out = withLocalFirecrawl(api, month);
  assert.equal(out.used, 44);
  assert.equal(out.balance, 30274);
  assert.match(out.note, /local estimate/);
  assert.equal(withLocalFirecrawl({ ...usage('Firecrawl', 100, 1000, 'credits') }, month).used, 100);
  assert.equal(localFirecrawlCredits({}), 0);
});
