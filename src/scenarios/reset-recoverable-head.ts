/**
 * `reset-recoverable-head` — `main` was hard-reset 2 commits back; the
 * former tip is not on any branch but remains in the object store,
 * recoverable via `main@{1}` / `HEAD@{1}` in the reflog.
 *
 * State after setup:
 *   - `main` has 2 commits (was 4, reset back 2)
 *   - The former tip (4th commit) is not reachable from any branch
 *   - The former tip is recoverable via `main@{1}` in the reflog
 *   - worktree is clean
 *
 * EXTRACTION DISCIPLINE: no consumer-tool-specific imports.
 */

import { addCommit, chain, defineScenario, resetTo } from '../atoms'

export const resetRecoverableHeadScenario = defineScenario({
  name: 'reset-recoverable-head',
  summary: 'main reset 2 commits back; former tip recoverable via main@{1}',
  description: [
    '`main` was at 4 commits, then hard-reset back to the 2nd commit.',
    'The former tip (commit 4) and its parent (commit 3) are not on any',
    'branch but remain in the object store, recoverable via the reflog:',
    '  `git checkout main@{1}`  or  `git reset --hard main@{1}`',
    '',
    'Useful for testing:',
    '  - "undo reset" / recovery affordances in TUIs',
    '  - reflog browsing and "restore branch tip" flows',
    '  - HEAD divergence visualisation after a hard reset',
  ].join('\n'),
  kind: 'branch',
  tags: ['reflog', 'recovery', 'reset'],
  contracts: [
    'main has 2 commits',
    'worktree is clean',
    'the former tip (4th commit) is not reachable from main',
    'the former tip is recoverable via main@{1} in the reflog',
  ],
  setup: chain(
    addCommit({ message: 'chore: initial', files: { 'README.md': '# repo\n' } }),
    addCommit({ message: 'feat: one', files: { 'src/one.ts': 'one\n' } }),
    addCommit({ message: 'feat: two', files: { 'src/two.ts': 'two\n' } }),
    addCommit({ message: 'feat: three', files: { 'src/three.ts': 'three\n' } }),
    // Reset main back 2 commits; former tip still in object store, recoverable via main@{1}.
    resetTo({ target: 'HEAD~2', mode: 'hard' }),
  ),
})
