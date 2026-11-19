# Hexa discovery harness

**A complete AI harness to run a startup discovery the Hexa way.** You find people, talk to them and send your messages yourself. Your agent does everything else: it finds and qualifies leads, keeps your CRM, pulls your call transcripts from Granola, turns every call and article into sourced knowledge, tracks your hypotheses, and fills the shared Notion so the WTF Discovery Board shows every project on the same numbers on Friday.

It is the harness built for a first Hexa discovery in Nov 2026, made generic. One template, one private repo per discovery.

---

## Start here: paste this into your agent

Open **Claude Code** (the Code tab of the Claude desktop app, the `claude` terminal command, Claude Code in VS Code, or an agent in Orca) in an empty folder, and paste:

> Set up a new Hexa discovery for me. Create my private repo from the template `orpheo28/hexa-discovery` (`gh repo create <project>-discovery --private --template orpheo28/hexa-discovery --clone`), open it, then read its `README.md` and `CLAUDE.md` and run the `setup` skill. Guide me step by step and do everything you can yourself.

En français :

> Monte-moi une nouvelle discovery Hexa. Crée mon dépôt privé à partir du template `orpheo28/hexa-discovery` (`gh repo create <projet>-discovery --private --template orpheo28/hexa-discovery --clone`), ouvre-le, lis son `README.md` et son `CLAUDE.md`, puis lance la skill `setup`. Guide-moi pas à pas et fais tout ce que tu peux toi-même.

That's it. Setup takes about 15 minutes, most of it waiting for your LinkedIn export. The rest of this page is what your agent will do and what you need to know.

---

## What you need

| What | Why | How |
| --- | --- | --- |
| **Claude Code** | The harness lives in files and runs scripts: it needs an agent with a folder. The Claude desktop app's Code tab is enough, no terminal skills needed | claude.ai/download |
| **GitHub access** to `orpheo28/hexa-discovery` | To create your repo from the template | Public: no access needed. **Your own discovery repo must stay private** (it holds call transcripts) |
| **Node.js 20+, git, gh** | Scripts, versioning, repo creation | Your agent checks and installs them with you (`brew install node gh` on a Mac) |
| **Notion connector** (required) | Your CRM and the shared Discovery tracking | claude.ai → Settings → Connectors → Notion. Log in with your Hexa account |
| **Granola connector** (strongly recommended) | Your calls arrive by themselves | Settings → Connectors → Granola. Transcripts need a paid Granola plan; the free plan gives notes, 30 days |
| **Exa connector** (recommended, free tier) | Finding people and companies | Settings → Connectors → Exa |
| **Firecrawl connector** (recommended, free tier) | Reading pages; finding and checking emails (Apollo, Hunter) | Settings → Connectors → Firecrawl |
| **Your LinkedIn export** (recommended) | Your network comes first: 1st-degree connections answer far more | linkedin.com → Settings → Data privacy → Get a copy of your data → Connections. The full zip arrives by email; the first, partial one has no `Connections.csv` |

Connectors added in claude.ai work in Claude Code and the desktop app when you are signed in with the same account.

Other agents: Codex or any agent that reads `AGENTS.md` works too, with the Notion MCP server (`https://mcp.notion.com/mcp`) and Granola's. Without Claude Code's hooks, the safety checks rely on the agent following the rules. Claude.ai chat alone is not enough: it has no folder for the knowledge.

---

## What setup does

1. Checks your tools and connectors, and tells you exactly what to click for the missing ones.
2. Creates your private repo from the template (if not done) and links it to the template for updates.
3. Finds you in Notion and your project in WTF Projects (it asks if you lead several).
4. Checks your project exists in the shared Discovery tracking databases (if not, you ask the owner of the Discovery tracking page to add it).
5. Reads your project page, its sub-pages and the Hexa Lean Discovery page.
6. Builds your Notion dashboard under your project page, from the common template: 9 views of the shared databases filtered on your project, and three mirror pages (Current idea, What we've learnt, IDEA Framework).
7. Adopts the rows your project already has in the shared databases.
8. Checks Granola can read your calls.
9. Imports your LinkedIn network.
10. Drafts your current idea, 8 to 15 hypotheses (each with how it would be validated or refuted), 2 or 3 problems and the skeleton of your value chain. You edit, it writes them to the repo and to Notion.
11. Asks your sprint dates and partner, fills `project.json`, `CLAUDE.md` and `STATUS.md`, commits and pushes.
12. Gives you the cheat sheet below.

---

## What you say, every day

Talk normally, in French or English. Your agent picks the right skill.

| You say | What happens | Skill |
| --- | --- | --- |
| "my day" / « ma journée » (or nothing) | Follow-ups due with the message ready, today's calls, replies without a call, new Granola meetings to process | `crm` |
| "find me 15 heads of legal at 200–1000 people companies in Paris" / « trouve-moi… » | Your network first, then Exa: qualified people in the CRM with a dated signal, a personal line, a priority, and first messages ready to copy | `find` |
| "I'm calling Jane tomorrow at 10" / « prépare mon call avec Jane » | A one-page brief: who she is, what to learn, 8 Mom Test questions, mistakes to avoid. CRM set to Call booked | `prep` |
| "process my calls" / « traite mes calls » / "call with Jane" | Reads the Granola transcript, writes the call file (learnings, exact quotes with timestamps, numbers, follow-ups), updates the CRM and the A-player box, adds evidence to hypotheses, creates intro contacts, drafts the follow-up | `call` |
| "I DMed Jane and Paul", "Anna replied", "call with Tom Thursday", "Paul not interested" | CRM updated with dates and next actions | `crm` |
| a link (article, YouTube, podcast, Spotify, post, report) | A source file, sourced learnings in the knowledge base, evidence for or against hypotheses, people worth contacting | `add` |
| "who do I know at Doctolib?", a new LinkedIn export, pasted connections | Searches and updates your network, flags who matters for the discovery | `network` |
| "review" / « bilan » / "where do we stand" (Friday) | Funnel numbers, top learnings, hypotheses that should move (you approve), the idea proposal, the Weekly reviews row for the board, next steps, STATUS updated | `review` |

You always stay in control: nothing is sent, no hypothesis status or idea version changes without your yes.

---

## Where everything lives

**In your private repo** (the knowledge, versioned):

| Folder | What |
| --- | --- |
| `1-idea/` | The current idea, the hypotheses (dashboard + register with all evidence), the history of versions, the IDEA Framework for the go / no-go |
| `2-calls/` | One file per call, with the full transcript |
| `3-knowledge/` | What you learned, by theme, one sourced line each; the value-chain map; the synthesis |
| `4-sources/` | One file per article, video, podcast |
| `5-research/` | Every search that served (lead lists, market studies) |
| `6-templates/` | Outreach rules and message templates |
| `STATUS.md` | Where you stand, in 25 lines |
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
- **Nothing sent.** Every message is a draft you send by hand. No LinkedIn automation.
- **Notion safety.** Only your project's rows and your workspace page; never a deletion, never a schema change. Enforced by a hook in Claude Code.
- **€0.** Free tiers of Exa and Firecrawl, counted locally, stop at 80% (`npm run quota`).
- **You decide.** Hypothesis statuses and idea versions change only with your approval.

---

## Useful commands

Your agent runs these; you can too.

| Command | What |
| --- | --- |
| `npm run quota` | Exa and Firecrawl usage this month |
| `npm run network -- stats` / `-- search "legal\|juridique"` | Your LinkedIn network |
| `npm run preflight` | Environment check |
| `npm test` | Checks the hooks and the repo's integrity |
| `npm run update-harness` | Brings the latest harness from the template (skills, scripts, rules), never touching your content. Review and commit |

---

## For the harness maintainers

- How it is built: `docs/harness.md`. Notion ids and schemas: `docs/notion.md`.
- Improve the template, not your copy: open a pull request on `orpheo28/hexa-discovery`; everyone gets it with `npm run update-harness` (the session-start hook says when an update is available).
- The shared databases' schema belongs to the owner of the Discovery tracking page (schema contract on the Discovery tracking page). Proposals: `docs/notion-proposals.md`.
