#!/usr/bin/env node
// Adds Notion ids (or URLs) to rules/notion-allowlist.json, so the Notion guard lets the harness update them.
// Use it for rows of OUR project created by hand, right after a query filtered on Project = ours.
//   node scripts/notion-allow.mjs <id-or-url> [...]           adds to "pages"
//   node scripts/notion-allow.mjs --root <id-or-url>          adds to "root" (the workspace page, done by setup)
import { addToAllowlist, idsIn } from './hooks/notion-guard.mjs';

const args = process.argv.slice(2);
const section = args[0] === '--root' ? 'root' : 'pages';
const ids = idsIn(args.filter((a) => a !== '--root'));
if (!ids.length) {
  console.error('Usage: node scripts/notion-allow.mjs [--root] <notion id or URL> [...]');
  process.exit(1);
}
const added = addToAllowlist(section, ids);
console.log(`${added.length} id(s) added to "${section}", ${ids.length - added.length} already there.`);
