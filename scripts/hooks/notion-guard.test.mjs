// Notion guard tests, in simulation: no call to Notion. Run: node --test scripts/hooks/notion-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = new URL('./notion-guard.mjs', import.meta.url).pathname;
const ALLOW = new URL('../notion-allow.mjs', import.meta.url).pathname;
const LIST = new URL('../../rules/notion-allowlist.json', import.meta.url);

const CONTACTS_DS = '41c1cc0b-d5bc-8103-b9c8-000b5b4b9cf7';
const CONTACTS_DB = '41c1cc0bd5bc8169aa01d9aa1805a4e7';
const WTF_PROJECTS_DS = '2b61cc0b-d5bc-80c0-aaeb-000bcf5306df';
const PROJECT_PAGE = '4101cc0bd5bc8095bf5cd3d4b47943b3';
const WORKSPACE = '1111111111111111aaaaaaaaaaaaaaaa';
const ROW = '2222222222222222bbbbbbbbbbbbbbbb';
const OTHER = '3333333333333333cccccccccccccccc';

// A temporary project.json and a copy of the allowlist with one adopted row.
const OPTIONS = { [`collection://${CONTACTS_DS}`]: { Project: ['ExampleX', 'OtherX'], Stage: ['Target', 'Contacted', 'Replied', 'Call booked', 'Call done', 'Not for us'], Type: ['Target user', 'Supplier', 'Expert', 'Investor', 'Founder', 'Other'] } };
function sandbox(project = { project: 'ExampleX', owner: 'Jane', notion: { project_page: PROJECT_PAGE, workspace_page: WORKSPACE, pages: {}, options: OPTIONS } }) {
  const dir = mkdtempSync(join(tmpdir(), 'guard-'));
  const list = join(dir, 'list.json');
  cpSync(LIST, list);
  const data = JSON.parse(readFileSync(list, 'utf8'));
  data.pages.push(ROW);
  writeFileSync(list, JSON.stringify(data));
  const projectFile = join(dir, 'project.json');
  writeFileSync(projectFile, JSON.stringify(project));
  return { dir, list, env: { NOTION_ALLOWLIST: list, PROJECT_FILE: projectFile } };
}

const run = (event, env) => spawnSync('node', [SCRIPT], { input: JSON.stringify(event), encoding: 'utf8', env: { ...process.env, ...env } });
const SB = sandbox();
const pre = (tool, tool_input, env = SB.env) => run({ hook_event_name: 'PreToolUse', tool_name: `mcp__claude_ai_Notion__notion-${tool}`, tool_input }, env);
const row = (properties) => ({ parent: { type: 'data_source_id', data_source_id: CONTACTS_DS }, pages: [{ properties }] });

const accepted = [
  ['row of our project in a shared database', 'create-pages', row({ Name: 'Jane Doe', Project: 'ExampleX' })],
  ['page under the workspace page', 'create-pages', { parent: { page_id: WORKSPACE }, pages: [] }],
  ['workspace page under the project page (setup)', 'create-pages', { parent: { page_id: PROJECT_PAGE }, pages: [] }],
  ['update of an adopted row', 'update-page', { page_id: ROW, command: 'update_properties', properties: { Stage: 'Replied' } }],
  ['update keeping our Project', 'update-page', { page_id: ROW, properties: { Project: 'ExampleX' } }],
  ['target as a URL', 'update-page', { page_id: `https://app.notion.com/p/${WORKSPACE}?pvs=204` }],
  ['database under the workspace page', 'create-database', { parent: { type: 'page_id', page_id: WORKSPACE } }],
  ['linked view of a shared database on our workspace, filtered on our project', 'create-view', { parent_page_id: WORKSPACE, data_source_id: CONTACTS_DS, name: 'Pipeline', type: 'board', configure: 'FILTER "Project" = "ExampleX"; GROUP BY "Stage"' }],
  ['row with known select values', 'create-pages', row({ Name: 'Jane Doe', Project: 'ExampleX', Stage: 'Call done', Type: 'Target user' })],
  ['update with a known stage', 'update-page', { page_id: ROW, properties: { Stage: 'Replied' } }],
];
for (const [name, tool, input] of accepted) test(`accepted: ${name}`, () => assert.equal(pre(tool, input).status, 0, pre(tool, input).stderr));

const refused = [
  ['deletion', 'delete-pages', { page_ids: [ROW] }],
  ['schema change of a shared database', 'update-data-source', { data_source_id: `collection://${CONTACTS_DS}` }],
  ['view on a shared database', 'create-view', { database_id: CONTACTS_DB }],
  ['schema change of WTF Projects', 'update-data-source', { data_source_id: WTF_PROJECTS_DS }],
  ['database inside Discovery tracking', 'create-database', { parent: { page_id: '41c1cc0bd5bc810f818feb1c9eabc5f0' } }],
  ['row without Project', 'create-pages', row({ Name: 'Jane Doe' })],
  ['row of another project', 'create-pages', row({ Name: 'Jane Doe', Project: 'OtherX' })],
  ['relabelling a row to another project', 'update-page', { page_id: ROW, properties: { Project: 'OtherX' } }],
  ['update of the project page itself', 'update-page', { page_id: PROJECT_PAGE, command: 'insert_content' }],
  ['update of a page outside the allowlist', 'update-page', { page_id: OTHER }],
  ['comment outside the allowlist', 'create-comment', { page_id: OTHER }],
  ['page without parent', 'create-pages', { pages: [] }],
  ['draft', 'create-pages', { creation_mode: 'draft', pages: [] }],
  ['memory', 'create-pages', { parent: 'memory', pages: [] }],
  ['teamspace', 'create-pages', { parent: { teamspace_id: WORKSPACE }, pages: [] }],
  ['move to the workspace root', 'move-pages', { page_or_database_ids: [ROW], new_parent: { type: 'workspace' } }],
  ['move out of a shared database', 'move-pages', { page_or_database_ids: [ROW], new_parent: { data_source_id: CONTACTS_DS } }],
  ['tool without target', 'set-comment-reaction', { discussion: 'x' }],
  ['linked view of a shared database without our project filter', 'create-view', { parent_page_id: WORKSPACE, data_source_id: CONTACTS_DS, name: 'All', type: 'table', configure: 'GROUP BY "Stage"' }],
  ['linked view filtered on another project', 'create-view', { parent_page_id: WORKSPACE, data_source_id: CONTACTS_DS, name: 'OtherX', type: 'table', configure: 'FILTER "Project" = "OtherX"' }],
  ['linked view on a page outside our workspace', 'create-view', { parent_page_id: OTHER, data_source_id: CONTACTS_DS, name: 'X', type: 'table', configure: 'FILTER "Project" = "ExampleX"' }],
  ['new view tab on a shared database', 'create-view', { database_id: CONTACTS_DB, data_source_id: CONTACTS_DS, name: 'X', type: 'table', configure: 'FILTER "Project" = "ExampleX"' }],
  ['row with an unknown stage (would create an option)', 'create-pages', row({ Name: 'Jane Doe', Project: 'ExampleX', Stage: 'call done' })],
  ['row with an unknown type', 'create-pages', row({ Name: 'Jane Doe', Project: 'ExampleX', Type: 'target-user' })],
  ['update with an unknown stage', 'update-page', { page_id: ROW, properties: { Stage: 'Follow-up sent' } }],
];
for (const [name, tool, input] of refused) {
  test(`refused: ${name}`, () => {
    const r = pre(tool, input);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Notion write refused/);
  });
}

test('without a project, rows in shared databases are refused', () => {
  const sb = sandbox({});
  const r = pre('create-pages', row({ Name: 'x', Project: 'ExampleX' }), sb.env);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /run the setup skill/);
});

// The matcher covers every Notion tool: reads pass without a target, any other write is checked.
const reads = ['search', 'fetch', 'query-data-sources', 'query-meeting-notes', 'get-comments', 'get-users', 'get-self', 'list-recent-pages',
  'calendar-list-events', 'download-attachment', 'memory-search', 'connector-search', 'view-version', 'wait-session', 'search-agents'];
for (const tool of reads) test(`read passes without target: ${tool}`, () => assert.equal(pre(tool, { query: 'x' }).status, 0));

const newWrites = ['create-meeting-note', 'update-sidebar-tabs', 'update-skill-settings', 'calendar-create-events', 'tool-of-tomorrow'];
for (const tool of newWrites) {
  test(`unknown write is checked, refused without an allowed target: ${tool}`, () => {
    const r = pre(tool, { title: 'x' });
    assert.equal(r.status, 2);
  });
}

test('refused if the allowlist is unreadable', () => {
  const r = pre('update-page', { page_id: WORKSPACE }, { ...SB.env, NOTION_ALLOWLIST: '/nowhere/list.json' });
  assert.equal(r.status, 2);
});

test('refused if the call is unreadable', () => {
  const r = spawnSync('node', [SCRIPT], { input: 'not json', encoding: 'utf8' });
  assert.equal(r.status, 2);
});

test('after creation: new ids are added, not the ancestors', () => {
  const sb = sandbox();
  const newRow = 'aaaaaaaa-d5bc-8143-ac7f-eae5aab38c95';
  run({ hook_event_name: 'PostToolUse', tool_name: 'mcp__claude_ai_Notion__notion-create-pages', tool_response: [{ type: 'text', text: JSON.stringify({ pages: [{ id: newRow }] }) }] }, sb.env);
  const db = 'bbbbbbbbd5bc8143ac7feae5aab38c95';
  const ds = 'cccccccc-d03d-4055-92a8-d3870f89eb24';
  const text = `{"result":"Created database: <database url=\\"{{https://app.notion.com/p/${db}}}\\" inline=\\"false\\">\\n<ancestor-path>\\n<parent-page url=\\"https://app.notion.com/p/${PROJECT_PAGE}\\"/>\\n<data-source url=\\"{{collection://${ds}}}\\">"}`;
  run({ hook_event_name: 'PostToolUse', tool_name: 'mcp__claude_ai_Notion__notion-create-database', tool_response: [{ type: 'text', text }] }, sb.env);
  const list = JSON.parse(readFileSync(sb.list, 'utf8'));
  assert.ok(list.pages.includes(newRow.replace(/-/g, '')));
  assert.ok(list.databases.includes(db));
  assert.ok(list.data_sources.includes(ds.replace(/-/g, '')));
  assert.ok(!JSON.stringify(list).includes(PROJECT_PAGE));
  // The created page is now a valid target.
  assert.equal(pre('update-page', { page_id: newRow }, sb.env).status, 0);
});

test('after creation: parallel creations do not erase each other', async () => {
  const sb = sandbox();
  const ids = Array.from({ length: 8 }, (_, i) => `${String(i).repeat(8)}-d5bc-8143-ac7f-eae5aab38c95`);
  await Promise.all(ids.map((id) => new Promise((resolve, reject) => {
    const child = spawn('node', [SCRIPT], { env: { ...process.env, ...sb.env } });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
    child.stdin.end(JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'mcp__claude_ai_Notion__notion-create-pages', tool_response: [{ type: 'text', text: JSON.stringify({ pages: [{ id }] }) }] }));
  })));
  const list = JSON.parse(readFileSync(sb.list, 'utf8'));
  for (const id of ids) assert.ok(list.pages.includes(id.replace(/-/g, '')), id);
  assert.deepEqual(readdirSync(sb.dir).sort(), ['list.json', 'project.json']);
});

test('notion-allow adopts pages, and --root sets the workspace root', () => {
  const sb = sandbox({ project: 'ExampleX', owner: 'Jane', notion: {} });
  const allow = (...args) => spawnSync('node', [ALLOW, ...args], { encoding: 'utf8', env: { ...process.env, ...sb.env } });
  assert.equal(pre('update-page', { page_id: OTHER }, sb.env).status, 2);
  let r = allow(`https://app.notion.com/p/${OTHER}?pvs=204`, OTHER);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /1 id\(s\) added to "pages", 1 already there/);
  assert.equal(pre('update-page', { page_id: OTHER }, sb.env).status, 0);
  const root = '4444444444444444dddddddddddddddd';
  assert.equal(pre('create-pages', { parent: { page_id: root }, pages: [] }, sb.env).status, 2);
  r = allow('--root', root);
  assert.equal(r.status, 0);
  assert.deepEqual(JSON.parse(readFileSync(sb.list, 'utf8')).root, [root]);
  assert.equal(pre('create-pages', { parent: { page_id: root }, pages: [] }, sb.env).status, 0);
  assert.equal(allow().status, 1);
});
