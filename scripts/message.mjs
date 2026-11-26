#!/usr/bin/env node
// Checks a message before it is proposed to the owner (skills `write`, `crm`, `find`, `call`; rules of
// 6-templates/writing.md). It fixes nothing: it flags. The text comes on standard input (heredoc, for apostrophes):
//
//   node scripts/message.mjs [--note] <<'EOF'
//   Hello Jane, ...
//   EOF
//
// --note: LinkedIn connection note, 300 characters at most.
// Exit 1 when something must be fixed.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const NOTE_LIMIT = 300;

// [pattern, what]: AI tells and openers that writing.md forbids, in French and English.
const FORBIDDEN = [
  [/—/, 'em dash (—)'],
  [/j['’]esp[eè]re que (vous allez|tu vas) bien/i, '"J’espère que vous allez bien"'],
  [/je me permets/i, '"Je me permets"'],
  [/je m['’]appelle/i, '"Je m’appelle"'],
  [/petite question/i, '"Petite question"'],
  [/\bquick question\b/i, '"Quick question"'],
  [/\bmy name is\b/i, '"My name is"'],
  [/\bI hope (this|you)[^.?!]* (finds you|doing) well/i, '"I hope this finds you well"'],
  [/\bI['’]m reaching out\b/i, '"I’m reaching out"'],
  [/\bjust (following|checking) (up|in)\b/i, '"just following up" (a follow-up brings something new)'],
  [/\b(synergie|synerg(y|ies)|levier|leverage|solution innovante|innovative solution|disruptif|disruptive|game[- ]changer)/i, 'jargon'],
  [/\b(super post|great post|love your post|j['’]adore ton post)/i, 'flattery'],
  [/\bce n['’]est pas [^.?!]{1,60}, c['’]est\b/i, '"ce n’est pas X, c’est Y"'],
  [/\bit['’]s not (just )?[^.?!]{1,60}, it['’]s\b/i, '"it’s not X, it’s Y"'],
  [/\b(remercie|merci pour le call|merci pour ton temps|merci pour votre temps|thanks? (you )?for (the|your) (call|time))/i, 'thank-you after a call (ask for what was promised instead)'],
];

export function check(text, { note = false } = {}) {
  const t = String(text ?? '').trim();
  const length = [...t].length;
  const problems = [];
  if (!t) problems.push('empty message');
  if (note && length > NOTE_LIMIT) problems.push(`LinkedIn note too long: ${length} characters for ${NOTE_LIMIT}`);
  for (const [pattern, what] of FORBIDDEN) if (pattern.test(t)) problems.push(what);
  const questions = (t.match(/\?/g) || []).length;
  if (questions > 2) problems.push(`${questions} question marks: one ask only`);
  if (/\{[^}]+\}/.test(t)) problems.push('template variable not filled ({…})');
  return { length, problems };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const note = process.argv.includes('--note');
  const { length, problems } = check(readFileSync(0, 'utf8'), { note });
  console.log(`${length} characters${note ? ` (limit ${NOTE_LIMIT})` : ''}`);
  if (problems.length) {
    console.log(`To fix: ${problems.join('; ')}`);
    process.exitCode = 1;
  } else {
    console.log('OK');
  }
}
