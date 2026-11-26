---
name: crm
description: Use when the user says where they stand with contacts or asks who to follow up - "I DMed X", "Y replied", "call with Z on Thursday", "W not interested", "who do I follow up", "my day", "how many", « j'ai DM X », « Y a répondu », « call avec Z jeudi », « W pas intéressé », « qui relancer », « ma journée », « combien ». Updates the shared CRM (Discovery – Contacts) for our project.
---

# CRM: keep the funnel true

The CRM is the shared **Discovery – Contacts** database (`docs/notion.md`). Every query filters on `"Project" = ?` (our project from `project.json`); every row we create carries it. Notion content in English.

## Input
Free sentences, often several people at once.

## Steps
1. **Find each person** by name, then by company. Two matches: ask which one. A match in another project: tell the user who owns it. No match: create the row (`allow_async: false`). A row created by hand must be adopted before any update: `node scripts/notion-allow.mjs <id>`.
2. **Apply the event:**

| The user says | Stage | Dates and fields |
| --- | --- | --- |
| "I sent a DM / an email to X" | Contacted | `Contacted on` = today; `Channel`; `Next action` "Follow up" at +5 working days |
| "I followed up X" | Contacted (unchanged) | Notes: "followed up YYYY-MM-DD"; `Next action` "Close if no reply" at +7 working days |
| "X replied" | Replied | `Replied on`; `Next action` "Book the call" tomorrow |
| "call with X on Thursday" | Call booked | `Call date`; `Next action` "Call" on that date |
| "I had X on a call" without transcript | Call done | `Call date`; ask for the transcript or run `call` with Granola |
| "X not interested / no answer" | Not for us | Notes: the reason; "do not contact" if they asked |
| "get back to X in 2 months" | unchanged | `Next action` and its date |

3. **No date given:** today (system date, Paris time). A relative date ("Thursday"): compute it and repeat it to the user.
4. **Never move a stage backwards** unless the user says so.

## "Who do I follow up?" and "My day"
SQL on Contacts for our project, then a short list:
- follow-ups due: `"date:Next action date:start" <= today` and Stage not in (Call done, Not for us);
- today's calls: `"date:Call date:start" = today` and Stage = Call booked → offer `prep`; with Granola, also today's `upcoming_meetings` titled "Call …" that are not `Call booked` in the CRM (offer to update it);
- `Replied` rows without a call date;
- if Granola is connected: the user's meetings of the last 7 days (`search_meetings`, `attended_only: true`) not yet in `2-calls/` (by `granola_id`) → "shall I process them?" (`call`).
For each follow-up, the message ready to copy, written as the `write` skill does (template, rules of `6-templates/writing.md`, the follow-up brings something new, checked with `node scripts/message.mjs`). A message for anyone else ("write to X", "reply to Y") is the `write` skill; a call to put in the calendar is `calendar`.
If nothing is due, say it in one line, then flag what blocks outreach: `Target` rows without `Personal line`, `Channel` or `LinkedIn`.

## "How many?"
`SELECT "Stage", COUNT(*) … WHERE "Project" = ? GROUP BY "Stage"`, then the same count by Type, Country, Channel and Priority.
- Reply rate = (Replied + Call booked + Call done) / (Contacted + the previous); "n/a" with no message sent.
- Calls done vs `targets.calls`, A-players vs `targets.a_players`, this week's calls (`Call date` since Monday) vs `targets.calls_per_week`.
- On request, the same totals for every project, side by side.

## Answer
One line per person updated (name, old → new stage, next action). Then today's numbers: messages sent, replies, calls booked.

## Rules
- Emails and phones only in the CRM.
- No commit needed unless a repo file changes (then commit and push).
