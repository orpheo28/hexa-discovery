---
name: setup
description: Use on first use, when project.json is empty, or when the user says "setup", "onboard me", "install the harness", "start my discovery", « installe le harness », « configure ma discovery », « je commence ma discovery », « setup ». Creates the user's own discovery repo from the Hexa template, connects Notion, Granola, Exa, Firecrawl and the LinkedIn network, finds the project, bootstraps the idea and hypotheses, mirrors them in the shared Notion, and makes the first commit. Idempotent: every step checks before acting.
---

# Setup: from zero to a working discovery harness

Run every step in order. Each step first checks whether it is already done and skips it if so. Talk to the user in their language, in short steps, and do the work yourself: the user should only have to click "connect" and answer questions.

## 1. Machine and tools

1. Check `node --version` (20 or later), `git --version`, `gh --version` and `gh auth status`.
   - Missing Node: macOS `brew install node`, otherwise https://nodejs.org. Missing gh: `brew install gh`, then `gh auth login` (the user follows the browser prompt).
2. List the MCP tools this session exposes (load deferred tools with ToolSearch: "notion", "granola", "exa", "firecrawl"). Report in one table:

| Connector | Needed for | How to connect |
| --- | --- | --- |
| Notion | required: CRM, tracking, mirrors | claude.ai → Settings → Connectors → Notion → Connect, allow the Hexa workspace |
| Granola | calls (transcripts arrive by themselves) | claude.ai → Settings → Connectors → Granola. Transcripts may need a paid Granola plan; the free plan sees 30 days |
| Exa | finding people and companies | claude.ai → Settings → Connectors → Exa (free tier) |
| Firecrawl | reading pages, Apollo / Hunter emails | claude.ai → Settings → Connectors → Firecrawl (free tier) |

Connectors added in claude.ai appear in Claude Code and Claude desktop after a restart of the session, when signed in with the same account. Without Notion, stop here and say what to do. Without the others, continue and say what will be limited.

## 2. The user's own repo

- If `git remote get-url origin` points to `orpheo28/hexa-discovery` (the template itself), or the folder is not a git repo: create the user's repo from the template once the project name is known (step 3), then continue inside it:
  `gh repo create <project-lowercase>-discovery --private --template orpheo28/hexa-discovery --clone`, `cd` into it, `git remote add template https://github.com/orpheo28/hexa-discovery.git`.
  Tell the user to open that folder in their tool from now on (Claude desktop: Code tab → open folder; VS Code: File → Open Folder; Orca: add the repository).
- If `origin` is already the user's repo: check that the `template` remote exists, add it if not.
- The user's repo **must be private**: it will hold call transcripts and quotes. Check with `gh repo view --json visibility`; if it is public, stop and ask the user to make it private (`gh repo edit --visibility private --accept-visibility-change-consequences`) before any call or contact goes in. The template itself is public and holds no project data.
- `npm test` must pass before going on.

## 3. Who and which project

1. `notion-get-self` → the user's name and `user://` id.
2. Query WTF Projects:
   `SELECT "Name", "Status", "url" FROM "collection://2b61cc0b-d5bc-80c0-aaeb-000bcf5306df" WHERE "Assign" LIKE ? AND "Status" NOT IN ('Aborted', 'Exited Studio', 'Non_startup')` with `%<user id>%`.
3. Project = the part of `Name` before ` - ` ("ExampleX - AI for something" → `ExampleX`). One result: confirm it. Several: ask which one this repo is for (one repo = one project). None: ask.
4. Fetch the 5 shared data sources (`docs/notion.md`) and check that the project is an option of `Project` in each. If it is missing from one: tell the user to ask the owner of the Discovery tracking page to add it, and skip writes to that database until it is there. Never edit a schema.
5. Ask, in one message, what you cannot read: the partner who follows the project, the sprint start, the draft proposal date and the go / no-go date (defaults: start = today, draft = start + 11 days, go / no-go = start + 30 days), targets if different from the defaults (40 calls, 8 A-players, 10 calls a week).
6. Write `project.json` (`project`, `owner`, `language` = the user's language, `partner`, `sprint`, `targets`, `notion.project_page`, `budget` defaults), and add the project page id to `root` in `rules/notion-allowlist.json` with `node scripts/notion-allow.mjs --root <id>` (so the workspace page can be created under it).

## 4. Context reading

Read, and keep the essentials for step 7:
- the project page in WTF Projects and every sub-page (idea paper, problem, solution, competition, GTM, meetings, "what we've learnt");
- the Hexa method page "Lean Discovery" (https://app.notion.com/p/2a71cc0bd5bc80dfb297d1a95044c8c4) and `docs/method.md`;
- the project's existing rows in the 5 shared databases.

## 5. Notion workspace

1. Build the workspace from the common template, **exactly as described in `docs/notion-workspace.md`**: the page `🧭 <Project> discovery` under the project page, its 9 linked views filtered on the project (weekly reviews, funnel chart, pipeline, next actions, calls, A-players, hypotheses, problems, idea log), then the three mirror pages (`Current idea`, `What we've learnt`, `IDEA Framework`). Look for it first (`notion-search` with `page_url` = project page): if it exists, only add what is missing (section 4 of that file). Use `allow_async: false` for pages.
2. Store the ids in `project.json` (`notion.workspace_page`, `notion.pages.current_idea`, `.learnings`, `.idea_framework`); the guard has already recorded them in `rules/notion-allowlist.json` (if not, `node scripts/notion-allow.mjs <ids>`). Commit prefix `allowlist:`.
3. Adopt the project's existing rows so the harness may update them: query each shared database with `"Project" = ?`, then `node scripts/notion-allow.mjs <ids>`.

## 6. Granola and LinkedIn

- **Granola:** `get_account_info` (account, active workspace). If the workspace is not the one where the user records calls, say so; never call `switch_workspace` or `sign_out`. `search_meetings` with `attended_only: true` over 14 days, then `get_meeting_transcript` on one meeting: report whether transcripts work. Offer to process past discovery calls now (skill `call`).
- **LinkedIn network** (skill `network`): explain the export once:
  1. linkedin.com → Me → Settings & Privacy → Data privacy → Get a copy of your data;
  2. choose "Want something in particular?" → tick **Connections** → Request archive;
  3. the zip arrives by email, usually within 10 to 30 minutes. A first, partial archive can arrive before the full one and has no `Connections.csv`: wait for the second;
  4. leave the zip in `~/Downloads`, then say "import my LinkedIn" → `node scripts/network.mjs import <zip>`.
  If the zip is already there, import it now and show `node scripts/network.mjs stats`.

## 7. Bootstrap the idea

Only if `1-idea/current.md` is still the template. From step 4, draft and show the user, in their language:
- `1-idea/current.md`: the idea in one sentence, for whom (core profile: role, sector, size, region), the problem, the solution, who pays, why now, what we do not know yet;
- 2 to 3 problems (`P1`…): one plain sentence each, who has it, proof so far (`Not dug yet — …` when none);
- 8 to 15 hypotheses (`H1`…) in the dashboard of `1-idea/hypotheses.md`, grouped by question (who has the pain, how strong, how they solve it today, who pays and how much, why now, does the solution work), each with the question to ask, Validated if, Refuted if, status `To test`;
- the skeleton of `3-knowledge/value-chain.md`: the stages from the need to the result for the customer, each with "to learn";
- the first entry of `1-idea/history.md` (v1, date, source: the project page).
Apply the user's edits, then write the files and mirror them (English) in Notion: Idea log (`v1`, `Current`), Problems, Hypotheses, and the `Current idea` page. If the shared databases already hold rows for the project, start from them instead and do not duplicate.

## 8. Finish

1. Replace the placeholders of `CLAUDE.md` (`{{PROJECT}}`, `{{OWNER}}`, `{{IDEA_ONE_LINER}}` = the idea in one sentence with its version and date), adapt `<the problem in plain words>` in `6-templates/linkedin.md` and `email.md` with the user, and rewrite `STATUS.md` (Done, Numbers at zero, Deadlines from `project.json`, To do (owner), Next step).
2. `npm run quota` to initialise the counter; `npm test`.
3. Commit ("Setup <Project>") and push.
4. End with the cheat sheet, in the user's language:
   - "my day": follow-ups, today's calls, unprocessed Granola meetings
   - "process my calls" / "call with X": calls become evidence
   - "find 15 <profile> in <region>": qualified leads with a first message
   - "prep my call with X": one-page brief
   - "I DMed X", "Y replied", "call with Z Thursday": the CRM follows
   - a link: a source becomes knowledge
   - "who do I know at X": your LinkedIn network
   - "review" (every week, before the Friday meeting): numbers, learnings, hypotheses, the Weekly reviews row

## Rules

- Never read or print `.env`. Never edit a Notion schema. Never send anything.
- Re-running setup changes nothing that is already done; it reports what is.
