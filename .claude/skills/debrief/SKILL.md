---
name: debrief
description: Use when the user asks for the write-up of one or more calls for the team - "debrief for the channel", "Slack recap of my call with X", "write the debriefs of the week", "the debriefs not posted yet", « compte rendu Granola Slack », « debrief pour le channel », « fais le message Slack du call avec X », « les debriefs de la semaine ». Writes, in English and in a fixed format, the message to post in the project's team channel, from the call files and Granola. The user posts it.
---

# Debrief: the calls, written up for the team channel

Partners want each discovery call written up in the project's channel (`project.json` `team_channel`; ask once and store it if empty). Slack is not connected to the harness: you draft, the user posts. The posted debriefs are kept in `docs/debriefs.md`: it is the reference for tone, length and numbering.

## Input
One or more names ("Jane", "Jane and Tom"), a period ("this week's calls", "the ones not posted"), or nothing: then every discovery call that has a file in `2-calls/` and is not yet in `docs/debriefs.md`.

## Steps
1. **Which calls.** List the files of `2-calls/` missing from `docs/debriefs.md` (by name and date). Leave out internal meetings (`type: internal`). A call that happened without a file: run `call` first. A debrief is written from the call file, never from memory.
2. **The material.** For each call: the YAML header (person, company, date, `granola_id`), In short, What we learned, What changes our view, and the CRM `A-player` box. When a sentence is in doubt, check it in Granola (`search_transcripts` with `meeting_ids`): a Granola summary can credit the user with what someone else did, or the reverse.
3. **Numbering.** It continues `docs/debriefs.md` (last number + 1), in the chronological order of the calls.
4. **Each block**, in English, exactly:
   ```
   <N>. <First Last>, <Company> · <D Mon> · <https://notes.granola.ai/d/<granola_id>|Granola>[ · :star: A-player]
   <One line: who they are, their role, what they know first-hand.>
   • <learning 1>
   • <learning 2>
   • <learning 3>
   [• <learning 4 or 5, only if they matter>]
   → <what it means for the idea, in one sentence>
   ```
   - Link: Slack syntax `<url|Granola>`. Not recorded: "no recording" or "phone" instead of the link.
   - `:star: A-player` only if the CRM box is ticked.
   - 3 to 5 bullets, one idea each, with the numbers and names ("a line stop costs €20k a minute", "30 suppliers consulted").
   - Quotes: only a few words in quotation marks, translated if needed, never a whole sentence.
   - The arrow says what the call changes for the idea (for or against), with no internal jargon: no hypothesis codes, no version numbers ("the idea", "the pricing", "the buyer").
   - An expert opinion on a neighbouring model: say it in the profile line ("analogous model: home repairs").
5. **The message.** The blocks one after the other, no title, no conclusion, in a code block ready to paste. Above 5 blocks, split into messages of 5 (Slack truncates long messages).
6. **After posting.** When the user says they posted it (or pastes the posted text, maybe corrected), append it to `docs/debriefs.md` with the posting date, exactly as posted. Commit and push: "Debriefs: <names>".

## Answer to the user
One line naming the audience ("Written for: the <team_channel> channel"), the message in a code block, then one line on the calls left out and why (no file, internal).

## Rules
- Nothing invented: every bullet comes from the call file.
- No email, phone or opinion about the person; nothing a contact asked to keep confidential.
- No "next steps" in a debrief: follow-ups stay in the CRM.
- You post nothing: the user does.
