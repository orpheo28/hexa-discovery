# How the harness is built

For whoever changes the harness (human or agent). Users read `README.md`.

## Layout

| Path | What | In Git |
| --- | --- | --- |
| `project.json` | The project's settings: name, owner, language, sprint dates, targets, Notion ids, budget. Written by `setup` | yes |
| `CLAUDE.md` | The agent's entry point: role, current idea in one sentence, commands, rules in brief | yes |
| `AGENTS.md` | The same entry point for Codex and other agents | yes |
| `STATUS.md` | Where the discovery stands, 25 lines max, rewritten by `review` | yes |
| `1-idea/` | `current.md` (the idea in force), `hypotheses.md` (dashboard + register), `history.md` (every version), `idea-framework.md` (go / no-go document) | yes |
| `2-calls/` | One file per call, `YYYY-MM-DD-first-last.md`, plus `README.md` (index) | yes |
| `3-knowledge/` | What we learned, by theme, one sourced line per learning; `value-chain.md` is the map of the chain; `README.md` is the synthesis | yes |
| `4-sources/` | One file per source (article, video, podcast, report), plus `README.md` (index) | yes |
| `5-research/` | One file per Exa / Firecrawl search that served, plus `README.md` (index) | yes |
| `6-templates/` | Outreach rules and message templates | yes |
| `docs/` | `decisions.md`, `notion.md` (ids and schemas), `notion-workspace.md` (the common Notion dashboard), `method.md` (Hexa Lean Discovery), `onboarding.md` (setup progress) and `onboarding-review.md` (what the user validated at import), this file | yes |
| `rules/` | `rules.md` (the rules), `notion-allowlist.json` (Notion write targets) | yes |
| `scripts/` | Hooks, quota counter, LinkedIn network, email check, tests | yes |
| `data/` | `usage.json` (Exa and Firecrawl counter), `linkedin/connections.csv` (the user's network) | **no** |
| `.env` | Optional API keys | **no** |

## project.json

```json
{
  "project": "ExampleX",
  "owner": "Jane Doe",
  "language": "fr",
  "partner": "<Hexa partner>",
  "sprint": { "start": "2026-11-02", "draft_proposal": "2026-11-13", "go_no_go": "2026-12-02" },
  "targets": { "calls": 40, "a_players": 8, "calls_per_week": 10 },
  "notion": {
    "project_page": "<WTF Projects page id>",
    "workspace_page": "<page created by setup under the project page>",
    "pages": { "current_idea": "", "learnings": "", "idea_framework": "" }
  },
  "budget": { "exa_monthly": 1000, "firecrawl_monthly": 1000, "stop_at": 0.8 }
}
```

`project` must be an option of the `Project` select in the shared Discovery tracking databases. Empty values mean "not set up yet": the session-start hook then asks for `setup`.

## Notion

- **Shared (Discovery tracking, owned by the studio):** Contacts is the CRM; Hypotheses, Problems and Idea log mirror `1-idea/`; Weekly reviews is filled by `review`. Ids and schemas: `docs/notion.md`. Every row has `Project` = ours.
- **Ours:** the workspace page `🧭 <Project> discovery` under the project page in WTF Projects, built by `setup` from the common template `docs/notion-workspace.md` (9 linked views filtered on the project, 3 mirror pages).
- **Guard** (`scripts/hooks/notion-guard.mjs`): no deletion; no schema, view or move on the shared databases; a row created in a shared database must carry our `Project`; any other write must target an id in `rules/notion-allowlist.json` (the workspace page, the shared data sources for creation, and every page the harness created or adopted). Created ids are added after the call (PostToolUse). Rows of our project created by hand are adopted with `node scripts/notion-allow.mjs <ids>` after a query filtered on `Project`.

## Budget

`scripts/lib/quota.mjs` counts every Exa call and every Firecrawl credit in `data/usage.json` (per month). `scripts/hooks/budget-guard.mjs` refuses a call at `budget.stop_at` of the monthly limit; `npm run quota` shows the state.

## Updating from the template

Each discovery repo is created from the template. `npm run update-harness` fetches the template's `main` and brings back only the harness paths (`.claude/`, `scripts/`, `package.json`, `rules/rules.md`, `6-templates/writing.md`, `docs/harness.md`, `docs/method.md`, `docs/notion.md`, `docs/notion-workspace.md`, `AGENTS.md`), never the project's content.
