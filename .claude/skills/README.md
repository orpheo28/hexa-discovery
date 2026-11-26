# Skills

The owner speaks normally, in French or English; the agent recognises the intent and follows the matching skill (`.claude/skills/<name>/SKILL.md`). This index is imported into `CLAUDE.md`: keep it complete (`npm test` checks it).

| Intent | Skill |
| --- | --- |
| First use, "setup", "onboard me", a new machine | `setup` |
| "import my calls", "get all my Granola calls", "sync my Notion", « il manque des calls », « importe ce que j'ai déjà fait » | `import` |
| A pasted transcript, "call with X", "j'ai eu X", "process my calls", "traite mes calls" | `call` (fetches Granola when nothing is pasted) |
| "find me…", "trouve-moi…", leads, qualify, enrich, emails | `find` |
| "I'm calling X", "prépare mon call avec X" | `prep` |
| "I DMed X", "X a répondu", "call with Z Thursday", "who do I follow up", "my day", "ma journée" | `crm` |
| "write to X", "make this better: …", "follow up X", "reply to X", "ask X for the intro", « écris à X », « fais mieux », « relance X » | `write` |
| "add it to my calendar", "book the call with X Thursday 3pm", "what calls do I have?", « cale X jeudi 15 h » | `calendar` |
| "debrief for the channel", "Slack recap of my call with X", « compte rendu pour le channel » | `debrief` |
| A link (article, YouTube, podcast, Spotify, post, report) or pasted text to learn from | `add` |
| "review", "weekly", "bilan", "where do we stand", "où on en est", Friday meeting prep | `review` |
| Pasted LinkedIn connections, "new export", "who do I know at X" | `network` |
| A question about the discovery: "what do we know about pricing?", "who said X?", "what's our evidence for H3?", « qu'est-ce qu'on sait sur… » | no skill: answer from `3-knowledge/`, `2-calls/`, `1-idea/` (and `hypotheses-journal.md`), every point with its source file and timestamp; say what nobody has told us yet |

One request can chain several skills: after a call, `call`, then `find` for the intros it opened, `write` for the follow-up and `debrief` for the team channel.
