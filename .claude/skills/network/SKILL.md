---
name: network
description: Use when the user talks about their LinkedIn network - "add these connections", pastes a list of LinkedIn connections, "I have a new export", "import my LinkedIn", "who do I know at X", "who in my network is relevant", « ajoute ces relations », « j'ai un nouvel export », « importe mon LinkedIn », « qui je connais chez X », « qui dans mon réseau est pertinent ». Keeps the local CSV of first-degree connections up to date, searches it for contacts and intros, and proposes the relevant ones for the CRM.
---

# Network: the user's LinkedIn connections

`data/linkedin/connections.csv` holds the user's first-degree connections: first name, last name, URL, company, position, connection date, source (`export YYYY-MM-DD` or `added YYYY-MM-DD`). It is **local and ignored by Git**: never committed, never an email in it. `scripts/network.mjs` does all the work on the file; never rewrite the CSV by hand.

Why: a first-degree connection answers far more than a cold message, can be written to without the 300-character limit, and opens intros to target accounts.

## 1. "Add these connections" (text pasted from LinkedIn)
The user pastes LinkedIn's "Connections" page (name, title, "Connected on …"), or gives a name and a URL.
1. Write the pasted text to a scratch file, then `node scripts/network.mjs add <file>`. The script recognises the blocks, normalises dates, ignores "Profile photo of" and "Message", and never creates a duplicate (same URL or same name).
2. A connection given by hand ("I added Jane Doe, https://linkedin.com/in/…"): write a block in the same format (name, title or URL, "Connected on <today>").
3. Report: how many added, how many already known, the new total.
4. Run the screen of § 4 on each new connection and flag the ones that matter.

## 2. "I have a new export" (LinkedIn zip)
1. How to get it: linkedin.com → Me → Settings & Privacy → Data privacy → Get a copy of your data → "Want something in particular?" → tick **Connections** → Request archive. The zip arrives by email (10 to 30 minutes). A first, partial archive can come first and has no `Connections.csv`: wait for the full one.
2. Find it in `~/Downloads/` (`ls -d ~/Downloads/*LinkedInDataExport*`): a zip (check `unzip -l` lists `Connections.csv`), or a folder when the browser unzipped it (use its `Connections.csv`).
3. `node scripts/network.mjs import <zip>`. The export updates positions and companies and keeps connections added by hand that it does not contain yet. Emails in the export are dropped.
4. Report the total and the new connections, then the screen of § 4 on the new ones.

## 3. "Who do I know at X?", "who in my network…"
`node scripts/network.mjs search "<pattern>"`: a case-insensitive regex on name, position and company. Examples: `"acme|acme corp"`, `"procurement|purchasing|buyer|achat"`, `"cfo|daf|finance director"`.
Position and company are those of the profile at the time of the export or paste: check with Exa before an important message.
`node scripts/network.mjs stats` gives the totals.

## 4. The screen (who is relevant)
**No keyword-only sorting:** a company name rarely says what the company does. For a full review, read each line and judge the company itself: batches of about 1,000 lines, one light subagent (Haiku) per batch, in parallel, on scratch files; then dedupe against the CRM and have the user validate the list (they know who they know well).

The target profiles come from `1-idea/current.md` (section "For whom") and the hypotheses. A connection is relevant if one of these holds:
- **likely A-player:** they do the job, buy or decide on the problem the project studies (the core profile), with first-hand experience;
- **target account:** they work at a company in the CRM, at a competitor, or at a competitor's customer;
- **door opener:** an association, cluster or network of the target sector, an investor of the space, a founder who lives the problem, a specialised consultant or recruiter;
- **in the sector:** anyone at a company of the target sector, even in another function (they open the door to the right person);
- **intro:** they can introduce the user to a target account.
Generalist VCs, marketing, generalist recruiting, finance and real estate are dropped unless directly linked to a target account or the sector. A connection the user knows well beats a perfect title: ask.

## 5. Into the CRM
Never pour the whole network into the CRM. Propose the relevant list (name, position, why, one line), then, after the user's yes, add them with `find` (duplicates, qualification, personal line):
- `Channel = LinkedIn`; `How found` = "1st-degree LinkedIn connection since <date>";
- the message goes without a connection note: short and direct, in the tone of a connection, from the LinkedIn template.

## Rules
- The CSV never leaves `data/linkedin/`: no copy in the repo, nothing in `5-research/` beyond names, positions and URLs of people kept for the CRM.
- No LinkedIn automation: the user copies the page or makes the export.
- No commit for a CSV update (it is outside Git).
