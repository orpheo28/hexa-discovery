# Proposed changes to Discovery tracking (for its owner)

The harness works with the 5 databases as they are today. These changes would make the board more complete. Nothing is applied: the schema contract belongs to the page's owner, and the harness never edits a schema.

## Needed

1. **Add every project to `Project` in all 5 databases**, including Contacts, as soon as it enters discovery: rows without a valid Project are ignored by the board.

## Useful (v2)

3. **Discovery – Calls** (one row per call): Name, Project, Contact (relation to Contacts), Call date, Type, A-player, Granola id, Granola link, Hypotheses touched, Key learning. Today a call is a section in the contact's page body and a line in `Call notes`: that is enough to count calls per person, but not to count two calls with the same person, or to show calls on a timeline.
4. **Discovery – Learnings** (one row per learning): Learning, Project, Theme, Strength (fact, opinion, number), Sources, Date. Today learnings are lines in each project's knowledge page; a database would let the board show cross-project learnings (for example, defense buyers seen by two different projects).
5. **Contacts `Owner`** (person): useful once two people work on the same project.

When one of these exists, add its identifiers to `docs/notion.md`, to the shared sets of `scripts/hooks/notion-guard.mjs` and to `rules/notion-allowlist.json`, then update the `call` or `add` skill and `docs/notion-workspace.md`.

## Cross-project overview (for the Discovery tracking page)

6. **One "All discoveries" section on the Discovery tracking page**, built the same way as each project's workspace (`docs/notion-workspace.md`) but without the Project filter and grouped by Project: weekly reviews by project (latest first), a funnel chart stacked by project (`GROUP BY "Stage"; CHART column STACK BY "Project"`), A-players by project, hypotheses board grouped by Project. It is the studio's page: the harness does not write there; he can add these linked views by hand, or allow the harness to do it once.
