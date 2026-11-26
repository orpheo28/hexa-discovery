# Agent instructions

This repository is a Hexa WTF discovery harness. Read `CLAUDE.md` first: it is the full entry point (role, rules, where things go), then `.claude/skills/README.md` (the commands: `CLAUDE.md` imports it with `@`, which only Claude Code follows). Skills live in `.claude/skills/<name>/SKILL.md`; when the user's intent matches a skill, read that file and follow it.

If `project.json` has an empty `project`, run `.claude/skills/setup/SKILL.md` before anything else.

Hooks (`.claude/settings.json`) only run in Claude Code. In other agents, apply the guards yourself: before a Notion write, check `rules/notion-allowlist.json` and the `Project` rule in `rules/rules.md` §5; before an Exa or Firecrawl call, run `npm run quota` and stop at the limit.

Tools: the Notion MCP server (`https://mcp.notion.com/mcp`) is required; Granola and Exa MCP servers are recommended; Firecrawl is optional.
