---
name: setup
description: Use on first use, when project.json is empty, or when the user says "setup", "onboard me", "install the harness", "start my discovery", "set up a new Hexa discovery", « installe le harness », « configure ma discovery », « monte-moi une discovery », « je commence ma discovery », « setup ». Guided onboarding from zero to a working discovery - tools and connectors, private repo from the Hexa template, project and sprint, the Notion dashboard, the import of every Granola call and Notion page already linked to the discovery (validated by the user), the LinkedIn network, and the first commit. Resumable: every step checks docs/onboarding.md and skips what is done.
---

# Setup: a guided onboarding

The user should only have to click "connect", answer a few questions and validate two lists. You do everything else. Talk in their language, one step at a time, short messages, and say where you are ("Step 3 of 8"). Never dump a wall of instructions.

Track progress in `docs/onboarding.md` (format in the `import` skill, section 8). On every run, read it first and resume at the first step not done.

## 0. Welcome (first run only)

In one short message:
- what the harness will do for them (finds people, keeps the CRM, pulls every Granola call, turns calls and pages into knowledge, fills the Friday board; never sends anything);
- the plan: 8 steps, about 20 to 30 minutes, most of it automatic;
- what you will need from them: click to connect 2 to 4 tools, answer about 5 questions, validate 2 lists (your calls, then what I understood);
- **one thing to do right now**, because it takes time: request the LinkedIn export (linkedin.com → Me → Settings & Privacy → Data privacy → Get a copy of your data → "Want something in particular?" → tick **Connections** → Request archive). It arrives by email in 10 to 30 minutes; a first partial archive has no `Connections.csv`, wait for the second.

## 1. Tools (step 1 of 8)

1. `node --version` (20+), `git --version`, `gh --version`, `gh auth status`. Install what is missing with the user (macOS: `brew install node gh`; `gh auth login` opens the browser).
2. Load the MCP tools (ToolSearch: "notion", "granola", "exa", "firecrawl") and report in one table: ✅ connected / ❌ missing, what it is for, and for the missing ones the exact clicks: claude.ai → Settings → Connectors → <name> → Connect (Notion: allow the Hexa workspace). Connectors appear in Claude Code after restarting the session, signed in with the same account.
3. Notion missing: stop, wait for the user, re-check. Granola missing: strongly recommend it (the import and every call depend on it), continue only if the user says so. Exa missing: recommend it (finding people and companies), continue if the user says so. Firecrawl is optional and usually absent at Hexa: pages are read with Exa or the built-in web fetch, and emails come from the person or from a public page checked by `scripts/lib/email-check.mjs`.
4. Granola quick check: `get_account_info` (account, workspace). If the user records discovery calls in another Granola workspace, ask them to switch in the Granola app. Never call `switch_workspace` or `sign_out`.

## 2. The private repo (step 2 of 8)

- Not a git repo, or `origin` is the template `orpheo28/hexa-discovery`: the repo is created in step 3 once the project name is known.
- `origin` is the user's repo: check the `template` remote (`git remote add template https://github.com/orpheo28/hexa-discovery.git` if missing).
- The repo **must be private** (`gh repo view --json visibility`): it will hold transcripts. If public, ask to switch it (`gh repo edit --visibility private --accept-visibility-change-consequences`) before going on.
- `npm test` passes.

## 3. Project and sprint (step 3 of 8)

1. `notion-get-self` → name and `user://` id.
2. WTF Projects: `SELECT "Name", "Status", "url" FROM "collection://2b61cc0b-d5bc-80c0-aaeb-000bcf5306df" WHERE "Assign" LIKE ? AND "Status" NOT IN ('Aborted', 'Exited Studio', 'Non_startup')` with `%<user id>%`. Project = the part of `Name` before ` - `. One: confirm. Several: ask (one repo = one project). None: ask.
3. If the repo does not exist yet: `gh repo create <project-lowercase>-discovery --private --template orpheo28/hexa-discovery --clone`, then `git -C <folder> remote add template https://github.com/orpheo28/hexa-discovery.git`. **Then stop.** This session was started in another folder: the harness's hooks (Notion guard, push guard, budget) and skills are not loaded here. Tell the user, in two lines, exactly how to open the new folder (Claude desktop: Code tab → open folder → `<folder>`; terminal: `cd <folder> && claude`; VS Code: File → Open Folder; Orca: add the repository) and to say "setup" there: it resumes at this step.
4. **Cache the shared options.** `notion-fetch` each of the 5 shared data sources (`docs/notion.md`) and write every select property's options to `project.json` `notion.options`, keyed by `collection://<id>` (`{"collection://…": {"Project": [...], "Stage": [...], "Type": [...]}}`). The Notion guard refuses any value not in this cache: Notion would otherwise silently add an option to the shared schema. If our project is not an option of `Project` somewhere, tell the user to ask the owner of the Discovery tracking page to add it, then re-run this step; writes to that database are refused until then. Re-run this step whenever a write is refused for an unknown option.
5. One message, with defaults the user can accept with "ok": the Hexa partner on the project, sprint start (default: the project page's creation or today), draft proposal (start + 11 days), go / no-go (start + 30 days), targets (40 calls, 8 A-players, 10 calls a week), language of the repo files (default: theirs).
6. Write `project.json` (the guard allows the project page only as the parent of the workspace page: nothing else there is ever written); commit "Setup: project".

## 4. Notion dashboard (step 4 of 8)

**Before any Notion write (steps 4 to 8):** check that this session runs inside the discovery repo (`git rev-parse --show-toplevel` is the working folder, `project.json` has our project, and the session-start brief of the harness appeared at the start of the session). If not, stop and tell the user to open the repo folder and say "setup".

Build `🧭 <Project> discovery` exactly as `docs/notion-workspace.md` says (page, 9 linked views filtered on the project, 3 mirror pages), or repair it if it exists. Store the ids in `project.json`. Adopt the project's existing rows in the shared databases (query with `"Project" = ?`, then `node scripts/notion-allow.mjs <ids>`). Give the user the link: "this is your discovery dashboard; it fills up in step 6".

## 5. Read the context (step 5 of 8)

Read the Hexa method (`docs/method.md` and the Notion page "Lean Discovery", https://app.notion.com/p/2a71cc0bd5bc80dfb297d1a95044c8c4) and the project page with its sub-pages, enough to build the discovery vocabulary the `import` skill needs. Tell the user in 3 lines what you understood of the project, and ask if anything important is missing ("is there another page, doc or person I should know about?").

## 6. Import everything already done (step 6 of 8)

Run the `import` skill: Granola and Notion inventory → **validation 1** (right calls? missing ones? right pages?) → extraction → synthesis → **validation 2** (is what I understood right?) → writing to the repo, the CRM, the shared databases and the dashboard.

If the discovery has not started yet (no call, an empty project page), say so, draft the idea, 2–3 problems and 8–15 hypotheses from what exists, get them validated, and write them the same way.

## 7. LinkedIn network (step 7 of 8)

If the export arrived (`ls ~/Downloads/Basic_LinkedInDataExport_*.zip`, check `unzip -l` shows `Connections.csv`): `node scripts/network.mjs import <zip>`, then `stats`, then the relevance screen of the `network` skill on the target profiles of `1-idea/current.md`: show the 10 to 20 most useful connections (one line each: who, why) and offer to add them to the CRM with `find`. Not arrived: say "tell me 'import my LinkedIn' when the email comes" and continue.

## 8. Finish (step 8 of 8)

1. Replace the placeholders of `CLAUDE.md` (`{{PROJECT}}`, `{{OWNER}}`, `{{IDEA_ONE_LINER}}` = the idea in one sentence with version and date). With the user, fill the anchors table of `6-templates/linkedin.md` (the Hexa portfolio companies closest to the fields of the targets, each in 3 words; default: Aircall and Spendesk), and agree on `{domain}` and `{topic}` in the targets' words; show one sample message per template.
2. Rewrite `STATUS.md` (title `# State of the discovery (review of —)` until the first review, Done, Numbers, To do (owner), Next step; `## Deadlines` only for dates that are not already in `project.json`, which the session-start hook reads itself).
3. `npm run quota`, `npm test`, commit "Setup <Project> done", push.
4. End with, in the user's language:
   - the dashboard link and what is in it (calls, contacts, hypotheses, learnings imported);
   - **the 3 best things to do now**, from the import (for example: call back an A-player, the hypothesis with the least evidence and who could test it, a profile to find);
   - the cheat sheet: "my day" · "process my calls" / "call with X" · "find 15 <profile> in <region>" · "prep my call with X" · "I DMed X", "Y replied" · a link to learn from · "who do I know at X" · "review" before Friday · "import my calls" if one is missing.

## Rules

- Never read or print `.env`. Never edit a Notion schema. Never send anything.
- Nothing is written to Notion or to the knowledge before the user's validation (`import`, section 6).
- Re-running setup changes nothing that is done; it reports the state and resumes.
