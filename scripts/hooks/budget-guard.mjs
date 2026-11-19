#!/usr/bin/env node
// Budget guard. PreToolUse on Exa and Firecrawl tools (claude.ai connectors or `claude mcp add` servers).
// - Exa: local monthly counter (data/usage.json, kept by scripts/hooks/usage-counter.mjs).
// - Firecrawl paid data (Alexandria through firecrawl_scrape or alexandria_library_read, people_company_*):
//   Firecrawl quota (local estimate, plus the API balance when FIRECRAWL_API_KEY is set).
// - Firecrawl page reads, searches and catalogue discovery: nothing to decide, the call is counted afterwards.
// Decisions:
// - under the stop ratio (project.json budget.stop_at, default 80 %): exit 0 with no decision;
// - at the stop ratio or above, or unreadable quota: refusal, exit 2, message on stderr;
// - Alexandria people/match or people/info (30 credits), people_company_enrich with contact fields, and
//   firecrawl_agent (billable job): the user is asked to confirm ("ask").

const EXPENSIVE = new Set(['people/match', 'people/info']);

const deny = (what, reason) => {
  console.error(`${what} refused: ${reason}. Budget rule: stop at the free-tier limit (npm run quota). Ask the owner before going further.`);
  process.exit(2);
};

const ask = (reason) => {
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: reason } }));
  process.exit(0);
};

const describe = (calls) => calls.map((c) => `${c.provider ?? '?'} ${c.capability ?? '?'}`).join(', ');
const pct = (q) => `${q.share} %`;

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', async () => {
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    deny('Call', 'unreadable call');
  }
  let quota;
  try {
    quota = await import('../lib/quota.mjs');
  } catch (err) {
    deny('Call', `quota counter unreadable (${err.message})`);
  }
  const service = quota.serviceOf(event.tool_name);
  const tool = quota.shortName(event.tool_name);
  const input = event.tool_input ?? {};

  if (service === 'exa') {
    let q;
    try {
      q = quota.exa();
    } catch (err) {
      deny('Exa call', err.message);
    }
    if (q.stop) deny('Exa call', `${q.used} calls out of ${q.limit} this month (${pct(q)})`);
    process.exit(0);
  }
  if (service !== 'firecrawl') process.exit(0);

  const calls = quota.alexandriaCalls(input);
  const paid = calls.length > 0 || ['people_company_search', 'people_company_enrich', 'firecrawl_agent'].includes(tool);
  if (!paid) process.exit(0);

  let q;
  try {
    q = await quota.firecrawl();
  } catch (err) {
    deny('Paid Firecrawl call', `Firecrawl quota unreadable (${err.message})`);
  }
  if (q.error) deny('Paid Firecrawl call', `Firecrawl quota unreadable (${q.error})`);
  if (q.stop) deny('Paid Firecrawl call', `Firecrawl quota at ${pct(q)} (${q.used} of ${q.limit} credits)`);
  const state = `Firecrawl quota: ${q.used} of ${q.limit} credits (${pct(q)}).`;

  const expensive = calls.filter((c) => EXPENSIVE.has(c.capability));
  if (expensive.length) ask(`Expensive Alexandria call (${describe(expensive)}, 30 credits per person). Never without the owner's agreement. ${state}`);
  if (tool === 'people_company_enrich' && input.contact_fields) ask(`Paid contact details (people_company_enrich with contact_fields). Only for people the owner will really contact. ${state}`);
  if (tool === 'firecrawl_agent') ask(`firecrawl_agent starts a billable research job (up to maxCredits). ${state}`);
  process.exit(0);
});
