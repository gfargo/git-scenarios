/**
 * `branch-diverged` — `main` is both 2 ahead AND 2 behind
 * `origin/main`. The "you need to pull (and rebase or merge)" state.
 *
 * State after setup:
 *   - `main` is checked out with 4 commits (2 shared + 2 local-only)
 *   - `origin/main` has 4 commits (2 shared + 2 upstream-only)
 *   - merge base between them is `HEAD~2` on main
 *   - upstream tracking is configured
 *   - worktree is clean
 *
 * `git status` reports: "Your branch and 'origin/main' have diverged,
 * and have 2 and 2 different commits each."
 *
 * EXTRACTION DISCIPLINE: no consumer-tool-specific imports.
 */

import {
    addCommit,
    addRemote,
    chain,
    defineScenario,
    setUpstream,
    withRemoteTracking,
} from '../atoms'

export const branchDivergedScenario = defineScenario({
  name: 'branch-diverged',
  summary: 'main is 2 ahead AND 2 behind origin/main, worktree clean',
  description: [
    '`main` has diverged from `origin/main` — both sides have commits',
    'the other doesn\'t. The merge base is `HEAD~2` on the local side.',
    '',
    'Useful for testing:',
    '  - "diverged" warning rendering (pull --rebase / merge prompts)',
    '  - ahead/behind dual counts in branch lists',
    '  - conflict-aware sync workflows',
  ].join('\n'),
  kind: 'branch',
  tags: ['upstream', 'tracking', 'diverged', 'remote'],
  contracts: [
    'main is checked out',
    'main has 4 commits',
    'main is 2 ahead and 2 behind origin/main',
    'main tracks origin/main',
    'worktree is clean',
  ],
  setup: chain(
    addCommit({ message: 'chore: initial', files: { 'README.md': '# repo\n' } }),
    addCommit({ message: 'feat: shared baseline', files: { 'src/baseline.ts': 'b\n' } }),
    addRemote('origin', '/fake/url'),
    // 2 upstream-only commits.
    withRemoteTracking('origin', 'main', chain(
      addCommit({ message: 'upstream X', files: { 'src/x.ts': 'x\n' } }),
      addCommit({ message: 'upstream Y', files: { 'src/y.ts': 'y\n' } }),
    )),
    // 2 local-only commits on top of the shared baseline.
    addCommit({ message: 'local M', files: { 'src/m.ts': 'm\n' } }),
    addCommit({ message: 'local N', files: { 'src/n.ts': 'n\n' } }),
    setUpstream('main', 'origin'),
  ),
})
