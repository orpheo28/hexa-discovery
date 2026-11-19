// Free-tier quota counter. Limits and stop ratio come from project.json `budget`
// (defaults: Exa 1000 calls, Firecrawl 1000 credits a month, stop at 80 %).
//   npm run quota                          short table (exit 1 if a quota is at the stop ratio or above)
//   node scripts/lib/quota.mjs json        the same as JSON
// Loads .env on its own if it exists, never printing a value.
//
// Two measures:
// - Exa: a local monthly counter (data/usage.json, git-ignored), kept by the PostToolUse hook
//   scripts/hooks/usage-counter.mjs. Every Exa call counts as one (prudent).
// - Firecrawl: an estimate from the same local counter (Alexandria cost announced by each response, 1 credit
//   per page read, 2 per search). If FIRECRAWL_API_KEY is set in .env, the team's real balance is read from
//   the API too, and the higher of the two measures counts. The API only measures the claude.ai connector if
//   both use the same Firecrawl team.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv, requestJson, requireEnv } from './http.mjs';
import { budget } from './project.mjs';
import { withLock } from './lock.mjs';

export { withLock };

loadDotEnv();

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');

export const FIRECRAWL_BASELINE_FILE = () => process.env.QUOTA_FIRECRAWL_BASELINE ?? join(DATA, 'quota-firecrawl.json');
export const USAGE_FILE = () => process.env.QUOTA_USAGE_FILE ?? join(DATA, 'usage.json');
export const OVER_PLAN_NOTE = 'balance above the free plan: origin to confirm';

export const usage = (name, used, limit, unit, stopAt = budget().stop_at) => ({
  tool: name, used, limit, unit,
  share: Math.round((used / limit) * 1000) / 10, stop: used / limit >= stopAt,
});

// ---------- Firecrawl: the team's real balance (only with FIRECRAWL_API_KEY) ----------

// The Firecrawl history period (calendar month) that contains `now`.
export const currentPeriodUsed = (periods = [], now = new Date()) => {
  const p = periods.find((x) => new Date(x.startDate) <= now && (!x.endDate || now < new Date(x.endDate)));
  return p ? Number(p.creditsUsed) : null;
};

// The baseline is the first balance seen in the billing period. It changes with the period.
export const nextBaseline = (credit, baseline, now = new Date()) =>
  baseline?.billingPeriodStart === credit.billingPeriodStart
    ? baseline
    : { billingPeriodStart: credit.billingPeriodStart, remainingCredits: credit.remainingCredits, observedAt: now.toISOString() };

// Pure computation. credit = /team/credit-usage response, periods = /team/credit-usage/historical.
// Normal case (balance ≤ plan): used = plan − balance. Balance above the plan: used = max(month history,
// balance drop since the baseline), counted against the free monthly credits. No measure at all: stop.
export function firecrawlUsage({ credit, periods = [], baseline = null, now = new Date(), free = budget().firecrawl_monthly }) {
  const remaining = Number(credit.remainingCredits);
  const plan = Number(credit.planCredits) || free;
  const historical = currentPeriodUsed(periods, now);
  if (remaining <= plan) {
    return { ...usage('Firecrawl', Math.max(plan - remaining, historical ?? 0), plan, 'credits'), balance: remaining };
  }
  const ref = baseline?.billingPeriodStart === credit.billingPeriodStart ? baseline : null;
  const fromBaseline = ref ? Math.max(0, Number(ref.remainingCredits) - remaining) : null;
  if (historical === null && fromBaseline === null) {
    return { tool: 'Firecrawl', balance: remaining, error: `${OVER_PLAN_NOTE}, period usage not measurable`, stop: true };
  }
  return {
    ...usage('Firecrawl', Math.max(historical ?? 0, fromBaseline ?? 0), free, 'credits'),
    balance: remaining,
    note: `${OVER_PLAN_NOTE}; usage counted against the ${free} free credits`
      + ` (month history: ${historical ?? 'unavailable'}, balance drop since ${ref ? ref.observedAt : 'no baseline'}: ${fromBaseline ?? 'unavailable'})`,
  };
}

const readJsonOrNull = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

const writeJson = (file, value) => {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n');
  renameSync(tmp, file);
};

const firecrawlBase = () => process.env.FIRECRAWL_BASE_URL ?? 'https://api.firecrawl.dev/v2';

export const firecrawlApi = async ({ baselineFile = FIRECRAWL_BASELINE_FILE(), now = new Date() } = {}) => {
  const headers = { Authorization: `Bearer ${requireEnv('FIRECRAWL_API_KEY')}` };
  const { data: credit } = await requestJson('Firecrawl', `${firecrawlBase()}/team/credit-usage`, { headers });
  // The history is a complement: if it fails, the local baseline is enough.
  const periods = await requestJson('Firecrawl', `${firecrawlBase()}/team/credit-usage/historical`, { headers })
    .then((r) => r?.periods ?? [])
    .catch(() => []);
  const baseline = readJsonOrNull(baselineFile);
  const next = nextBaseline(credit, baseline, now);
  if (next !== baseline) {
    try {
      writeJson(baselineFile, next);
    } catch (err) {
      console.error(`quota: Firecrawl baseline not saved (${err.code ?? err.name})`);
    }
  }
  return firecrawlUsage({ credit, periods, baseline: next, now });
};

// ---------- Local counter (Exa, Firecrawl calls) ----------

// Calendar month, Paris time.
export const monthKey = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit' }).format(now);

// Missing file: nothing counted. Unreadable file: error (an unknown counter is not a zero counter).
export function readUsage(file = USAGE_FILE()) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw new Error(`counter ${file} unreadable (${err.code ?? err.name})`);
  }
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('format');
    return data;
  } catch {
    throw new Error('counter data/usage.json unreadable (invalid JSON)');
  }
}

// claude.ai connectors (mcp__claude_ai_Exa__…) and servers added with `claude mcp add` (mcp__exa__…).
const SERVICES = { claude_ai_exa: 'exa', exa: 'exa', claude_ai_firecrawl: 'firecrawl', firecrawl: 'firecrawl' };
export const serviceOf = (toolName) => SERVICES[/^mcp__(.+?)__/.exec(String(toolName ?? ''))?.[1]?.toLowerCase()] ?? null;
export const shortName = (toolName) => String(toolName ?? '').replace(/^mcp__.+?__/, '');

// Alexandria calls in a Firecrawl tool input: firecrawl_scrape { alexandria } or alexandria_library_read { calls }.
export function alexandriaCalls(input = {}) {
  const raw = input.alexandria ?? input.calls;
  if (!raw) return [];
  return (Array.isArray(raw) ? raw : [raw]).filter((c) => c && typeof c === 'object');
}

const parseMaybe = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

// Costs announced by the response: the first creditsCost key found on each branch (a total above wins over the
// detail below). JSON text blocks of MCP responses are read too.
export function creditsCosts(response) {
  const node = parseMaybe(response);
  if (Array.isArray(node)) return node.flatMap((x) => creditsCosts(x?.type === 'text' ? x.text : x));
  if (!node || typeof node !== 'object') return [];
  if (typeof node.creditsCost === 'number') return [node.creditsCost];
  return Object.values(node).flatMap(creditsCosts);
}

// Paid Firecrawl tools whose cost is announced in the response (people and company data).
const PAID_DATA_TOOLS = new Set(['people_company_search', 'people_company_enrich']);

// Adds one call to the current month. Pure: returns the new state.
export function addCall(data, event, now = new Date()) {
  const service = serviceOf(event.tool_name);
  if (!service) return data;
  const month = (data[monthKey(now)] ??= {});
  const s = (month[service] ??= { calls: 0, tools: {} });
  s.calls += 1;
  const tool = shortName(event.tool_name);
  s.tools[tool] = (s.tools[tool] ?? 0) + 1;
  const calls = alexandriaCalls(event.tool_input);
  if (service === 'firecrawl' && (calls.length || PAID_DATA_TOOLS.has(tool))) {
    const costs = creditsCosts(event.tool_response);
    const total = costs.length ? costs.reduce((a, b) => a + b, 0) : null;
    s.alexandria ??= [];
    s.alexandria.push({
      date: now.toISOString(),
      tool,
      calls: calls.length ? calls.map((c) => `${c.provider ?? '?'} ${c.capability ?? '?'}`) : [tool],
      creditsCost: total,
    });
    if (total !== null) s.creditsAlexandria = (s.creditsAlexandria ?? 0) + total;
    else s.unknownCosts = (s.unknownCosts ?? 0) + 1;
  }
  return data;
}

export function recordCall(event, { file = USAGE_FILE(), now = new Date() } = {}) {
  return withLock(file, () => {
    const data = addCall(readUsage(file), event, now);
    writeJson(file, data);
    return data[monthKey(now)];
  });
}

export function exa({ file = USAGE_FILE(), now = new Date() } = {}) {
  const limit = budget().exa_monthly;
  const month = readUsage(file)[monthKey(now)] ?? {};
  return {
    ...usage('Exa', month.exa?.calls ?? 0, limit, 'calls'),
    note: `local monthly counter; limit ${limit} set in project.json (budget.exa_monthly)`,
  };
}

// Firecrawl credits estimated from the local counter: announced Alexandria and data costs, 1 credit per page
// read (scrape without Alexandria), 2 per search, 0 for discovery tools.
export function localFirecrawlCredits(month = {}) {
  const f = month.firecrawl;
  if (!f) return 0;
  const t = f.tools ?? {};
  // Entries without `tool` predate the field and came from firecrawl_scrape.
  const alexScrapes = (f.alexandria ?? []).filter((a) => (a.tool ?? 'firecrawl_scrape') === 'firecrawl_scrape').length;
  return (f.creditsAlexandria ?? 0)
    + Math.max(0, (t.firecrawl_scrape ?? 0) - alexScrapes)
    + 2 * (t.firecrawl_search ?? 0);
}

export function firecrawlLocal(month = {}) {
  return {
    ...usage('Firecrawl', localFirecrawlCredits(month), budget().firecrawl_monthly, 'credits'),
    note: 'local estimate (no FIRECRAWL_API_KEY in .env; the connector is not measured directly)',
  };
}

// The highest measure counts: the API balance (the key's team) or the local estimate.
export function withLocalFirecrawl(api, month = {}) {
  const local = localFirecrawlCredits(month);
  if (api.error || local <= api.used) return api;
  return {
    ...usage('Firecrawl', local, api.limit, api.unit),
    balance: api.balance,
    note: `local estimate (${local} credits) above the API (${api.used}): the connector may spend on another team`,
  };
}

export async function firecrawl({ file = USAGE_FILE(), now = new Date() } = {}) {
  const month = readUsage(file)[monthKey(now)] ?? {};
  if (!process.env.FIRECRAWL_API_KEY) return firecrawlLocal(month);
  return withLocalFirecrawl(await firecrawlApi({ now }), month);
}

// An impossible measure is reported and stops too: an unknown quota is not a free quota.
export async function status({ file = USAGE_FILE(), now = new Date() } = {}) {
  const measures = [['Firecrawl', () => firecrawl({ file, now })], ['Exa', () => exa({ file, now })]];
  return Promise.all(measures.map(async ([name, m]) => {
    try {
      return await m();
    } catch (err) {
      return { tool: name, error: err.message, stop: true };
    }
  }));
}

const n = (x) => new Intl.NumberFormat('en-US').format(x);

export function table(results, month = {}, key = monthKey()) {
  const stopAt = budget().stop_at;
  const rows = results.map((q) => [
    q.tool,
    q.error ? 'unreadable' : `${n(q.used)} / ${n(q.limit)} ${q.unit}`,
    q.error ? '' : `${q.share} %`,
    q.stop ? 'STOP' : 'OK',
  ]);
  const head = ['Tool', 'Used this month', 'Share', 'State'];
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (r) => r.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
  const out = [`Free quotas (${key}), stop at ${Math.round(stopAt * 100)} %`, '', line(head), ...rows.map(line), ''];
  for (const q of results) {
    if (q.error) out.push(`- ${q.tool}: ${q.error}.`);
    if (q.balance !== undefined && !q.error) out.push(`- ${q.tool}: team balance ${n(q.balance)} credits.`);
    if (q.note) out.push(`- ${q.tool}: ${q.note}.`);
  }
  const f = month.firecrawl;
  if (f) {
    const alex = f.alexandria?.length ?? 0;
    out.push(`- Firecrawl (local counter): ${f.calls} calls this month, ${alex} of them paid data (Alexandria)`
      + (alex ? ` (${n(f.creditsAlexandria ?? 0)} credits announced${f.unknownCosts ? `, ${f.unknownCosts} without a reported cost` : ''})` : '')
      + '.');
  }
  const stop = results.filter((q) => q.stop).map((q) => q.tool);
  out.push('', stop.length
    ? `STOP: ${stop.join(', ')}. Do not use this tool again this month without the owner's agreement.`
    : `Everything is under ${Math.round(stopAt * 100)} %.`);
  return out.join('\n');
}

const isMain = process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url;
if (isMain) {
  const [cmd = 'status'] = process.argv.slice(2);
  if (!['status', 'json'].includes(cmd)) {
    console.error('Commands: status, json');
    process.exit(2);
  }
  const results = await status();
  let month = {};
  try {
    month = readUsage()[monthKey()] ?? {};
  } catch {}
  console.log(cmd === 'json' ? JSON.stringify({ quotas: results, counter: month }, null, 2) : table(results, month));
  process.exit(results.some((q) => q.stop) ? 1 : 0);
}
