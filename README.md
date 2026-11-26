# Hexa discovery harness

**A complete AI harness to run a startup discovery the Hexa way.** You talk to people and send your messages yourself. Your agent does everything else: it finds and qualifies leads, writes each message, keeps your CRM, books your calls in Google Calendar for you to save, pulls your call transcripts from Granola, turns every call and article into sourced knowledge, writes the call debriefs for your team channel, tracks your hypotheses, and fills the shared Notion so the WTF Discovery Board shows every project on the same numbers on Friday.

It is the harness built for a first Hexa discovery in Nov 2026, made generic. One template, one private repo per discovery.

---

## Start here: paste this into your agent

Open **Claude Code** (the Code tab of the Claude desktop app, the `claude` terminal command, Claude Code in VS Code, or an agent in Orca) in an empty folder, and paste:

> Set up a new Hexa discovery for me. Read https://github.com/orpheo28/hexa-discovery, check my tools (git, GitHub CLI logged in, Node 20+), create my private repo from the template (`gh repo create <project>-discovery --private --template orpheo28/hexa-discovery --clone`), then tell me exactly how to open that folder. Do everything you can yourself.

En français :

> Monte-moi une nouvelle discovery Hexa. Lis https://github.com/orpheo28/hexa-discovery, vérifie mes outils (git, GitHub CLI connecté, Node 20+), crée mon dépôt privé à partir du template (`gh repo create <projet>-discovery --private --template orpheo28/hexa-discovery --clone`), puis dis-moi exactement comment ouvrir ce dossier. Fais tout ce que tu peux toi-même.

**Then open the new folder** in Claude Code (it tells you how: Claude desktop → Code tab → open folder) and say **"setup"**. The harness only switches on inside its own folder: that is where its safety checks and skills live.

That's it. Setup takes about 20–30 minutes, most of it waiting for your LinkedIn export. The rest of this page is what your agent will do and what you need to know.

---

## What you need

| What | Why | How |
| --- | --- | --- |
| **Claude Code** | The harness lives in files and runs scripts: it needs an agent with a folder. The Claude desktop app's Code tab is enough, no terminal skills needed | claude.ai/download |
| **GitHub access** to `orpheo28/hexa-discovery` | To create your repo from the template | Public: no access needed. **Your own discovery repo must stay private** (it holds call transcripts) |
| **Node.js 20+, git, gh** | Scripts, versioning, repo creation | Your agent checks and installs them with you (`brew install node gh` on a Mac) |
| **Notion connector** (required) | Your CRM and the shared Discovery tracking | claude.ai → Settings → Connectors → Notion. Log in with your Hexa account |
| **Granola connector** (strongly recommended) | Your calls arrive by themselves, with full transcripts and history (Hexa's paid plan) | Settings → Connectors → Granola |
| **Exa connector** (recommended, free tier) | Finding people and companies | Settings → Connectors → Exa |
| Firecrawl connector (optional) | Extra page reading and email finding (Apollo, Hunter). Not needed: Exa and Claude's web fetch read pages, and emails come from the person or a public page, checked locally | Settings → Connectors → Firecrawl |
| **Your LinkedIn export** (recommended) | Your network comes first: 1st-degree connections answer far more | linkedin.com → Settings & Privacy → Data privacy → Get a copy of your data → "Want something in particular?" → tick Connections. It arrives by email in 10–30 minutes; an archive without `Connections.csv` is a first partial one, wait for the next |

Connectors added in claude.ai work in Claude Code and the desktop app when you are signed in with the same account.

Other agents: Codex or any agent that reads `AGENTS.md` works too, with the Notion MCP server (`https://mcp.notion.com/mcp`) and Granola's. Without Claude Code's hooks, the safety checks rely on the agent following the rules. Claude.ai chat alone is not enough: it has no folder for the knowledge.

---

## What setup does

A guided onboarding, one step at a time; say "setup" again at any moment to resume where you were (progress in `docs/onboarding.md`).

1. **Tools.** Checks Node, git, GitHub and your connectors, and tells you exactly what to click for the missing ones. Asks you to request your LinkedIn export right away (it takes 10–30 minutes to arrive). Creates the local Exa counter.
2. **Private repo** created from the template (your repo holds transcripts: it must stay private; a hook refuses any push to a public repo).
3. **Project and sprint.** Finds you and your project in WTF Projects, asks your partner, sprint dates and team channel (defaults you can accept with "ok"). If your project is not yet an option of the shared Discovery tracking databases, it gives you the message to send to their owner and carries on: the Notion writes wait, nothing else does.
4. **Notion dashboard** `🧭 <Project> discovery`, the same for every project: 9 views of the shared databases filtered on your project, plus Current idea, What we've learnt, IDEA Framework.
5. **Context.** Reads the Hexa method and your project page, and tells you what it understood.
6. **Import of everything already done:**
   - finds **every Granola meeting** linked to your discovery (folder, keywords, transcripts, people already named in Notion) and **every Notion page** about it (your project tree, pages elsewhere, meeting notes);
   - **validation 1:** shows you the list — are these the right calls? is one missing? the right pages? It searches again for anything you name, or takes your notes for calls that were not recorded;
   - reads every call and page, drafts the call files, the contacts, the idea, the problems, the hypotheses with the evidence already gathered, and the knowledge base;
   - **validation 2:** shows you what it understood (each call in one line, A-players, the idea, hypotheses, top 10 learnings, contacts to create) — you correct, then say "ok";
   - only then writes everything: repo, CRM, shared tracking databases, your dashboard.
7. **LinkedIn network** imported, with the 10–20 connections most useful for your discovery.
8. **Finish:** your message templates adapted to your topic, STATUS, first commit, and the 3 best things to do now.

---

## What you say, every day

Talk normally, in French or English. Your agent picks the right skill.

| You say | What happens | Skill |
| --- | --- | --- |
| "my day" / « ma journée » (or nothing) | Follow-ups due with the message ready, today's calls, replies without a call, new Granola meetings to process | `crm` |
| "find me 15 heads of legal at 200–1000 people companies in Paris" / « trouve-moi… » | Your network first, then Exa: qualified people in the CRM with a dated signal, a personal line, a priority, and first messages ready to copy | `find` |
| "write to Jane" + her profile, "make this better: …", "follow up Tom", "reply to Anna: …" / « écris à… », « fais mieux » | The best message for that person, on the right channel and in their language, checked for length and AI tells; the CRM updated when you say "sent" | `write` |
| "book the call with Jane Thursday 3pm" / « cale Jane jeudi 15 h », "what calls do I have?" | Checks conflicts, opens Google Calendar on the pre-filled event (you click Save), sets the CRM to Call booked, offers the brief | `calendar` |
| "I'm calling Jane tomorrow at 10" / « prépare mon call avec Jane » | A one-page brief: who she is, what to learn, 8 Mom Test questions, mistakes to avoid. CRM set to Call booked | `prep` |
| "process my calls" / « traite mes calls » / "call with Jane" | Reads the Granola transcript, writes the call file (learnings, exact quotes with timestamps, numbers, follow-ups), updates the CRM and the A-player box, adds evidence to hypotheses, creates intro contacts, drafts the follow-up | `call` |
| "I DMed Jane and Paul", "Anna replied", "call with Tom Thursday", "Paul not interested" | CRM updated with dates and next actions | `crm` |
| a link (article, YouTube, podcast, Spotify, post, report) | A source file, sourced learnings in the knowledge base, evidence for or against hypotheses, people worth contacting | `add` |
| "debrief for the channel" / « compte rendu pour le channel » | The calls not yet posted, written up in the house format (who, 3–5 learnings, what it means), ready to paste in your team channel | `debrief` |
| "import my calls", "a call is missing", "sync my Notion" | Lists new Granola meetings and Notion pages, asks you to validate, imports them | `import` |
| "who do I know at Doctolib?", a new LinkedIn export, pasted connections | Searches and updates your network, flags who matters for the discovery | `network` |
| "review" / « bilan » / "where do we stand" (Friday) | Funnel numbers, top learnings, hypotheses that should move (you approve), the idea proposal, the Weekly reviews row for the board, next steps, STATUS updated | `review` |

You always stay in control: nothing is sent, no hypothesis status or idea version changes without your yes.

---

## Where everything lives

**In your private repo** (the knowledge, versioned):

| Folder | What |
| --- | --- |
| `1-idea/` | The current idea, the hypotheses (dashboard + register, and the dated evidence journal), the history of versions, the IDEA Framework for the go / no-go |
| `2-calls/` | One file per call, with the full transcript |
| `3-knowledge/` | What you learned, by theme, one sourced line each; the value-chain map; the synthesis |
| `4-sources/` | One file per article, video, podcast |
| `5-research/` | Every search that served (lead lists, market studies) |
| `6-templates/` | Outreach rules and message templates |
| `STATUS.md` | Where you stand, in 25 lines |
| `docs/debriefs.md` | The call debriefs you posted in the team channel |
| `data/` | Your LinkedIn network and API usage: local only, never committed |

**In Notion:**

| Where | What |
| --- | --- |
| 📊 Discovery tracking → Contacts | Your CRM (shared database, your rows have `Project` = yours). Emails and phones only here |
| 📊 Discovery tracking → Hypotheses, Problems, Idea log | Mirrors of `1-idea/` |
| 📊 Discovery tracking → Weekly reviews | Your row every week, read by the WTF Discovery Board |
| Your project page → 🧭 `<Project> discovery` | The same dashboard for every project, built by setup (`docs/notion-workspace.md`): weekly reviews, funnel chart, pipeline, next actions, calls, A-players, hypotheses board, problems, idea log, all filtered on your project; plus Current idea, What we've learnt, IDEA Framework |

---

## The method

Hexa Lean Discovery, in `docs/method.md`: a one-month sprint, a draft proposal around day 10, the IDEA Framework for the go / no-go. Map the value chain first, then zoom in by rounds of hypotheses. About 10 calls a week; 40 calls and 8 A-players on the board. Every call: icebreaker, structure, open questions about past facts, "show me", layers of "why", "who else should I talk to?". A kill is a valid result.

---

## The rules your agent follows

Full text in `rules/rules.md`.

- **Nothing invented.** Every learning cites its call, source or search. Missing data stays empty.
- **Consent.** You announce the recording at the start of every call: "I'm taking notes with a tool that records, is that OK with you?"
- **Privacy.** Full transcripts stay in your private repo. The shared Notion (read by all of Hexa) gets summaries and short quotes. Emails and phones only in the CRM.
- **Nothing sent.** Every message is a draft you send by hand. No LinkedIn automation. Connectors that could send or publish for you (Gmail, Slack, Gigi, Hexa OS, Google Calendar and Drive…) are blocked inside the harness folder.
- **Notion safety.** Only your project's rows and your workspace page; never a deletion, never a schema change. Enforced by a hook in Claude Code.
- **€0.** Free tiers of Exa (and Firecrawl if you have it), counted locally, stop at 80% (`npm run quota`). In a cloud session, where the counter is absent, Exa is off and the agent uses its built-in web search. Never a guessed email: given by the person, or published and checked.
- **You decide.** Hypothesis statuses and idea versions change only with your approval.

---

## Useful commands

Your agent runs these; you can too.

| Command | What |
| --- | --- |
| `npm run quota` | Exa (and Firecrawl) usage this month (`-- init` once on a new machine) |
| `npm run message -- --note` + the text | Checks a message: length, AI tells, one ask |
| `npm run calendar -- --title "Call X" --start 2026-12-03T15:00` | Opens Google Calendar on a pre-filled event |
| `npm run network -- stats` / `-- search "legal\|juridique"` | Your LinkedIn network |
| `npm run preflight` | Environment check |
| `npm test` | Checks the hooks and the repo's integrity |
| `npm run update-harness` | Brings the latest harness from the template (skills, scripts, rules), never touching your content. Review and commit |

---

## For the harness maintainers

- How it is built: `docs/harness.md`. Notion ids and schemas: `docs/notion.md`.
- Improve the template, not your copy: open a pull request on `orpheo28/hexa-discovery`; everyone gets it with `npm run update-harness` (the session-start hook says when an update is available).
- The shared databases' schema belongs to the owner of the Discovery tracking page (schema contract on the Discovery tracking page). Proposals: `docs/notion-proposals.md`.
