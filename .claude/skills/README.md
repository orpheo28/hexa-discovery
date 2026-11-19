# Skills

The user speaks normally; the agent recognises the intent and follows the matching skill.

| The user says | Skill |
| --- | --- |
| "setup", first use, `project.json` empty | `setup` |
| "call with X", "process my calls", a pasted transcript | `call` |
| "I DMed X", "Y replied", "call with Z Thursday", "my day", "who do I follow up", "how many" | `crm` |
| "find me 20 …", leads, qualify, enrich, emails | `find` |
| "I'm calling X", "prep my call with X" | `prep` |
| a link or a pasted text (article, video, podcast, post, report) | `add` |
| "review", "weekly", "where do we stand", before the Friday meeting | `review` |
| LinkedIn connections, a new export, "who do I know at X" | `network` |

One request can chain several skills: after a call, `call`, then `find` for the intros it opened.
