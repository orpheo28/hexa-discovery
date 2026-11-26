# Skills

The user speaks normally; the agent recognises the intent and follows the matching skill.

| The user says | Skill |
| --- | --- |
| "setup", first use, `project.json` empty | `setup` |
| "import my calls", "sync my Notion", a missing past call, re-import | `import` (inventory → your validation → extraction → your validation → writing) |
| "call with X", "process my calls", a pasted transcript | `call` |
| "I DMed X", "Y replied", "call with Z Thursday", "my day", "who do I follow up", "how many" | `crm` |
| "find me 20 …", leads, qualify, enrich, emails | `find` |
| "write to X", "make this better: …", "follow up X", "reply to X" | `write` |
| "book the call with X Thursday 3pm", "what calls do I have?" | `calendar` |
| "debrief for the channel", "Slack recap of my call with X" | `debrief` |
| "I'm calling X", "prep my call with X" | `prep` |
| a link or a pasted text (article, video, podcast, post, report) | `add` |
| "review", "weekly", "where do we stand", before the Friday meeting | `review` |
| LinkedIn connections, a new export, "who do I know at X" | `network` |

One request can chain several skills: after a call, `call`, then `find` for the intros it opened, `write` for the follow-up and `debrief` for the team channel.
