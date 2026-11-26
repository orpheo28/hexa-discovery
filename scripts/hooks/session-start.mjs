#!/usr/bin/env node
// SessionStart hook: gives Claude the starting point of the day. Standard output is added to the session context.
// Never blocks (exit 0 in every case).
//   - today's date (Paris), ISO week and its Monday;
//   - Exa and Firecrawl quotas (local counter, no network call);
//   - the project (project.json), or "not set up";
//   - sprint deadlines (project.json sprint) and days since the last review (STATUS.md title);
//   - "## To do" and "## Next step" of STATUS.md;
//   - whether a harness update is available (remote `template`, fetch only, never merged);
//   - the migration of the project's own files after an update (scripts/migrate.mjs), and a missing usage counter;
//   - the instruction: start with "My day" (crm skill), and offer the review when it is due.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, budget, isSetUp, readProject } from '../lib/project.mjs';
import { USAGE_FILE, localFirecrawlCredits, monthKey, readUsage } from '../lib/quota.mjs';

export const HARNESS_PATHS = ['.claude', 'scripts', 'rules/rules.md', '6-templates/writing.md', 'docs/harness.md', 'docs/method.md', 'docs/notion.md', 'docs/notion-workspace.md', 'AGENTS.md', 'package.json'];

export function paris(now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' })
      .formatToParts(now).map((x) => [x.type, x.value]),
  );
  const date = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
  const dow = (date.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - dow);
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const jan4 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const week1 = new Date(jan4);
  week1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  const iso = (d) => d.toISOString().slice(0, 10);
  return { weekday: p.weekday, date, ymd: iso(date), monday, mondayYmd: iso(monday), week: 1 + Math.round((monday - week1) / 604800000) };
}

// "(review of 2026-11-16)" in the first line of STATUS.md → Date, or null.
export function lastReview(status) {
  const m = /review of (\d{4})-(\d{2})-(\d{2})/i.exec(status.split('\n')[0] ?? '');
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
}

// Body of the first "## <title>…" section (prefix match: "## To do (Jane)" matches "To do").
export const section = (status, title) => {
  const esc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`^## ${esc}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |(?![\\s\\S]))`, 'm').exec(status);
  return m ? m[1].trim() : '';
};

// Sprint deadlines from project.json, plus "- YYYY-MM-DD: label" lines of a "## Deadlines" section of STATUS.md.
export function deadlines(project = {}, status = '') {
  const labels = { draft_proposal: 'Draft proposal', go_no_go: 'IDEA Framework (go / no-go)' };
  const out = [];
  for (const [key, label] of Object.entries(labels)) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(project.sprint?.[key] ?? '');
    if (m) out.push({ date: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])), label });
  }
  for (const l of section(status, 'Deadlines').split('\n')) {
    const m = /^-\s*(\d{4})-(\d{2})-(\d{2})\s*:?\s*(.+)$/.exec(l.trim());
    if (m) out.push({ date: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])), label: m[4].trim() });
  }
  return out.sort((a, b) => a.date - b.date);
}

export function brief({ status = '', usage = {}, project = {}, now = new Date(), update = '' } = {}) {
  const t = paris(now);
  const b = budget(project);
  const month = usage[monthKey(now)] ?? {};
  const exa = month.exa?.calls ?? 0;
  const fc = localFirecrawlCredits(month);
  const pct = (u, l) => Math.round((u / l) * 100);
  const lines = [`Session starting point (SessionStart hook): ${t.weekday} ${t.ymd} (Paris), week W${t.week}, Monday ${t.mondayYmd}.`];

  if (isSetUp(project)) {
    const n = project.notion ?? {};
    lines.push(`Project: ${project.project} · owner: ${project.owner} · reply in: ${project.language ?? 'the user\'s language'}`
      + ` · Notion workspace page: ${n.workspace_page || 'not created yet (setup)'}.`);
    const tg = project.targets ?? {};
    if (tg.calls || tg.a_players) lines.push(`Targets: ${tg.calls ?? '?'} calls, ${tg.a_players ?? '?'} A-players, ${tg.calls_per_week ?? '?'} calls a week.`);
  } else {
    lines.push('NOT SET UP: project.json is missing or empty. Before anything else, run the setup skill (.claude/skills/setup/SKILL.md).');
  }

  lines.push(`Quotas this month (local counter): Exa ${exa}/${b.exa_monthly} calls (${pct(exa, b.exa_monthly)} %), Firecrawl ~${fc}/${b.firecrawl_monthly} credits (${pct(fc, b.firecrawl_monthly)} %). Stop at ${Math.round(b.stop_at * 100)} %.`);

  const last = lastReview(status);
  const days = last ? Math.round((t.date - last) / 86400000) : null;
  const reviewedThisWeek = last ? last >= t.monday : false;
  lines.push(days === null ? 'Last review: unknown.' : `Last review: ${days} day${days === 1 ? '' : 's'} ago.${days >= 7 ? ' REVIEW DUE: offer it.' : ''}`);
  if (['Friday', 'Sunday'].includes(t.weekday) && !reviewedThisWeek) {
    lines.push(`${t.weekday}: this week's review is not done yet. Offer the review skill (weekly numbers, Weekly reviews row in Notion).`);
  }

  const dl = deadlines(project, status);
  if (dl.length) {
    lines.push('Sprint deadlines: ' + dl.map(({ date, label }) => {
      const d = Math.round((date - t.date) / 86400000);
      return `${label} ${d > 0 ? `in ${d} day${d > 1 ? 's' : ''}` : d === 0 ? 'today' : `OVERDUE by ${-d} day${d < -1 ? 's' : ''}`}`;
    }).join('; ') + '.');
  }

  const todo = section(status, 'To do');
  if (todo) lines.push('', 'To do (STATUS.md):', todo);
  const next = section(status, 'Next step');
  if (next) lines.push('', `Next step of the harness: ${next}`);
  if (update) lines.push('', update);
  lines.push('', isSetUp(project)
    ? 'Instruction: at the user\'s first message, unless they ask for something else, start with "My day" (crm skill): follow-ups due, today\'s calls, replies without a call, new Granola meetings. One line if nothing is due.'
    : 'Instruction: at the user\'s first message, run the setup skill and guide them step by step.');
  return lines.join('\n');
}

// Quiet check of the template remote: fetch only, never merge.
export function harnessUpdate(root = ROOT) {
  try {
    execFileSync('git', ['-C', root, 'remote', 'get-url', 'template'], { stdio: 'ignore', timeout: 3000 });
  } catch {
    return '';
  }
  try {
    execFileSync('git', ['-C', root, 'fetch', '--quiet', 'template', 'main'], { stdio: 'ignore', timeout: 8000 });
    const diff = execFileSync('git', ['-C', root, 'diff', '--stat', 'HEAD', 'template/main', '--', ...HARNESS_PATHS], { timeout: 5000 }).toString().trim();
    return diff ? 'A harness update is available from the template. Tell the user once; to apply it: npm run update-harness.' : '';
  } catch {
    return '';
  }
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  try {
    const statusFile = join(ROOT, 'STATUS.md');
    const status = existsSync(statusFile) ? readFileSync(statusFile, 'utf8') : '';
    let usage = {};
    try { usage = readUsage(); } catch {}
    const notes = [];
    // A repo updated by an older update script, or a new skill expecting a file: bring the project's files along.
    try {
      const { migrate } = await import('../migrate.mjs');
      const changes = migrate();
      if (changes.length) notes.push(`Harness migration done at session start: ${changes.join('; ')}. Tell the user in one line, then commit these files ("Harness migration") and push.`);
    } catch {}
    if (isSetUp(readProject()) && !existsSync(USAGE_FILE())) {
      notes.push('No local Exa / Firecrawl counter (data/usage.json): those tools are refused. On the owner\'s own machine, run npm run quota -- init once; in a cloud session, use the built-in web search and fetch.');
    }
    const update = [harnessUpdate(), ...notes].filter(Boolean).join('\n');
    process.stdout.write(brief({ status, usage, project: readProject(), update }) + '\n');
  } catch (err) {
    process.stdout.write(`SessionStart hook: starting point unavailable (${err.message}).\n`);
  }
  process.exit(0);
}
