#!/usr/bin/env node
// PreToolUse guard on Bash (Claude Code): a discovery repo holds call transcripts, so it is never pushed to the
// public template nor to a public repository.
//   - not a `git push`: allowed;
//   - the template itself (project.json not set up): allowed, that is the maintainers' work;
//   - a discovery repo (project.json set up): refused if `origin` is the template, or if GitHub says the repo is not
//     private. If GitHub cannot be asked (offline, gh missing), refused with the reason: pushing can wait.
// Exit 2 = refusal, message on stderr. Never blocks anything else.
import { execFileSync } from 'node:child_process';
import { ROOT, readProject, isSetUp } from '../lib/project.mjs';

export const TEMPLATE = (process.env.HARNESS_TEMPLATE_URL ?? 'https://github.com/orpheo28/hexa-discovery.git')
  .replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '').toLowerCase();

export const isPush = (command = '') => /(^|[;&|(\s])git(\s+-C\s+\S+)?\s+push(\s|$)/.test(command);

export const repoOf = (url = '') => {
  const m = /github\.com[:/]([^/\s]+\/[^/\s]+?)(\.git)?\/?$/i.exec(url.trim());
  return m ? m[1].toLowerCase() : null;
};

// Pure decision for tests: returns null to allow, or the reason.
export function decide({ command, setUp, originUrl, visibility }) {
  if (!isPush(command)) return null;
  if (!setUp) return null;
  const repo = repoOf(originUrl);
  if (!repo) return 'origin is not a GitHub repository; check `git remote -v` (your discovery repo must be a private GitHub repo)';
  if (repo === TEMPLATE) return `origin is the public template (${TEMPLATE}); your discovery must go to your own private repo: run the setup skill step 2`;
  if (!visibility) return 'could not check that your repo is private (offline or gh not logged in); push later, or run `gh auth status`';
  if (visibility !== 'PRIVATE' && visibility !== 'INTERNAL') return `your repo ${repo} is ${visibility.toLowerCase()}: it holds call transcripts. Make it private first: gh repo edit ${repo} --visibility private --accept-visibility-change-consequences`;
  return null;
}

const run = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { cwd: ROOT, timeout: 8000, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return null;
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  let raw = '';
  process.stdin.on('data', (c) => (raw += c));
  process.stdin.on('end', () => {
    let command = '';
    try {
      command = JSON.parse(raw)?.tool_input?.command ?? '';
    } catch {
      process.exit(0);
    }
    if (!isPush(command)) process.exit(0);
    const setUp = isSetUp(readProject());
    const originUrl = run('git', ['remote', 'get-url', 'origin']) ?? '';
    const repo = repoOf(originUrl);
    const visibility = setUp && repo && repo !== TEMPLATE ? run('gh', ['repo', 'view', repo, '--json', 'visibility', '--jq', '.visibility']) : null;
    const reason = decide({ command, setUp, originUrl, visibility });
    if (reason) {
      console.error(`git push refused: ${reason}.`);
      process.exit(2);
    }
    process.exit(0);
  });
}
