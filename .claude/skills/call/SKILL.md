---
name: call
description: Use when the user says "call with X", "I had X", "process my calls", pastes a transcript or call notes, or « call avec X », « j'ai eu X », « traite mes calls », « voici la transcription ». Gets the transcript from Granola if not pasted, writes the call file in 2-calls/, updates the shared CRM (Discovery – Contacts) and the hypotheses and problems, feeds 3-knowledge/, proposes the follow-up and the intros to add.
---

# Call: turn a call into evidence

## Input
A pasted transcript, or only the person's name ("call with X"), or "process my calls". The user may add a comment.

## 0. Get the transcript from Granola (if not pasted)
Granola tools are `mcp__claude_ai_Granola__*` or `mcp__granola__*`; load them with ToolSearch ("granola"). If absent, ask the user to paste the transcript.
1. `search_meetings` with `attended_only: true`: find the meeting by participant, title keywords or date. Default: the latest one with that person. A shared workspace can contain colleagues' meetings: never process a meeting the user did not attend.
2. Already processed? `grep -l "granola_id: <id>" 2-calls/`. If found, say so and stop.
3. `get_meeting_transcript` with `include_timestamps: true`: raw transcript, timestamped, in pages of 40,000 characters (follow `next_offset` to the end). "Microphone" is the user; "System audio" is the other side. For an exact quote, `search_transcripts` with `meeting_ids`. If transcripts are unavailable, `get_meetings` gives the notes and summary: the file then has `source: notes`, and quotes are allowed only if they come from Granola's text.
4. **Older calls, or a whole backlog** (first import, "I have 10 old calls"): use the `import` skill, which lists them for validation first.
   **"Process my calls":** `search_meetings` (`attended_only: true`, `from_date` = 14 days ago), keep the meetings not yet in `2-calls/` (by `granola_id`). Show the list, then process each with the steps below. Internal meetings (Hexa team, partner) get `type: internal` and stay out of the CRM; still write their file.
5. **Limits:** Hexa's paid Granola plan gives transcripts and the full history; on a free plan only the last 30 days and some tools work. Granola only reads the active workspace (`get_account_info`). Never call `switch_workspace` or `sign_out`.

If the recording announcement does not appear in the transcript, ask the user whether they made it (`consent` field).

## Steps
1. **Find the person in the CRM** (`docs/notion.md`): search Discovery – Contacts by name and company, across all projects. If the row belongs to another project, tell the user who owns it, and create a row in ours only if the call was ours. If there is no row, create it (`Project` = ours, `Stage = Call done`, `allow_async: false`). A row created by hand must be adopted first: `node scripts/notion-allow.mjs <id>`.
2. **Write the call file** `2-calls/YYYY-MM-DD-first-last.md`, in `project.json` `language` (the repo is private: exact quotes allowed). Format:

```markdown
---
person: "First Last"
company: "…"
role: "…"
type: target-user | supplier | expert | investor | founder | internal | other
date: YYYY-MM-DD
duration: "35 min"
source: granola | notes | notion-notes   # notes: no timestamps, write [not timestamped]
granola_id: ""               # Granola meeting id, so a call is never processed twice
consent: yes | no | unknown
crm: <Notion page id>
hypotheses: [H1, H9]
introduced_by: "…"           # empty otherwise
---

# Call with First Last (Company), DD Month YYYY

## In short
3 lines: who, what they do, what we keep.

## Organisation profile
Sector, size, geography, what it buys or makes, customers, type. Used to segment.

## A-player?
Yes or no, with one line: role, track record, what they know first-hand (`rules/rules.md`).

## What we learned
- Learning. "Exact quote" [00:12:34]

## What changes our view
Surprises, what contradicts the idea or a hypothesis. Facts on one side, intuitions (labelled) on the other.

## Hypotheses touched
| Code | Direction (for, against, nuance) | Evidence (quote + timestamp) |

## Numbers quoted
As said, with timestamp. Any calculation is marked [calc].

## Follow-ups
- Intros promised (name, company, role) → CRM
- Documents or examples promised
- Next action and date

## Questions for the next call
3 questions this call opened.

## Transcript
The full Granola text, as is.
```

3. **Update the CRM row** (English). Map the file's `type` to the Contacts `Type` option: target-user → `Target user`, supplier → `Supplier`, expert → `Expert`, investor → `Investor`, founder → `Founder`, other → `Other`; an `internal` meeting gets no CRM row. Any other value is refused by the guard.
   - `Stage = Call done`, `Call date`;
   - `Key learning`: one sentence;
   - `A-player` and `Why A-player` (one line);
   - `Call notes`: add `YYYY-MM-DD · granola:<id> · 2-calls/<file>.md · one-line summary`, keeping earlier lines;
   - `Granola transcript` = `https://notes.granola.ai/d/<granola_id>` (empty if not recorded);
   - `Introduced us to someone` if an intro was offered or made; `Potential founder` if the user says so (reason in Notes); `Sent to pipeline` only for an LOI, a pilot or a prepayment;
   - `Next action` and its date (default: next working day);
   - append to the row's page body (never replace it): `## Call — YYYY-MM-DD` with In short, the 5 main learnings (short quotes only, with timestamps), follow-ups, and the path of the call file. **Never the full transcript** in Notion: the whole Hexa team reads it.
4. **Intros.** Only intros offered or promised, not every company mentioned. One CRM row each: `Channel = Intro`, `Introduced by`, `Stage = Target` (if no name yet, the company as Name and "to check" in Notes). If relevance is weak, ask the user. Offer to enrich them with `find`.
5. **Value chain.** Complete `3-knowledge/value-chain.md` for the stage(s) the call lights up: vocabulary, pains, what AI changes and its maturity, with the source (file and timestamp). **Append, never rewrite:** targeted edits or a new section; never rewrite `value-chain.md`, `1-idea/hypotheses.md` or a theme file whole. `npm test` checks it.
6. **Knowledge.** One line per solid learning in the right theme file of `3-knowledge/`, format of the `add` skill, with the call file and timestamp as source. Before writing, look for lines saying the same thing and merge (add the source).
7. **Hypotheses and problems.**
   - In `1-idea/hypotheses.md`, add the evidence in the For or Against column, with the quote and the link.
   - Mirror in Notion (English): the hypothesis row's `Evidence so far` gets `YYYY-MM-DD · <Name> (<type>, <Company>) — fact [timestamp] (for | against | nuance)`, and `Updated`. A problem confirmed or contradicted gets a line in `Proof` of the Problems row (keep `Still missing —` last).
   - A target-user or supplier call is evidence; an expert or investor call is an opinion, labelled "expert opinion".
   - Never change a status here: that is `review`, with the owner's approval. A new hypothesis the call opens is proposed (code, sentence, validated if, refuted if) and written only after a yes.
8. **Follow-up.** No thank-you message, and no "thank" as next action. Only if the call left something useful (an intro, a document, an open question, a visit): draft a short message asking for it, on the channel agreed in the call (else the first contact's), per `6-templates/writing.md`. The user sends it.
9. **Index and commit.** Add the line to `2-calls/README.md`. Commit and push: "Call with <First Last>".

## Answer to the user
- The 3 key learnings.
- What moves on the idea, the hypotheses and the problems.
- The intros to contact.
- The follow-up message, if there is a useful follow-up (never a thank-you).
- The next dated action and the Notion links that changed.

## Rules
- Exact quotes with timestamps. Nothing invented.
- Emails and phones only in the CRM `Email` / `Phone` properties.
- Consent: `rules/rules.md`.
