# Notion: ids, schemas, how to write

Notion is the source of truth for schemas: if a write fails on a property name, `notion-fetch` the data source and use what it says. The schema of the shared databases belongs to the owner of the Discovery tracking page (schema contract on the Discovery tracking page): never rename a property, never add or change an option, never change a view.

## Shared: 📊 Discovery tracking (Team Hexa / Hexa WTF)

Page: https://app.notion.com/p/41c1cc0bd5bc810f818feb1c9eabc5f0 — the data behind the WTF Discovery Board (Friday discovery meeting). Every row must have `Project` set, or the board ignores it.

| What | Database | Data source |
| --- | --- | --- |
| Discovery – Contacts (the CRM) | `41c1cc0bd5bc8169aa01d9aa1805a4e7` | `collection://41c1cc0b-d5bc-8103-b9c8-000b5b4b9cf7` |
| Discovery – Hypotheses | `41c1cc0bd5bc81adba75db841f75c641` | `collection://41c1cc0b-d5bc-8177-9885-000bd739f62f` |
| Discovery – Problems | `41d1cc0bd5bc814481e5f67c7b806310` | `collection://41d1cc0b-d5bc-8168-a436-000b72b432f5` |
| Discovery – Idea log | `41d1cc0bd5bc81c98906c3af4eed6779` | `collection://41d1cc0b-d5bc-81bd-a473-000be4e0640c` |
| Discovery – Weekly reviews | `41c1cc0bd5bc81b3b1aff9c853fd7880` | `collection://41c1cc0b-d5bc-8111-94de-000bc640c9f9` |
| WTF Projects (read only: find the user's project) | `2b61cc0bd5bc80d69000d0e9662e5a30` | `collection://2b61cc0b-d5bc-80c0-aaeb-000bcf5306df` |
| Lean Discovery (read only: the method) | page `2a71cc0bd5bc80dfb297d1a95044c8c4` | |

## Ours: the workspace page

`🧭 <Project> discovery`, built by `setup` under the project's page in WTF Projects from the common template `docs/notion-workspace.md`: 9 linked views of the shared databases filtered on the project (weekly reviews, funnel, pipeline, next actions, calls, A-players, hypotheses, problems, idea log). Ids in `project.json` (`notion`). It also holds three mirror pages, rewritten by the skills: **Current idea** (mirror of `1-idea/current.md`), **What we've learnt** (mirror of `3-knowledge/README.md`), **IDEA Framework** (mirror of `1-idea/idea-framework.md`). In Notion, repo files are cited as text; only external URLs are links.

## How to write

- Select values must be existing options (cached in `project.json` `notion.options` by setup): an unknown value would silently add an option to the shared schema, so the guard refuses it.

- Create a row: `notion-create-pages`, parent `{"type": "data_source_id", "data_source_id": "<id without collection://>"}`, always `allow_async: false` (the guard records the new id from the response), always `Project`.
- Dates: `date:<Name>:start` (YYYY-MM-DD) and `date:<Name>:is_datetime` (0 or 1). Checkboxes: `__YES__` / `__NO__`.
- SQL: `notion-query-data-sources`, table `"collection://…"`, dates read as `"date:Call date:start"`, always `WHERE "Project" = ?`.
- A row created by hand is not in the allowlist: adopt it with `node scripts/notion-allow.mjs <id>` after a query filtered on our Project, then update it.
- Before creating a contact, search Name and Company across **all** projects: one person = one row per project. If another project already has them, tell the user who owns that row.
- Long content (a call summary) goes in the row's page body with `notion-update-page`, appended as a new section; never replace the body.
- Never delete: mark (`Not for us`, `Dropped`, `Ruled out`) and explain in `Notes`.

## Discovery – Contacts

| Property | Type | Values / format | Board |
| --- | --- | --- | --- |
| Name | title | First Last; the company name if no person is known | |
| Project | select | ours | yes |
| Stage | select | Target, Contacted, Replied, Call booked, Call done, Not for us | yes |
| Contacted on, Replied on, Call date | date | | yes |
| A-player | checkbox | ticked after the call (definition in `docs/method.md`) | yes |
| Why A-player | text | role, what they did themselves, how recently | |
| Introduced us to someone, Potential founder, Sent to pipeline | checkbox | pipeline = LOI, pilot or prepayment lead | yes |
| Company, Role, Region | text | | |
| Type | select | Target user, Supplier, Expert, Investor, Founder, Other | |
| Country | select | France, US, Other | |
| Priority | select | High, Normal, Low | |
| Channel | select | LinkedIn, Gmail, Intro, Other | |
| LinkedIn | url | personal profile | |
| Email, Email verified | email, checkbox | the only place for an email; verified = given by the person, Hunter `valid`, or `email-check` `usable: true` | |
| Phone | phone | the only place for a phone number | |
| How found | text | the dated signal and its URL | |
| Personal line | text | 15 words max, true and sourced | |
| Introduced by | text | | |
| Next action, Next action date | text, date | follow-ups, "to check", "close if no reply" | |
| Key learning | text | one sentence after the call | |
| Call notes | text | one line per call: `YYYY-MM-DD · granola:<id> · 2-calls/<file>.md · summary` | |
| Granola transcript | url | `https://notes.granola.ai/d/<id>` of the latest call | |
| Notes | text | reasons, "to check", cross-project links, "do not contact" | |

Funnel without extra stages: a follow-up keeps `Contacted` and sets `Next action` "Close if no reply"; "to qualify" is `Target` with "to check" in Notes; "later" is any stage with a dated `Next action`.

## Discovery – Hypotheses (mirror of `1-idea/hypotheses.md`)

Hypothesis (title), Project, Code (`H1`…, never reused), Status (To test, Testing, Validated, Refuted), Validated if, Refuted if, Evidence so far (one line per piece: `YYYY-MM-DD · Source — fact (for / against / nuance)`), Next week (checkbox), Updated (date).

## Discovery – Problems

2 to 3 per project. Problem (title), Project, Code (`P1`…), Status (Confirmed, Partly confirmed, To confirm, Ruled out), Who has it, Proof (one line per point `Source — fact`; last line `Still missing — what` or `Not dug yet — what`).

## Discovery – Idea log (mirror of `1-idea/history.md`)

Idea (title, one sentence), Project, Version, Date, Status (Current, Testing, Replaced, Dropped; exactly one Current per project), What changed (and why).

## Discovery – Weekly reviews

One row per project per week, title `<Project> · W<ISO week>`, `Week of` = Monday. Read each property's description in Notion before writing: it is the format. Written for a partner who is not on the project (plain words, one point per line as `Headline — detail`, no overlap between fields).

Checkboxes PV1 · 3 A-players state the pain unprompted; PV2 · Same pain in 5 A-players across 3 companies; PV3 · Pain quantified by 2 of them; PV4 · Already paying to fix it or problem hypotheses validated; SV1 · MVP needed identified; SV2 · Presented to 5 target players with feedback; SV3 · 3 players asked for MVP access now; SV4 · MVP used at least once. Number: Design partners ready to pay. Select: Founder search (Not started, Launched). Text: Problem evidence, Solution evidence, Key learnings, Impact on the idea, Our read (Keep digging, Go, Pivot or Stop — one sentence), Blockers / asks, Next week we test.

Board progress = min(calls / 40, 1) × 50 + 5 per PV ticked + 5 per SV ticked + 2 per design partner (max 10); founder search launched = 100%.

## WTF Projects

`Name` ("ExampleX - AI for something": the Project value is the part before " - "), `Status` (Idea, Founder Search, Started, Exited Studio, Aborted, Non_startup), `Assign` (people). `setup` finds the user's project with `"Assign" LIKE '%<user id>%'`.
