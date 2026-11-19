---
name: prep
description: Use before a call, when the user says they will call someone - "I'm calling X", "prep my call with X", "brief for tomorrow's call", « je vais appeler X », « prépare mon call avec X », « brief pour X ». Produces a one-page brief (who, what to learn, 8 Mom Test questions, call flow) and sets the CRM row to Call booked when a date is given.
---

# Prep: the brief of a call

## Input
The person's name, and the call date if given.

## Steps
1. **Gather:**
   - the CRM row and its page body (earlier calls), and other projects' rows for the same person or company (what colleagues learned);
   - past calls with the person or the company (`2-calls/`);
   - what `3-knowledge/` says about this profile;
   - the open questions of `1-idea/current.md` and the hypotheses `To test` / `Testing` of `1-idea/hypotheses.md`, those with `Next week` first;
   - the LinkedIn network (`node scripts/network.mjs search "<company>"`): who the user already knows there, or at its customers and suppliers, to name a common contact or ask for an intro at the end.
   If useful and within budget, one quick Exa search (current role, recent posts, company news).
2. **Pick what to learn.** 3 goals at most, tied to the least-tested hypotheses for this profile. The closing question that opens intros: "Who else should I talk to?"
3. **Write 8 Mom Test questions:**
   - about specific past facts ("the last time you…"), never an opinion on our idea, never "would you pay for…";
   - open questions, each with one follow-up probe;
   - at least one "show me" (a quote, a planning, a contract, a tool, an example);
   - one that quantifies the pain (time, money, frequency);
   - one per hypothesis to test, taken from its "question to ask" column in `1-idea/hypotheses.md`.
   Generic bank to adapt:
   - "Walk me through the last time <problem> happened. What did you do?"
   - "What did it cost you: time, money, a customer?"
   - "How do you handle it today? Which tools, which people, which budget?"
   - "What have you already tried to fix it? Why did you stop?"
   - "Who else is involved when it happens? Who decides? Who pays?"
   - "How often does it happen? When was the last time?"
   - "If it disappeared tomorrow, what would change for you?"
   - "Can you show me <the document, the tool, the spreadsheet>?"
   A pitch or a demo comes only at the very end, after the questions, and only to ask for a commitment (pilot, LOI, data, an intro).
4. **The brief goes in the chat** (one page), in the user's language (English for an English-speaking contact if the user prefers):
   - who they are, in 3 lines, with sources (unsourced = "to check");
   - what we want to learn;
   - the 8 questions;
   - 2 mistakes to avoid on this call (pitching too early, a closed question…);
   - the Lean Discovery flow (`docs/method.md`): icebreaker and structure announced; open questions; "show me"; several layers of "why" on each pain; at the end, "who else should I call?". Expert posture: bring a tip or what we learned from others;
   - the stage of `3-knowledge/value-chain.md` this call should light up, and what is still "to learn" there;
   - if it is a likely A-player or a key call, suggest inviting the partner (`project.json`);
   - the consent line: "I take notes with a tool that records, is that OK with you?"
   No file unless the user asks; the call file is created by `call`.
5. **CRM**, only if a date is given: `Stage = Call booked`, `Call date`, `Next action` "Call" on that date.

## Rules
- Never a pitch inside the questions.
- Nothing invented about the person: what is not sourced is marked "to check".
- No commit needed unless a file changes.
