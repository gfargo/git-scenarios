/**
 * `detached-head` — HEAD is detached at `HEAD~2` (an older commit on
 * the original branch). The classic "you checked out a tag / sha and
 * forgot you're in detached state" scenario.
 *
 * State after setup:
 *   - 4 commits in linear history on `main`
 *   - HEAD is detached at the commit equivalent to `main~2`
 *   - worktree is clean
 *   - `main` still exists as a regular branch pointing at its original tip
 *
 * EXTRACTION DISCIPLINE: no consumer-tool-specific imports.
 */

import type { Step } from '../atoms'
import { addCommit, chain, defineScenario } from '../atoms'

/**
 * Inline step: detach HEAD by checking out a ref directly with
 * `--detach`. Not promoted to a package atom (yet) since the
 * detached-HEAD pattern only shows up here.
 */
const detachHead = (ref: string): Step => async (repo) => {
  await repo.git.checkout(['--detach', ref])
}

export const detachedHeadScenario = defineScenario({
  name: 'detached-head',
  summary: 'HEAD detached at main~2, worktree clean',
  description: [
    'HEAD is detached at `main~2`. The `main` branch still exists at',
    'its original tip — only HEAD has moved off it.',
    '',
    'Useful for testing:',
    '  - detached-HEAD banners / warnings in TUIs',
    '  - "make this a branch?" affordances',
    '  - status-bar branch indicators when there\'s no current branch',
  ].join('\n'),
  kind: 'branch',
  tags: ['detached-head', 'edge-case'],
  contracts: [
    'HEAD is detached',
    'main still exists as a branch',
    'main has 4 commits',
    'HEAD is 2 commits behind main',
    'worktree is clean',
  ],
  setup: chain(
    addCommit({ message: 'chore: initial', files: { 'README.md': '# repo\n' } }),
    addCommit({ message: 'feat: one', files: { 'src/one.ts': 'one\n' } }),
    addCommit({ message: 'feat: two', files: { 'src/two.ts': 'two\n' } }),
    addCommit({ message: 'feat: three', files: { 'src/three.ts': 'three\n' } }),
    // Detach HEAD at main~2 — main still points at its original tip.
    detachHead('main~2'),
  ),
})
