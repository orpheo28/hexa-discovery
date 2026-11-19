#!/usr/bin/env node
// Usage counter, PostToolUse on Exa and Firecrawl tools.
// Adds the call to the current month in data/usage.json (git-ignored): one per call, per tool, and for paid
// Firecrawl data the provider, the capability and the announced cost (creditsCost). See scripts/lib/quota.mjs.
// Never blocks the call (it already happened). On failure, exit 2: the message goes back to Claude, which tells
// the user, because an uncounted call skews the budget guard.

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', async () => {
  try {
    const event = JSON.parse(raw);
    const { recordCall } = await import('../lib/quota.mjs');
    recordCall(event);
    process.exit(0);
  } catch (err) {
    console.error(`Usage counter not updated (${err.message}). Tell the user: this call is not counted in data/usage.json.`);
    process.exit(2);
  }
});
