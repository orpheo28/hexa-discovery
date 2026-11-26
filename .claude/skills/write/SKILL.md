---
name: write
description: Use when the user wants a message for one or a few named people - "write a DM to X", "the best possible message to Y", "make this better: <draft>", "follow up X", "reply to X: <their message>", "ask X for the intro they promised", "email to Z", « écris un DM à X », « le meilleur message possible à Y », « fais mieux : <brouillon> », « relance X », « réponds à X : <son message> », « demande à X l'intro promise », « mail à Z ». Writes the first message, the follow-up, the reply or the after-call message, on LinkedIn or by email, in the person's language, checks length and AI tells, then updates the CRM when the user says it is sent. The user sends it.
---

# Write: the right message for one person

Lead lists and their first messages stay in `find`; the follow-ups due today stay in `crm` ("my day"). `write` covers everything else: a message for a named person, from the first contact to what follows a call. You draft; the user sends by hand (rule 4).

## Input
- A name, often with their LinkedIn profile pasted ("Jane Doe · 1st / Head of Operations @ Acme…"), sometimes several names.
- The kind of message, said or to infer: first message, follow-up, reply to a message received (pasted), after-call message (promised intro, document, open question), intro request to a connection, a meeting proposal (coffee, video, slot).
- Sometimes the user's own draft ("make this better: …"): keep their voice and intent, fix the rest.
- Sometimes a constraint: "also offer a coffee", "in English", "short".

## Steps
1. **The person in the CRM.** Find their row in Discovery – Contacts (`docs/notion.md`, `"Project" = ?`) by Name, then Company. Read Stage, Type, Country, Channel, LinkedIn, Personal line, How found, Introduced by, Contacted on, Notes, Call notes, Next action. No row: create it with the `crm` skill (Stage `Target`, Channel, LinkedIn, How found) from the pasted profile, guessing nothing. Two matches: ask which one. "do not contact" in Notes: write nothing and say so.
2. **The network.** `node scripts/network.mjs search "<name>"`, then `"<company>"`: a 1st-degree connection changes the tone (a connection's tone, no 300-character limit); a shared connection can be the intro.
3. **The material, by kind:**
   - **First message:** the strongest credibility (intro > shared connection > the closest Hexa company, `6-templates/writing.md`), the mission in their words, the hook from `Personal line` (true and sourced), a dated ask.
   - **Follow-up:** something new that gives a reason to answer (writing.md rule 7): a sharper question from the dashboard of `1-idea/hypotheses.md`, or what someone else in their field told us (`3-knowledge/`, `2-calls/`), without naming them unless allowed. One follow-up only, 5 working days after the first message.
   - **After a call:** read the Follow-ups section of the call file in `2-calls/`. Ask for the promised thing, precisely (the name, the document, the date). Never a thank-you, alone or as an opener.
   - **Reply to a message received:** answer what they wrote, then one ask. If it is a yes to a call, offer a precise slot (check the user's calendar with Granola `search_meetings`, its `upcoming_meetings`), then chain to `calendar` once the time is set.
   - **Intro request:** the target's name, role and company, why this person, and one sentence they can forward as is.
4. **Channel and template.** The CRM `Channel`, else the channel of the last exchange. LinkedIn: `6-templates/linkedin.md` (a connection note if not connected yet, a message otherwise). Email: `6-templates/email.md`, only to an `Email verified` address of the CRM (subject included; keep the "no thanks" line in a first cold email). The person's language: English for a US or non-French-speaking contact.
5. **Write** per `6-templates/writing.md`: "Hello {first name},", informal unless the person is clearly much more senior or from a very traditional company, 3 or 4 sentences, one ask with a precise slot ("20 min this Thursday"), a coffee as an option when the user asks. Several people: never two messages where only the first name changes.
6. **Check.** Run every message through the script, with `--note` for a connection note:
   ```
   node scripts/message.mjs [--note] <<'EOF'
   <the message>
   EOF
   ```
   Fix everything it flags (length, em dash, forbidden openers, several asks, unfilled variable). Then the human check of `writing.md`: would the user have written it? Is the credibility the strongest? Is the hook true?
7. **After sending.** When the user says "sent" (« envoyé », « c'est parti »), apply `crm`:
   - first message: Stage `Contacted`, `Contacted on`, `Channel`, `Next action` "Follow up" at +5 working days;
   - follow-up: Stage unchanged, Notes "followed up YYYY-MM-DD", `Next action` "Close if no reply" at +7 working days;
   - after-call message or intro request: Stage unchanged, `Next action` "Wait for <the thing asked>" at +5 working days;
   - reply: per what they answered (`Replied`, `Call booked`).
   Never move a stage backwards.

## Answer to the user
For each person:
- one line "Written for: <First Last>, <role> (<channel>, <language>)";
- the message in a code block, ready to copy (and the subject for an email);
- the character count for a LinkedIn note;
- one line on a choice, only when it is not obvious (the anchor, the hook, why no note).

For "make this better", say in one line what changed. One message, the best one; no variants unless asked.

## Rules
- Nothing invented: no experience, shared contact or number that was not checked. An unsourced hook stays out.
- You send nothing (rule 4). No LinkedIn automation.
- Emails and phones only in the CRM. A number given in a message received goes to the `Phone` property, never to the repo or into a message.
- No thank-you after a call.
- No commit: nothing changes in the repo, except an allowlist line when a CRM row is created or adopted (commit "allowlist: …").
