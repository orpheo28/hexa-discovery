---
name: calendar
description: Use when the user wants to put, move, check or list calls in their Google Calendar - "add it to my calendar", "book the call with X on Thursday at 3pm", "what calls do I have?", "move X", « ajoute dans mon agenda », « cale le call avec X jeudi 15 h », « qu'est-ce que j'ai comme calls ? », « décale X ». Opens Google Calendar on a pre-filled event (the user saves it), checks conflicts and that the event exists through Granola, and keeps the CRM up to date.
---

# Calendar: calls in Google Calendar

The Google Calendar connector is **denied** in the harness (`.claude/settings.json`) and rule 4 says you send nothing. So you never write to the calendar yourself: you open Google Calendar on a pre-filled event, and the user checks it and clicks Save. Granola **reads** the calendar (meetings of the next 14 days): use it to see conflicts and check that the event exists.

## Input
A person (or a company), a date and a time ("3:30pm", "Thursday 10am"), sometimes a duration, a channel (video, phone) or "invite them". Often the contact's reply pasted as is ("yes, 3:30 works").

## Book a call
1. **The date.** System date, `project.json` `timezone` (default Europe/Paris). A relative date ("Thursday", "tomorrow") is computed and repeated to the user in full. Default duration: 30 min.
2. **Conflicts.** Granola `search_meetings` with no keywords, `from_date` and `to_date` on the day of the call: its `upcoming_meetings` lists what is already planned. If a meeting overlaps, say so and offer another time (with the message to propose it to the contact, skill `write`).
3. **The CRM.** Find the person in Discovery – Contacts (`docs/notion.md`) and apply `crm`: Stage `Call booked`, `Call date` with the time (`is_datetime` 1), `Next action` "Call at HH:MM" on that date. A phone or email given in the message goes to the CRM `Phone` or `Email`, **never** to the repo or the event title.
4. **The event.**
   ```
   node scripts/calendar.mjs --title "Call <First Last> (<Company>)" --start YYYY-MM-DDTHH:MM [--minutes 30] \
     --details "<channel>. Brief: <Notion link of the person's row>" [--location "Phone" | "<video link>"]
   ```
   - Not on a Mac (cloud session, phone): the script prints the link instead of opening it. Give it to the user to tap. It stays in the answer, never in a file.
   - Title "Call <First Last> (<Company>)": Granola takes this title, and `call` finds the meeting by name.
   - Details: the channel and the Notion link of the brief, **not** the phone number.
   - `--invite <email>` only if the user asks: the email comes from the CRM, and Google sends the invitation only if the user saves and confirms.
5. **Check.** After the user confirms, run `search_meetings` on that day again: the event must be in `upcoming_meetings`. If not, say so.
6. **The brief.** Offer `prep` if the call has no brief yet.

## List the calls ("what do I have?")
`search_meetings` (`attended_only: true`, today to +14 days). Keep the discovery calls (titles "Call …", people in the CRM), set the internal meetings aside. Cross with the CRM (`Call booked`, `Call date`) and flag:
- a call in the calendar but not in the CRM (set it to `Call booked`);
- a call in the CRM without a calendar event (offer to book it);
- a call without a brief (offer `prep`);
- overlaps.

## Move or cancel
You cannot change an event. Open the day view (`https://calendar.google.com/calendar/r/day/YYYY/M/D`; on a Mac `open "<url>"`, elsewhere give the link) for the user to move it, update the CRM (`Call date`, `Next action`) and draft the message announcing the new slot (`write`).

## Answer to the user
One line: the event opened (title, day, time, duration), what to do (check the account at the top right, Save), conflicts if any, the CRM update, and the message to send the contact if there is one.

## Rules
- You save and send nothing: the user clicks.
- Emails and phones only in the CRM (rule 3); the event link is never written to the repo.
- No commit: nothing changes in the repo, except an allowlist line when the CRM creates or adopts a row (commit "allowlist: …").
- To plug the real Google Calendar connector, the owner removes `mcp__claude_ai_Google_Calendar__*` from the deny list of `.claude/settings.json`: their decision, not yours.
