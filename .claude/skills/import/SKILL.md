---
name: import
description: Use during setup, or when the user says "import my calls", "import my old calls", "get all my Granola calls", "sync my Notion", "re-import", « importe mes calls », « récupère tous mes calls Granola », « importe mon Notion », « récupère ce que j'ai déjà fait », « il manque des calls ». Finds every Granola meeting and every Notion page linked to the discovery, asks the user to validate the lists (right calls? missing ones?), extracts calls, contacts and knowledge, asks the user to validate what was understood, then writes the repo, the CRM, the shared tracking databases and the Notion workspace. Idempotent and resumable.
---

# Import: bring everything the discovery already has

Goal: after this skill, the repo and Notion hold every call, contact and piece of knowledge the user already has, and the user has confirmed it is right. Nothing is written before the user validates. Progress is tracked in `docs/onboarding.md` so the skill can stop and resume.

Talk in the user's language, in short steps. Show lists as numbered tables so the user can answer "ok except 3 and 7, and add my call with Jane on the 12th".

## 0. Prepare

1. Read `project.json` (project, owner, sprint start), `1-idea/current.md`, `1-idea/hypotheses.md`, `3-knowledge/README.md`, `2-calls/README.md` and `docs/onboarding.md` (the tracker; its steps 6a–6f are this skill). Skip what is already done there.
2. Build the **discovery vocabulary** from the project's Notion page (title, idea paper, problem, target, competitors): the project name, 10 to 20 domain keywords in the languages the user works in (for a discovery on dental clinics, for example: "cabinet dentaire", "dental practice", "logiciel de gestion", "practice management"), target roles, target companies and people already named in Notion. It drives every search below.
3. Pick the **period**: from the earliest of the project page's creation date and 60 days before `sprint.start` (discovery often starts before the sprint) to today. Hexa's paid Granola plan sees the whole history and gives every transcript; on a free plan only the last 30 days are visible: say so if older meetings are missing.

## 1. Inventory: Granola

Granola tools: `mcp__claude_ai_Granola__*` or `mcp__granola__*` (ToolSearch "granola"). Never `switch_workspace` or `sign_out`.

1. `get_account_info`: account and active workspace. If the user records discovery calls in another workspace, ask them to switch it in the Granola app, then continue.
2. `list_meeting_folders`: if a folder looks like the discovery (project name, "discovery", the domain), ask once whether it holds all the calls. If yes, `search_meetings` with that `folder_id` is the main source.
3. Collect candidates. A shared workspace (for example Hexa's) holds colleagues' meetings: never take those.
   - **The user's meetings:** `search_meetings` with `attended_only: true` over the period and no keyword, `limit: 100`, following `next_cursor` to the end. This list is the universe: every candidate must be in it.
   - `search_meetings` with `attended_only: true` and the vocabulary as `keywords` (several entries, they are alternatives), and with `participant` for each person or company already named in Notion.
   - `search_transcripts` with the vocabulary over the period, to catch meetings whose title says nothing. **It has no `attended_only`** and returns colleagues' meetings too: keep a hit only if its `meeting_id` is in the user's list above. Use its matched passages as a relevance signal, not as content.
   Deduplicate by meeting id. Drop meetings already in `2-calls/` (`grep -l "granola_id: <id>" 2-calls/`). Upcoming meetings (`evt_` ids, not ended) are not imported; mention the ones that look like discovery calls ("you have a call with X today: say 'call with X' after it").
4. **Classify** each candidate. First from what `search_meetings` already returns (title, participants and their domains, note headings): this settles most meetings. Only for the unclear ones, `get_meetings` (notes and summary, 10 ids per call). Never transcripts at this stage. Note that participants are sometimes missing (phone calls, imported notes): rely on the title and headings then.
   A meeting about several projects (a team weekly, a partner sync) is 🏠 internal for each project it covers; import only the part about ours.
   - ✅ **discovery call**: an external person, and the topic, the person or the company matches the discovery;
   - 🏠 **internal**: the Hexa partner or team about this project (kick-off, weekly, debrief). Imported as `type: internal`, kept out of the CRM;
   - ❓ **unsure**: external but the link to the discovery is weak, or a group meeting;
   - ❌ **unrelated**: another project, fundraising, recruiting, personal, other Hexa topics.
   For each: date, title, participants (names and companies, no emails), one line on why.

## 2. Inventory: Notion

1. **The project tree.** `notion-fetch` the project page (`project.json` `notion.project_page`), then every child page and every database inside it, recursively (depth 4, 80 pages at most). For each database, list its rows (titles) and say what it looks like (contacts, meetings, competitors, leads).
2. **Elsewhere in Notion.** `notion-search` with the project name and the 5 strongest keywords: pages outside the tree that are about the discovery (weekly updates, meeting notes, partner notes). Keep only pages whose content is about this project.
3. **Notion meeting notes**, if the tool exists: `notion-query-meeting-notes` over the period with the vocabulary: calls recorded in Notion rather than Granola.
4. **The shared databases.** Existing rows of our Project in Contacts, Hypotheses, Problems, Idea log, Weekly reviews (`docs/notion.md`).
5. Classify each page: 💡 **idea** (idea paper, value proposition, product), 🧠 **knowledge** (market, competition, legal, verticals, learnings), 🎙️ **call notes** (one call or several), 👥 **contacts** (lists, campaigns, CRM-like tables), 📋 **admin** (to-dos, links), ❌ **unrelated**.

## 3. Validation 1: is the inventory right?

Show, in this order:

**Granola: N meetings found.**

| # | Date | Title | With (company) | Class | Why |
| --- | --- | --- | --- | --- | --- |

(✅ and 🏠 first, then ❓, then a one-line count of ❌ with "say 'show unrelated' to see them".)

**Notion: N pages found.**

| # | Page | Where | Class | What I will take from it |
| --- | --- | --- | --- | --- |

Then ask three questions in one message:
1. "Are these the right calls? Tell me the numbers to remove, and decide the ❓ ones."
2. "Is a call missing? Give me the name, the company or the date: I'll look for it." Search again by `participant`, keywords or date. A call not in Granola (not recorded, or recorded elsewhere): ask the user to paste the transcript or notes, or to say in a few lines what was learned; it becomes a call file with `source: notes`.
3. "Are these the right Notion pages? Anything else I should read (another page, a doc, a Slack thread)? Paste it here: Slack and Google Drive are not connected to the harness."

Apply the answers, update `docs/onboarding.md` (the validated lists with ids), then go on.

## 4. Extraction

Nothing is written to Notion, `2-calls/` or the knowledge files yet. Drafts go to `data/import/` (git-ignored, survives a pause), the review to `docs/onboarding-review.md`.

1. **Calls.** For each validated meeting: `get_meeting_transcript` with `include_timestamps: true`, following `next_offset` to the end (if unavailable, `get_meetings` notes and `source: notes`). Draft the call file in `data/import/` exactly as in the `call` skill (header, In short, organisation profile, A-player proposal, learnings with exact quotes and timestamps, numbers, follow-ups, intros, full transcript), leaving the `hypotheses` field empty for now.
   - More than 6 calls: one subagent per call (Sonnet), in parallel, each writing only its draft file in `data/import/` and returning: person, company, role, type, A-player yes or no with one line, 3 to 5 learnings with timestamps, numbers quoted, intros promised. You do the integration in one pass. Agents without subagents: one call at a time.
2. **Notion pages.** For each validated page: the learnings (one sentence each, labelled fact, opinion or number, with the page URL as source), the idea statements, the hypotheses already written, the people and companies named (names, roles, companies, LinkedIn if present; never copy an email or phone from a page into the repo).
   - Call notes pages become call files with `source: notion-notes` and the page URL in the header.
   - Contact tables become a list of candidate CRM rows, with Stage mapped to the Contacts options (`Target`, `Contacted`, `Replied`, `Call booked`, `Call done`, `Not for us`) and Type to `Target user`, `Supplier`, `Expert`, `Investor`, `Founder` or `Other`. An email found in a Notion page goes into the CRM only if the user confirms the person gave it, or after `email-check` says `usable`; otherwise it stays empty.
3. **Contacts.** Merge people from calls, call notes and contact tables. Dedupe by name and company, and against Contacts across all projects (rule: one person = one row per project; if another project owns a row, say so).

## 5. Synthesis

From the calls (evidence), the Notion pages (the team's thinking) and the project page, draft:
- **The current idea** (`1-idea/current.md` sections), with where each part comes from. If the project page and the calls disagree, say so and propose.
- **2 to 3 problems** (`P1`…), each with who has it and the proof already in the calls (`<Name>, <Company>, YYYY-MM-DD — fact`), last line `Still missing — …`.
- **8 to 15 hypotheses** (`H1`…), grouped by question, each with the question to ask, Validated if, Refuted if, and the evidence already gathered (for and against, with sources). Proposed status: `To test` if no evidence, `Testing` if some. Never `Validated` or `Refuted` at import without the owner's explicit yes. Hypotheses already in the shared database or in Notion pages are kept with their codes.
- **Each call's hypotheses** (codes), to fill the call files' `hypotheses` field and evidence lines.
- **Knowledge lines** per theme of `3-knowledge/`, deduplicated, with `Sources (N)` when several say the same; the **value chain** steps the material lights up; the **10 major learnings**; the **gaps**.
- **Numbers:** calls by type, A-players, contacts by stage.

## 6. Validation 2: is what I understood right?

Write the full review to `docs/onboarding-review.md` (the user can open and edit it), and show a compact version in the chat:

1. **Calls (N):** one line each — person, company, type, A-player ✓/✗, the key learning. "Wrong type, wrong A-player, wrong learning?"
2. **The idea** in 3 lines, and what changed from the project page, if anything.
3. **Problems** with their proof.
4. **Hypotheses** with evidence counts (for / against) and proposed status.
5. **The 10 major learnings**, each with its number of sources.
6. **Contacts to create (N):** by stage. "Create them all, or only some?"
7. **What I did not use**, and why.

Ask: "Is this right? Correct anything: an A-player, a learning, a hypothesis, a call type. Say 'ok' when it's good." Iterate until the user says ok. Their corrections win; never argue with what they lived in the call, but flag when a quote says otherwise.

## 7. Write

In this order, committing as you go (one commit per block, pushed at the end):
1. `2-calls/` files (with hypotheses codes) and `2-calls/README.md`.
2. `3-knowledge/` theme files, `value-chain.md` and `README.md` (10 major learnings, gaps); Notion pages used as sources are cited by title and URL.
3. `1-idea/current.md`, `hypotheses.md` (dashboard and register, one sentence per piece of evidence), `hypotheses-journal.md` (one dated section per imported call with its quotes and timestamps), `history.md` (v1, sources: project page and N calls).
4. Notion, shared databases (English, `Project` = ours, `allow_async: false`): Contacts rows (calls: `Stage = Call done`, `Call date`, `A-player`, `Why A-player`, `Key learning`, `Call notes` line (`YYYY-MM-DD · granola:<id> · 2-calls/<file>.md · summary`), `Granola transcript`, and the call summary in the row's page body; other contacts at their stage), Problems, Hypotheses (with `Evidence so far`), Idea log (`v1`, `Current`). Rows that already exist are adopted (`node scripts/notion-allow.mjs <id>`) and updated, never duplicated.
5. Notion workspace mirror pages (`docs/notion-workspace.md`): Current idea, What we've learnt (the 10 major learnings, the gaps, the themes), IDEA Framework (filled as far as the evidence allows). Update the bold lines at the top of the workspace page.
6. `docs/onboarding.md`: everything checked, with counts. Delete nothing from `docs/onboarding-review.md`: it is the trace of what the user validated.

## 8. Tracker

`docs/onboarding.md` (in the template): steps 6a to 6f are this skill. Tick each one with its counts, list the validated Granola meetings (id, date, title, class) and Notion pages (URL, title, class), and what was left out and why.

## Answer to the user

At the end: what was imported (calls, contacts, learnings, hypotheses), the links to the Notion workspace and the shared views, what is still missing (calls without transcripts, contacts to check), and the 3 best next actions (for example the A-players to call back, the hypothesis with the least evidence, the profiles to find).

## Rules

- Never write before validation 2, except the drafts in `data/import/` and `docs/onboarding-review.md`.
- Only the user's own meetings (`attended_only: true`). Never a colleague's meeting, even in the same workspace.
- Full transcripts only in the private repo; Notion gets summaries and short quotes. Emails and phones only in the Contacts properties.
- A third-party or Notion statement is the team's thinking or field listening, not evidence from a call: label it so.
- Re-running the skill only adds what is new (new meetings, new pages) and asks again only about those.
