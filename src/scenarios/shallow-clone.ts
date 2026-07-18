/**
 * `shallow-clone` — a repo that appears to be a shallow clone with
 * limited history depth. Tools behave differently against shallow
 * repos (e.g., `git log` stops at the shallow boundary, `git fetch
 * --unshallow` is needed for full history).
 *
 * State after setup:
 *   - `main` has 10 commits total
 *   - `.git/shallow` exists — repo reports as shallow
 *   - Only the last 3 commits are reachable from HEAD
 *   - `git rev-parse --is-shallow-repository` returns `true`
 *
 * EXTRACTION DISCIPLINE: no coco-specific imports.
 */

import {
    addCommit,
    chain,
    defineScenario,
    shallowAt,
} from '../atoms'

export const shallowCloneScenario = defineScenario({
  name: 'shallow-clone',
  summary: 'shallow repo with only 3 of 10 commits reachable from HEAD',
  description: [
    'A repository that appears to be a shallow clone (depth 3).',
    '10 commits exist in the object store but only the last 3 are',
    'reachable from HEAD. `.git/shallow` is set, so',
    '`git rev-parse --is-shallow-repository` returns `true`.',
    '',
    'Useful for testing:',
    '  - tools that detect shallow repos and warn/error',
    '  - log views that hit the shallow boundary',
    '  - fetch/pull flows that offer --unshallow',
    '  - blame views that stop at the graft point',
  ].join('\n'),
  kind: 'history',
  tags: ['shallow', 'history'],
  contracts: [
    'main is checked out',
    'repo is shallow (git rev-parse --is-shallow-repository = true)',
    'main has 10 total commits in object store',
    'only 3 commits are reachable from HEAD',
  ],
  setup: chain(
    addCommit({ message: 'chore: initial scaffold', files: { 'README.md': '# Project\n' } }),
    addCommit({ message: 'feat: add config', files: { 'src/config.ts': 'export const config = {}\n' } }),
    addCommit({ message: 'feat: add utils', files: { 'src/utils.ts': 'export const utils = {}\n' } }),
    addCommit({ message: 'feat: add models', files: { 'src/models.ts': 'export const models = {}\n' } }),
    addCommit({ message: 'feat: add routes', files: { 'src/routes.ts': 'export const routes = {}\n' } }),
    addCommit({ message: 'feat: add middleware', files: { 'src/middleware.ts': 'export const mw = {}\n' } }),
    addCommit({ message: 'feat: add auth', files: { 'src/auth.ts': 'export const auth = {}\n' } }),
    addCommit({ message: 'test: add test suite', files: { 'tests/index.test.ts': 'describe("app", () => {})\n' } }),
    addCommit({ message: 'docs: update readme', files: { 'README.md': '# Project\n\nFull-featured app.\n' } }),
    addCommit({ message: 'chore: release v1.0.0', files: { 'package.json': '{"version":"1.0.0"}\n' } }),
    // Make it shallow at depth 3 — only last 3 commits reachable
    shallowAt(3),
  ),
})
