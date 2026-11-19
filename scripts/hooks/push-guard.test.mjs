import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, isPush, repoOf, TEMPLATE } from './push-guard.mjs';

const base = { command: 'git push', setUp: true, originUrl: 'https://github.com/jane/examplex-discovery.git', visibility: 'PRIVATE' };

test('recognises pushes only', () => {
  assert.ok(isPush('git push'));
  assert.ok(isPush('git add -A && git commit -m x && git push -q'));
  assert.ok(isPush('git -C /tmp/x push origin main'));
  assert.ok(!isPush('git status'));
  assert.ok(!isPush('echo "git pushed"'));
});

test('parses GitHub remotes', () => {
  assert.equal(repoOf('https://github.com/Jane/Repo.git'), 'jane/repo');
  assert.equal(repoOf('git@github.com:jane/repo.git'), 'jane/repo');
  assert.equal(repoOf('https://gitlab.com/jane/repo'), null);
});

test('private discovery repo: allowed', () => assert.equal(decide(base), null));
test('not a push: allowed', () => assert.equal(decide({ ...base, command: 'git status', visibility: 'PUBLIC' }), null));
test('template maintainers (not set up): allowed', () => assert.equal(decide({ ...base, setUp: false, originUrl: `https://github.com/${TEMPLATE}.git`, visibility: null }), null));
test('discovery pushed to the template: refused', () => assert.ok(decide({ ...base, originUrl: `https://github.com/${TEMPLATE}.git` })));
test('public discovery repo: refused', () => assert.match(decide({ ...base, visibility: 'PUBLIC' }), /private/));
test('visibility unknown: refused', () => assert.ok(decide({ ...base, visibility: null })));
test('non-GitHub origin: refused', () => assert.ok(decide({ ...base, originUrl: '/tmp/repo.git' })));
