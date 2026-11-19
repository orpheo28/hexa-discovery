---
name: add
description: Use when the user sends a link or pastes a text to feed the knowledge - blog, YouTube video, podcast (Spotify included), article, LinkedIn post, report - "read this", "add this source", « ajoute », « lis ça », « regarde cette vidéo », « voici un article ». Files the source in 4-sources/, extracts the learnings, updates 3-knowledge/ and the hypotheses (repo and Notion).
---

# Add: feed the knowledge with a source

## Input
One or more links, or a pasted text (YouTube transcript, article, post). Several sources at once: process them one by one, in the same commit.

## Steps
1. **Duplicate.** `grep -rl "<url>" 4-sources/`. If it already has a file, update that file. If it only appears in a compilation, create the dedicated file and link it under the compilation entry.
2. **Read.**
   - A pasted text is the source: read it as is.
   - A link: Exa `web_fetch_exa` first; if it fails, the built-in web fetch (WebFetch, or the `web-fetch` agent); `firecrawl_scrape` in markdown mode only if the Firecrawl connector exists (budget: `npm run quota`).
   - **Spotify podcast** (`open.spotify.com/episode/<id>`): the page is empty when scraped.
     1. Title, show and date: fetch `https://open.spotify.com/embed/episode/<id>` (built-in web fetch or `web_fetch_exa`; `firecrawl_scrape` with `waitFor` 2000 if connected), or an Exa search on the episode URL.
     2. Transcript: `web_search_exa` with `<show> "<title>" transcript`. It is often in Exa's podcast library (`exa.ai/library/podcast/…`, timestamped), on the show's site, or in a YouTube version. Read it with `web_fetch_exa` or `firecrawl_scrape`.
     3. No transcript: a file from the description only, marked "no transcript", and ask the user to paste the one from the Spotify app.
   - **YouTube video:** the transcript the user pastes; otherwise find it the same way (Exa podcast library, show site, published transcript). Not found: ask the user. Never summarise a video or podcast you have not read in full; say where the transcript comes from in "In short".
   - **3 links or more:** one file per subagent (Sonnet), in parallel, each writing only its file and returning the proposed lines for `3-knowledge/`, the hypotheses and the index. Integration into shared files, quote checks and the commit happen afterwards in one pass. An off-topic source keeps its file and index line, without knowledge lines.
3. **Write the file** `4-sources/YYYY-MM-DD-<slug>.md` (publication date if known, else the date added; short slug without accents), in `project.json` `language`:

```markdown
---
title: "…"
type: video | article | podcast | post | report
author: "…"          # person or channel
published: YYYY-MM-DD   # empty if unknown
url: …
added: YYYY-MM-DD
language: fr | en
themes: [customers]  # among the theme files of 3-knowledge/
hypotheses: [H1, H7]
---

# Title

## In short
3 lines: who speaks, about what, why it matters for the project.

## What we learn
- Learning. "Short exact quote" [00:12:34]   (timestamp for audio/video, section or paragraph for a text)

## For our hypotheses
- H7 (against): …
- Intuition: …   (labelled as such)

## Content
Video or podcast: if the user pasted the transcript, keep it as is. If it comes from the web, do not copy it word for word (copyright): give the link, then condensed notes by speaker and timestamp, with only short exact quotes. Article: the useful excerpts and the link.
```

4. **Feed `3-knowledge/`.** For each solid learning, one line in the theme file:
   `- YYYY-MM-DD · Learning in one sentence. Source: [title](../4-sources/file.md) · strength: fact | opinion | number`
   - Already there: add the source to the existing line (`Sources (N): link1 ; link2`) instead of duplicating.
   - Update the line count in `3-knowledge/README.md`.
   - A source that contradicts a line: add the contradiction under it, indented.
   - **No orphan source:** every file with learnings is cited in at least one `3-knowledge/` file. If it brings nothing, add to its header `knowledge: "dropped YYYY-MM-DD: reason"`. `npm test` checks it.
5. **Hypotheses.** If the source brings something for or against, add it to `1-idea/hypotheses.md` (For or Against column, with the link, "field listening") and update the "Updated" column; mirror it in the Notion Hypotheses row (`Evidence so far`, English, labelled `field listening`; `Updated`). A third-party source never changes a status on its own.
6. **Index.** Insert the line in `4-sources/README.md` (date, title, type, themes, file), in chronological order of publication.
7. **Commit and push:** "Add source: <short title>".

## Answer
- 5 lines at most: the 3 learnings that matter, what confirms or contradicts the idea, and the concrete next step (a person to contact, a question for the calls).
- If the source names interesting people (author, companies cited), offer to add them with `find`.

## Rules
- Nothing invented. Exact quotes.
- No personal data (email, phone).
- A single source never becomes a generality ("a buyer says…", not "buyers…").
