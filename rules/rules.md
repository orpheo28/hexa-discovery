# Rules of the harness

These rules apply to every skill and every client. Changing them needs the owner's review.

## 1. Nothing invented
- No invented number, name, quote, email, job title or LinkedIn URL. Missing data stays empty and is flagged.
- Every learning in `3-knowledge/` and every piece of evidence in `1-idea/hypotheses.md` cites its source: the call file (with timestamp), the source file or the research file.
- Facts and intuitions stay separate. An intuition is labelled "Intuition".
- A quote is exact, copied as said. An obvious transcription typo may be fixed, and flagged.
- One source never becomes a generality: write "one buyer says…", not "buyers…".

## 2. Recording consent
- Granola records. At the start of every call the owner says: "I'm taking notes with a tool that records, is that OK with you?" (FR: « Je prends des notes avec un outil qui enregistre, ça te va ? »). Recording someone without telling them is a legal problem, whatever the notes are for.
- The call file field `consent` is `yes`, `no` or `unknown` (a trace, not a filter).
- If someone refuses: no transcript; the file is written from the owner's notes, without quotes.
- Call material stays in the private repo (full transcripts allowed in `2-calls/`). In the shared Notion, read by the whole Hexa team: summaries and short quotes only, never a full transcript.
- Nothing from a call is published or shared outside Hexa without the person's consent.

## 3. Personal data (GDPR)
- Emails and phone numbers live only in the Contacts `Email` and `Phone` properties. Never in the repo, never in a page body, never in `5-research/`.
- A contacted person's name, role and LinkedIn URL may appear in the repo.
- B2B outreach is tied to the person's role. If someone asks not to be contacted: `Not for us`, with "do not contact" in Notes.
- The LinkedIn network file (`data/linkedin/`) never leaves the owner's machine and is never committed.

## 4. Sending
- The harness sends nothing: no email, no LinkedIn message. It drafts; the owner sends by hand.
- Messages follow `6-templates/` and one personal line per person. Changing a template needs the owner's approval.
- Pace (owner can adjust): 15–25 LinkedIn requests and 15 emails a day at most; one follow-up per person.
- Before an email, the address is given by the person, or published on a public page and checked (Hunter `valid`, or `scripts/lib/email-check.mjs` `usable: true`). Never a guessed pattern.
- No LinkedIn automation, no scraping behind a login.

## 5. Notion
- Writes only to: rows of our `Project` in the shared Discovery tracking databases, and our workspace page and its children. Enforced by `scripts/hooks/notion-guard.mjs` and `rules/notion-allowlist.json`.
- Everything else in the Hexa Notion is read only. If something must be written there, propose the text to the owner, who pastes it.
- Never change a schema, a select option or a view of a shared database (the board reads them by exact name).
- Never delete: mark and explain in Notes.

## 6. Budget: €0
- Exa and Firecrawl free tiers, counted in `data/usage.json` (`npm run quota`); calls stop at `budget.stop_at` of the monthly limit (`project.json`), enforced by `scripts/hooks/budget-guard.mjs`.
- Alexandria (only when the Firecrawl connector exists): Apollo `people/search` (0 credits) first; Hunter `people/email-find` (10 credits, only if found) only for people the owner will really email; never `people/match` or `people/info` (30 credits) without the owner's approval.
- No spending, no subscription, no purchase.

## 7. Secrets
API keys live in `.env`. Never read, printed or committed.

## 8. Idea and hypotheses
- The idea changes only with the owner's approval. The harness proposes a change in the review, with evidence for and against.
- A hypothesis changes status (To test, Testing, Validated, Refuted) only on cited evidence, with the owner's approval.
- Evidence weight: a call with someone who has the problem or pays is evidence; an expert or investor call is an opinion ("expert opinion"); a third-party source is field listening and never changes a status alone.
- Every new idea version goes to `1-idea/history.md` (date, what changes, why, evidence) and to the shared Idea log.

## 9. Method
`docs/method.md` (Hexa Lean Discovery): sprint, success criteria, A-players, value chain first, Mom Test calls, weekly reporting.

## 10. Writing files
- Append, never rewrite: `3-knowledge/`, `1-idea/hypotheses.md` and `3-knowledge/value-chain.md` are edited with targeted changes or new sections, never rewritten whole. `npm test` checks it.
- File names: lowercase, no accents, hyphens (`2026-11-19-jane-doe.md`).
- Every file in `2-calls/`, `4-sources/` and `5-research/` starts with a YAML header (format in the skill).
- One commit per logical change, short message, pushed at the end of each command.
