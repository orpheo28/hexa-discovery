#!/usr/bin/env node
// Brings a discovery repo's own files up to what the current harness expects, without touching their content:
// - starter files the skills write to, created only when missing;
// - new project.json settings, added with their defaults only when missing;
// - CLAUDE.md imports the skills index (.claude/skills/README.md), so new skills reach the agent's command table
//   even though CLAUDE.md belongs to the project and is never overwritten by an update.
// Idempotent. Run by scripts/update-harness.sh after an update, and by the session-start hook (a repo updated by an
// older update script gets migrated at the next session). Prints what changed; nothing is committed.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './lib/project.mjs';

export const SKILLS_IMPORT = '@.claude/skills/README.md';

export const STARTERS = {
  '1-idea/hypotheses-journal.md': `# Evidence journal

The dated detail of the evidence behind [\`hypotheses.md\`](hypotheses.md). The register keeps one sentence per piece of evidence in its For and Against columns; the quotes, the context and the hypotheses each source touches go here, so the register stays short enough to read in one go.

One section per call or batch of sources, appended at the end, never rewritten (rule 10):

\`\`\`markdown
## Call Jane Doe (Acme, 2026-11-20): target user
- H3 for — "Exact quote" [00:12:34] (2-calls/2026-11-20-jane-doe.md)
- H7 against — what she does today instead, with the number she gave [00:21:05]
\`\`\`

For third-party sources: \`## Sources of YYYY-MM-DD: field listening\`, one line per source and hypothesis, with the \`4-sources/\` file.
`,
  'docs/debriefs.md': `# Debriefs posted in the team channel

Written by the \`debrief\` skill, posted by the owner in \`project.json\` \`team_channel\`, then copied here exactly as posted. The numbering continues from the last block.
`,
};

export const PROJECT_DEFAULTS = { timezone: 'Europe/Paris', team_channel: '' };

export function migrate(root = ROOT) {
  const changes = [];
  for (const [file, content] of Object.entries(STARTERS)) {
    const abs = join(root, file);
    if (existsSync(abs)) continue;
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
    changes.push(`created ${file}`);
  }

  const projectFile = join(root, 'project.json');
  if (existsSync(projectFile)) {
    let project = null;
    try {
      project = JSON.parse(readFileSync(projectFile, 'utf8'));
    } catch {}
    if (project && typeof project === 'object' && !Array.isArray(project)) {
      const added = Object.keys(PROJECT_DEFAULTS).filter((k) => !(k in project));
      if (added.length) {
        // Keep the key order readable: new settings go right after "language" when it exists.
        const next = {};
        for (const [k, v] of Object.entries(project)) {
          next[k] = v;
          if (k === 'language') for (const a of added) next[a] = PROJECT_DEFAULTS[a];
        }
        for (const a of added) if (!(a in next)) next[a] = PROJECT_DEFAULTS[a];
        writeFileSync(projectFile, JSON.stringify(next, null, 2) + '\n');
        changes.push(`project.json: added ${added.join(', ')} (defaults)`);
      }
    }
  }

  const claude = join(root, 'CLAUDE.md');
  if (existsSync(claude)) {
    const text = readFileSync(claude, 'utf8');
    if (!text.includes(SKILLS_IMPORT)) {
      writeFileSync(claude, `${text.replace(/\s*$/, '')}\n\n## Every command\n\nThe full, up-to-date list of skills and what triggers them:\n\n${SKILLS_IMPORT}\n`);
      changes.push('CLAUDE.md: imports the skills index');
    }
  }
  return changes;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const changes = migrate();
  console.log(changes.length ? `Migrated: ${changes.join('; ')}.` : 'Nothing to migrate.');
}
