---
name: find
description: Use when the user asks for people to contact, leads, a qualification, an enrichment (LinkedIn, email) or a list of companies - "find me 20 CFOs in Lyon", "who should I call", "enrich these names", « trouve-moi des gens », « des leads », « qui contacter », « enrichis ces contacts », « trouve l'email de X ». Searches with the network, Exa and Firecrawl, qualifies, removes duplicates across all projects, adds to the shared CRM as Target with a personal line and a first message.
---

# Find: people worth calling, qualified

## Input
A profile ("20 heads of procurement of 200–2,000 employee companies in Île-de-France", "experts in X"), a company, or names to enrich. If the profile is vague, sharpen it with `1-idea/current.md` (section "For whom": the core profile) and what `3-knowledge/` says about who answers.

## Steps
1. **Budget.** `npm run quota`. Stop if Exa (or Firecrawl, when connected) is at the limit (`project.json` `budget.stop_at`). Say so and offer the network or manual search instead.
2. **Aim at the evidence gap.** Prefer profiles that test the hypotheses with `Next week` ticked or still `To test`, and likely A-players (people who do the job, buy or decide). Also think of experts, investors and competitors (Lean Discovery), who count apart.
3. **Network first** (skill `network`): `node scripts/network.mjs search "<company|role regex>"`. A first-degree connection comes before a stranger: they answer more and can introduce. Note it in `How found` ("1st-degree LinkedIn connection since <date>") or in `Introduced by` if they serve as an intro.
4. **Companies.** `web_search_exa` (`category: company` when useful), plus signal pages: job posts, regional press, funding, posts, talks. Keep only companies that fit the profile.
5. **People.** `web_search_exa` with `category: people` ("head of procurement at <company> <city>").
   - Check that the current job is at that company, and note the date of the profile capture.
   - Anyone unconfirmed stays "to check" in Notes.
6. **Duplicates.** Before adding anyone:
   - SQL on Contacts, **all projects**, `LIKE '%word%'` on Name, Company and Notes (the company's short name is enough);
   - `grep -ri` in `5-research/`.
   Same project: complete the existing row. Another project: tell the user who owns it; add a row in ours only if relevant, with the cross-link in Notes.
7. **Qualify.** Three questions: does the person fit the profile? What can they teach us (which hypothesis or open question)? Which dated signal justifies the message?
   - High: core profile and a signal less than 3 months old.
   - Normal: core profile without a recent signal, or secondary profile with a signal.
   - Low: the rest.
8. **Personal line (the hook)** and **anchor**, per `6-templates/writing.md`. By strength: an intro ("{name} suggested I reach out"), else an experience that links them to the topic ("with your experience at <company>"), else a dated signal. True, sourced, 15 words max. Note in `Notes` the Hexa anchor closest to their field (anchors table of `6-templates/linkedin.md`). Never flattery, never unverified information.
9. **Email**, only for people the user will email, or on request:
   - **With Firecrawl connected:** `firecrawl_scrape` in `alexandria` mode, `apollo` `people/search` first (0 credit), then `hunter` `people/email-find` with domain and name (10 credits, only if found; up to 10 people per call). `Email verified` only if Hunter says `valid`.
   - **Without Firecrawl (the usual case at Hexa):** the email given by the person, or an address the person or their company published on a public page (team page, press release, talk, GitHub) found with Exa, with its URL in `How found`. Never a guessed pattern (`first.last@…`). Then check it: write `name,company,email` to `data/email-check.csv` (git-ignored; delete it after) and run `node scripts/lib/email-check.mjs check data/email-check.csv`; tick `Email verified` only if the result says `usable: true` (syntax, mail server and no catch-all; it cannot prove the mailbox exists). An Apollo connector, if the user has one, can replace this step.
   - No email found: the channel is LinkedIn (or an intro), which is the default for discovery anyway.
   - The email goes in the CRM, nowhere else.
10. **Add to the CRM**, one row per person, `allow_async: false`: Name, Project, Company, Role, Type, Country, Region, LinkedIn; Email and Email verified if any; `Stage = Target`, Priority, Channel (planned); `How found` (signal, link, date); Personal line; "to check" in Notes when something is unconfirmed.
11. **Trace the search** in `5-research/YYYY-MM-DD-<topic>.md` and add its line to `5-research/README.md`. Header: `topic`, `date`, `tools`, `firecrawl_credits`, `exa_calls` (every Exa call, searches and reads). Then the criteria, the queries, and the people kept and dropped with the reason. Names, roles and LinkedIn URLs only, never an email.
12. **Commit and push:** "Find <N> <profile>".

## Answer
- How many added, by priority, and the 5 best with their personal line.
- Credits used.
- What remains to check.
- The ready-to-copy message for the 5 best, from the right template (`6-templates/linkedin.md` or `6-templates/email.md`), in the person's language, following `6-templates/writing.md` and its final check. A LinkedIn note is 300 characters max, counted before proposing it.

## Rules
- Nothing invented: no guessed email, no assumed job title.
- No LinkedIn automation: public pages read through Exa only; never act on LinkedIn.
- Exa previews sometimes show an email or a phone: never copy it. Only an email given by the person, or a published one that Hunter says `valid` or `email-check` says `usable`, goes in the CRM.
- Budget: `rules/rules.md`.
