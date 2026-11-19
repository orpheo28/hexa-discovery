#!/usr/bin/env node
// Notion guard (Claude Code hook; other clients rely on the rules in rules/rules.md).
// PreToolUse (matcher mcp__(claude_ai_Notion|notion)__.*): a known read tool passes. Every other tool, including
// Notion tools that appear later, is checked:
//   1. no deletion, anywhere;
//   2. no schema, view, move or duplicate operation touching the shared Discovery tracking databases or WTF Projects
//      (the WTF Discovery Board reads them by exact names: the schema belongs to its owner);
//   3. a row created in a shared database carries Project = project.json `project`;
//   4. an update never sets Project to another project;
//   5. any other write targets an id of rules/notion-allowlist.json (root, databases, data_sources, pages), or the
//      workspace pages named in project.json; the project page in WTF Projects is allowed only as the parent of a
//      new page (setup creates the workspace page there).
// Exit 2 = refusal, the message on stderr goes back to Claude. When in doubt, refuse.
// PostToolUse (create-pages, create-database): adds the created ids to the allowlist, under a lock, through a
// temporary file and a rename.
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readProject } from '../lib/project.mjs';
import { withLock } from '../lib/lock.mjs';

export const allowlistFile = () => process.env.NOTION_ALLOWLIST ?? join(ROOT, 'rules', 'notion-allowlist.json');

export const norm = (id) => String(id).replace(/-/g, '').toLowerCase();
const ID = /[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}|[0-9a-f]{32}/gi;
export const idsIn = (value) => (JSON.stringify(value ?? '').match(ID) ?? []).map(norm);

// Discovery tracking: Contacts, Hypotheses, Weekly reviews, Idea log, Problems (data sources, then databases),
// the Discovery tracking page itself, and WTF Projects.
export const SHARED_DATA_SOURCES = new Set([
  '41c1cc0b-d5bc-8103-b9c8-000b5b4b9cf7',
  '41c1cc0b-d5bc-8177-9885-000bd739f62f',
  '41c1cc0b-d5bc-8111-94de-000bc640c9f9',
  '41d1cc0b-d5bc-81bd-a473-000be4e0640c',
  '41d1cc0b-d5bc-8168-a436-000b72b432f5',
].map(norm));
export const SHARED_DATABASES = new Set([
  '41c1cc0bd5bc8169aa01d9aa1805a4e7',
  '41c1cc0bd5bc81adba75db841f75c641',
  '41c1cc0bd5bc81b3b1aff9c853fd7880',
  '41d1cc0bd5bc81c98906c3af4eed6779',
  '41d1cc0bd5bc814481e5f67c7b806310',
].map(norm));
export const SHARED = new Set([
  ...SHARED_DATA_SOURCES,
  ...SHARED_DATABASES,
  '41c1cc0bd5bc810f818feb1c9eabc5f0', // Discovery tracking page
  '2b61cc0bd5bc80d69000d0e9662e5a30', // WTF Projects database
  '2b61cc0bd5bc80c0aaeb000bcf5306df', // WTF Projects data source
].map(norm));

const TARGET_KEYS = ['page_id', 'database_id', 'data_source_id', 'parent', 'new_parent', 'page_or_database_ids'];
const SCHEMA_TOOLS = /^notion-(update-data-source|create-database|create-view|update-view|move-pages|duplicate-page)$/;

// Read-only Notion tools, name without the mcp__…__ prefix. Anything not listed here is treated as a write.
const READ_TOOL = new RegExp(
  '^notion-(search|fetch|connector-search|memory-search|view-version|read-session-event|wait-session'
    + '|search-[a-z-]+|query-[a-z-]+|get-[a-z-]+|list-[a-z-]+|download-[a-z-]+|calendar-list-[a-z-]+)$',
);
const shortName = (tool) => String(tool ?? '').replace(/^mcp__.+?__/, '');

export function loadAllowed(file = allowlistFile(), project = readProject()) {
  const list = JSON.parse(readFileSync(file, 'utf8'));
  const ids = [...(list.root ?? []), ...(list.databases ?? []), ...(list.data_sources ?? []), ...(list.pages ?? [])];
  const notion = project.notion ?? {};
  ids.push(...idsIn(notion.workspace_page ?? ''), ...idsIn(Object.values(notion.pages ?? {})));
  return new Set(ids.map(norm));
}

// A target that is not an id (draft, memory, teamspace, workspace) stays a target to refuse.
function targetsOf(input) {
  const targets = [];
  const unknown = [];
  for (const key of TARGET_KEYS) {
    const value = input[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && !idsIn(value).length) unknown.push(`${key}=${value}`);
    if (typeof value === 'object' && !Array.isArray(value)) {
      if (value.teamspace_id || value.type === 'workspace') unknown.push(`${key}=outside the workspace page`);
      for (const k of ['page_id', 'database_id', 'data_source_id']) if (value[k]) targets.push(...idsIn(value[k]));
      continue;
    }
    targets.push(...idsIn(Array.isArray(value) ? value.join(' ') : value));
  }
  return { targets, unknown };
}

const projectOf = (properties) => {
  const v = properties?.Project;
  if (v && typeof v === 'object') return v.name ?? v.select?.name ?? null;
  return v ?? null;
};

// Select values of the shared databases, cached by setup in project.json `notion.options`
// ({ "<data source id>": { "Stage": ["Target", …], … } }). Notion silently creates a new option when a write uses an
// unknown value, which would change the shared schema: refuse it. With `ds`, check that data source's options; without
// (an update, whose database is unknown), check against the union of every cached data source for that property name.
export function unknownOption(properties, project = {}, ds = null) {
  if (!properties || typeof properties !== 'object') return null;
  const cache = project.notion?.options ?? {};
  const byDs = Object.fromEntries(Object.entries(cache).map(([k, v]) => [norm(k.replace(/^collection:\/\//, '')), v]));
  if (ds && !byDs[norm(ds)]) return 'the select options of this shared database are not cached in project.json (notion.options): run the setup skill step 3 first';
  const sources = ds ? [byDs[norm(ds)]] : Object.values(byDs);
  for (const [name, raw] of Object.entries(properties)) {
    const known = sources.filter((s) => Array.isArray(s?.[name])).flatMap((s) => s[name]);
    if (!known.length || raw === null || raw === '') continue;
    const values = Array.isArray(raw) ? raw : [raw];
    const bad = values.find((v) => typeof v === 'string' && !known.includes(v));
    if (bad) return `"${bad}" is not an option of ${name} (allowed: ${known.join(', ')}); never add an option to a shared database — use an existing value, or ask the owner of the Discovery tracking page`;
  }
  return null;
}

// Pure decision, exported for tests. Returns null to allow, or the refusal reason.
export function decide(event, { allowed, project = {} }) {
  const tool = shortName(event.tool_name);
  if (READ_TOOL.test(tool)) return null;
  const input = event.tool_input ?? {};
  const mine = project.project;

  if (/^notion-delete/.test(tool)) return 'deleting is not allowed: mark the row (Not for us, Dropped, Ruled out) and give the reason in Notes';

  // A linked view placed on one of our pages only reads the shared database: allowed when the page is ours
  // and, for a shared database, when the view filters on our project. Views of the shared databases themselves stay refused.
  if (tool === 'notion-create-view' && input.parent_page_id && !input.database_id) {
    if (!allowed) return 'allowlist unreadable';
    const parent = idsIn(input.parent_page_id);
    if (!parent.length || !parent.every((id) => allowed.has(id))) {
      return 'a linked view goes on a page of our workspace (rules/notion-allowlist.json)';
    }
    if (idsIn(input.data_source_id).some((id) => SHARED.has(id))) {
      if (!mine) return 'project.json has no project: run the setup skill first';
      const escaped = mine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp(`FILTER\\s+"Project"\\s*=\\s*"${escaped}"`, 'i').test(input.configure ?? '')) {
        return `a linked view of a shared database must show only our rows: start its configure with FILTER "Project" = "${mine}"`;
      }
    }
    return null;
  }

  if (SCHEMA_TOOLS.test(tool) && idsIn(input).some((id) => SHARED.has(id))) {
    return 'the shared Discovery tracking databases and WTF Projects follow a schema contract read by the WTF Discovery Board; ask their owner for any schema, view or structure change';
  }

  if (tool === 'notion-create-pages') {
    const parent = idsIn(input.parent);
    if (parent.some((id) => SHARED_DATA_SOURCES.has(id) || SHARED_DATABASES.has(id))) {
      if (!mine) return 'project.json has no project: run the setup skill before writing to the shared databases';
      const ds = parent.find((id) => SHARED_DATA_SOURCES.has(id));
      for (const page of input.pages ?? []) {
        const value = projectOf(page?.properties);
        if (!value) return 'every row in a shared database needs the Project property';
        if (value !== mine) return `this repository is ${mine}; a row for ${value} belongs to that project`;
        const bad = unknownOption(page?.properties, project, ds);
        if (bad) return bad;
      }
      return null;
    }
    const projectPage = idsIn(project.notion?.project_page ?? '');
    if (parent.length && parent.every((id) => projectPage.includes(id))) return null;
  }

  if (tool === 'notion-update-page') {
    const props = input.properties ?? input.data?.properties;
    const value = projectOf(props);
    if (value && value !== mine) return `rows cannot move to another project (${value}); this repository is ${mine ?? 'not set up'}`;
    const bad = unknownOption(props, project, null);
    if (bad) return bad;
  }

  if (!allowed) return 'allowlist unreadable';
  const { targets, unknown } = targetsOf(input);
  if (unknown.length) return `target outside the allowlist (${unknown.join(', ')})`;
  if (!targets.length) return `no verifiable target for ${event.tool_name}`;
  const refused = targets.filter((id) => !allowed.has(id));
  if (refused.length) return `target outside the allowlist (${refused.join(', ')}); a row of our project created by hand is adopted with: node scripts/notion-allow.mjs <id>`;
  return null;
}

function responseText(response) {
  if (typeof response === 'string') return response;
  if (Array.isArray(response)) return response.map((part) => part.text ?? JSON.stringify(part)).join('\n');
  if (response && Array.isArray(response.content)) return responseText(response.content);
  return JSON.stringify(response ?? '');
}

// Adds ids to a section of the allowlist, under the lock. Exported for scripts/notion-allow.mjs.
export function addToAllowlist(section, ids, file = allowlistFile()) {
  return withLock(file, () => {
    const list = JSON.parse(readFileSync(file, 'utf8'));
    list[section] ??= [];
    const added = [];
    for (const id of ids.map(norm)) {
      if (!list[section].includes(id)) {
        list[section].push(id);
        added.push(id);
      }
    }
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(list, null, 2) + '\n');
    renameSync(tmp, file);
    return added;
  });
}

function post(event) {
  const text = responseText(event.tool_response);
  const tool = shortName(event.tool_name);
  try {
    if (tool === 'notion-create-pages') {
      try {
        const data = JSON.parse(text);
        addToAllowlist('pages', (data.pages ?? []).map((p) => p.id).filter(Boolean));
      } catch (err) {
        if (err instanceof SyntaxError) console.error('notion-guard: unreadable response, add the created ids with node scripts/notion-allow.mjs');
        else throw err;
      }
    }
    if (tool === 'notion-create-database') {
      // Only the created database counts: the response also quotes its ancestors.
      const db = text.match(/Created database: <database url=\\?"\{*https:\/\/app\.notion\.com\/p\/([0-9a-f]{32})/i);
      if (db) addToAllowlist('databases', [db[1]]);
      addToAllowlist('data_sources', [...text.matchAll(/<data-source url=\\?"\{*collection:\/\/([0-9a-f-]{36})/gi)].map((m) => m[1]));
    }
  } catch (err) {
    console.error(`notion-guard: allowlist not updated (${err.message}); add the ids with node scripts/notion-allow.mjs`);
  }
  process.exit(0);
}

function deny(reason) {
  console.error(`Notion write refused: ${reason}. Rule: the harness writes only rows of its project in the shared Discovery tracking databases, and pages under its workspace page (rules/notion-allowlist.json). Otherwise, propose the text to the user, who pastes it.`);
  process.exit(2);
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  let raw = '';
  process.stdin.on('data', (chunk) => (raw += chunk));
  process.stdin.on('end', () => {
    let event;
    try {
      event = JSON.parse(raw);
    } catch {
      deny('unreadable call');
    }
    if (event.hook_event_name === 'PostToolUse') post(event);
    const project = readProject();
    let allowed = null;
    try {
      allowed = loadAllowed(allowlistFile(), project);
    } catch {}
    const reason = decide(event, { allowed, project });
    if (reason) deny(reason);
    process.exit(0);
  });
}
