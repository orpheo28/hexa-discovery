#!/bin/sh
# Brings the harness of this discovery up to date with the template, without touching the project's content.
#   npm run update-harness
# Adds the remote `template` if missing (HARNESS_TEMPLATE_URL, default the Hexa template), fetches it, and checks out
# from template/main only the harness paths (same list as scripts/hooks/session-start.mjs and docs/harness.md).
# Files deleted upstream are not removed here. Nothing is committed: review, then commit.
set -e
cd "$(dirname "$0")/.."

URL="${HARNESS_TEMPLATE_URL:-https://github.com/orpheo28/hexa-discovery.git}"
PATHS=".claude scripts rules/rules.md 6-templates/writing.md docs/harness.md docs/method.md docs/notion.md docs/notion-workspace.md AGENTS.md package.json"
# Project files the skills expect: brought from the template only when missing, never overwritten.
STARTERS="1-idea/hypotheses-journal.md docs/debriefs.md"

if ! git remote get-url template >/dev/null 2>&1; then
  git remote add template "$URL"
  echo "Remote 'template' added: $URL"
fi

# shellcheck disable=SC2086
if ! git diff --quiet -- $PATHS || ! git diff --cached --quiet -- $PATHS; then
  echo "Local changes in harness files. Commit or stash them first:"
  # shellcheck disable=SC2086
  git status --short -- $PATHS
  exit 1
fi

git fetch --quiet template main

for p in $PATHS; do
  if git cat-file -e "template/main:$p" 2>/dev/null; then
    git checkout template/main -- "$p"
  fi
done

for p in $STARTERS; do
  if [ ! -e "$p" ] && git cat-file -e "template/main:$p" 2>/dev/null; then
    git checkout template/main -- "$p"
    echo "New file from the template: $p"
  fi
done

# New project settings keep their defaults (project.json is the project's: only missing keys are added).
node -e '
const fs = require("fs");
const p = JSON.parse(fs.readFileSync("project.json", "utf8"));
const defaults = { timezone: "Europe/Paris", team_channel: "" };
let changed = false;
for (const [k, v] of Object.entries(defaults)) if (!(k in p)) { p[k] = v; changed = true; }
if (changed) { fs.writeFileSync("project.json", JSON.stringify(p, null, 2) + "
"); console.log("project.json: new settings added with their defaults"); }
'
git add project.json

if git diff --cached --quiet; then
  echo "The harness is already up to date."
else
  git diff --stat --cached
  echo
  echo "Review the changes, then: git commit -m \"Update the harness from the template\""
fi
