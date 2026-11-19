// Reads project.json (the project's settings, written by the setup skill). Never throws: a missing or broken
// file means "not set up yet". PROJECT_FILE overrides the path (tests).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const projectFile = () => process.env.PROJECT_FILE ?? join(ROOT, 'project.json');

export const BUDGET_DEFAULTS = { exa_monthly: 1000, firecrawl_monthly: 1000, stop_at: 0.8 };

export function readProject(file = projectFile()) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

export function budget(project = readProject()) {
  const b = { ...BUDGET_DEFAULTS, ...(project.budget ?? {}) };
  for (const k of Object.keys(BUDGET_DEFAULTS)) if (!(Number(b[k]) > 0)) b[k] = BUDGET_DEFAULTS[k];
  return { exa_monthly: Number(b.exa_monthly), firecrawl_monthly: Number(b.firecrawl_monthly), stop_at: Number(b.stop_at) };
}

// True when the fields the harness needs are filled.
export const isSetUp = (project = readProject()) => Boolean(project.project && project.owner);
