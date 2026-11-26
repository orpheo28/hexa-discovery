---
name: review
description: Use when the user asks for a review, a weekly, a status, where we stand, or before the Friday discovery meeting or the weekly WTF update - "review", "weekly", "where are we", "prep Friday", « bilan », « point », « où on en est », « weekly », « prépare vendredi », « le recap ». Gives the funnel numbers, the learnings and the hypotheses, proposes how the idea should evolve with evidence, fills the shared Weekly reviews row, updates STATUS.md, the IDEA Framework near deadlines and the Notion mirrors.
---

# Review: learn and adjust the idea

## Input
A period. Default: since the last review (date in the title of `STATUS.md`), else since `project.json` `sprint.start`.

## Steps
1. **Numbers** from the CRM (Discovery – Contacts, `"Project" = ?`):
   - targets, contacted, replied, reply rate ("n/a" with no message sent);
   - calls booked, calls done this week (`Call date` since Monday), total calls vs `targets.calls`;
   - A-players met (checkbox) vs `targets.a_players` and their share of calls (target 20% or more); founders met (`Type = Founder`), potential founders, intros received, pipeline leads;
   - pace: calls this week vs `targets.calls_per_week`.
   Split by Type, Country, Channel and Priority to see which profiles answer. On request, every project side by side.
2. **Learnings.** Re-read the calls, sources and research of the period.
   - The 5 strongest learnings, each with its sources: how many independent sources say it?
   - Contradictions.
   - What nobody has told us yet (the gaps).
3. **Hypotheses.** For each hypothesis of `1-idea/hypotheses.md` (the dated detail is in `1-idea/hypotheses-journal.md`), count the evidence for and against:
   - target users and suppliers (evidence);
   - expert opinions, counted apart;
   - third-party sources, which stay field listening.
   Propose a status change only when the evidence meets its "Validated if" / "Refuted if", and apply it only with the owner's yes: in the file (dashboard and register) and in the Notion Hypotheses row (`Status`, `Evidence so far`, `Updated`). Propose the 3 hypotheses to tick `Next week`.
   **Problems:** same logic for the Notion Problems rows (`Status`, `Proof`, last line `Still missing — …`).
4. **The idea.** Confront `1-idea/current.md` with the evidence. If the evidence justifies it, propose what we keep, what we change (target, problem, payer, geography, product) and what we test next, each with its evidence. If the owner approves:
   - write the new version in `1-idea/current.md` (the old one goes to `1-idea/versions/`);
   - add the entry to `1-idea/history.md` (date, what changes, why, evidence);
   - log the decision in `docs/decisions.md`;
   - Notion Idea log: the old `Current` row becomes `Replaced`, a new row (`Version`, `Date`, `What changed`, `Status = Current`). A track being explored without a decision is a row with `Status = Testing`; it never replaces the current idea;
   - update the "current idea" line of `CLAUDE.md` and the `Current idea` mirror page.
5. **Sprint deadlines** (`project.json` `sprint`): the draft proposal and the go / no-go. Say where we stand. Within 5 days of a deadline, update `1-idea/idea-framework.md` (and for the draft, a short proposal), mirror it to the `IDEA Framework` page, and give the text ready to paste in the project page if the owner wants it there. Say which round we are in: wide map, or zoom on a segment.
6. **Weekly reviews row** (shared, read by the WTF Discovery Board): one row per project per week, title `<Project> · W<ISO week>`, `Week of` = the Monday. If it exists, update it; never create a second one. Fetch the data source and follow each property's description exactly. Written for a partner who is not on the project: plain words, one point per line, `Headline — detail`, no internal names unless they are a source, no overlap between fields.
   - PV1–PV4 and SV1–SV4: tick only what the evidence supports. Each ticked box has its lines in `Problem evidence` / `Solution evidence` (`PV1 — Source — fact`), each gap a `Still missing` line.
   - `Design partners ready to pay`: companies with a fee or an LOI only. `Founder search`: ask the owner.
   - `Key learnings`, `Impact on the idea` (the idea in force, the tracks tested, undecided proposals), `Our read` (Keep digging, Go, Pivot or Stop — one sentence), `Blockers / asks`, `Next week we test` (1 to 3 tracks, no numbers).
   Show the draft to the owner before writing it.
7. **Next steps.** The 3 profiles to find first (`find`), aimed at the next-week hypotheses; 3 questions to add to the next calls; the follow-ups due; the calls of the week not yet in `docs/debriefs.md` (offer `debrief`).
8. **Update:**
   - `STATUS.md`, 25 lines max, title with the review date, sections Done, Numbers, To do (owner), Next step, and `## Deadlines` only for dates that are not already in `project.json` `sprint` (the session-start hook reads those itself);
   - `3-knowledge/README.md` (the 10 major learnings), then the `What we've learnt` mirror page (cite repo files as text; only external URLs are links);
   - the `Current idea` mirror page if the idea changed;
   - the two bold lines at the top of the workspace page (`docs/notion-workspace.md` §1): idea in force, and this week's "Our read".
9. **WTF async weekly** (on the weekly reporting day, or on request): one KPI line (discovery calls this week and total, A-players met, founders met), then ✅ Achievements, ❌ Lowlight, 🎯 Priority this week, each in short bullets prefixed with the project's emoji. Ready to paste by the owner; the harness does not write in that page.
10. **Commit and push:** "Review <date>".

## Answer to the user
1. The numbers. 2. The 5 learnings. 3. The hypotheses and problems that move. 4. The proposal on the idea, with its evidence. 5. The Weekly reviews draft. 6. Next steps. 7. The WTF weekly block if due.
One page at most, no jargon.

## Rules
- A proposal without cited evidence is not a proposal.
- The idea and statuses change only with the owner's yes.
