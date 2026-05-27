/**
 * `merge-no-conflict` — a successfully completed `--no-ff` merge,
 * already committed. Distinct from `mid-merge-conflict` (in-progress)
 * and from a fast-forward merge (no merge commit produced).
 *
 * State after setup:
 *   - `main` has 3 commits + a merge commit at HEAD
 *   - `feat/x` is fully merged into `main` via `--no-ff`
 *   - the merge commit has 2 parents (main and feat/x's tip)
 *   - worktree is clean
 *   - main is checked out
 *
 * Useful for testing:
 *   - merge commit rendering (multi-parent display)
 *   - "merged branches" listings
 *   - tools that distinguish `--no-ff` merges from fast-forwards
 *   - history graph visualization
 */

import {
    addCommit,
    chain,
    checkoutBranch,
    defineScenario,
    startMerge,
    switchToBranch,
} from '../atoms'

export const mergeNoConflictScenario = defineScenario({
  name: 'merge-no-conflict',
  summary: 'a successful --no-ff merge of feat/x into main, fully committed',
  description: [
    'A repository with a completed `--no-ff` merge sitting at HEAD.',
    '`feat/x` was merged into `main` cleanly (no conflicts), and the',
    'merge commit is at the tip. Distinct from a fast-forward merge',
    '(no merge commit produced) and from `mid-merge-conflict`',
    '(in-progress).',
    '',
    'Useful for testing:',
    '  - merge commit rendering (the 2-parent case)',
    '  - "merged branches" lists',
    '  - tools that distinguish --no-ff from fast-forward merges',
    '  - history graph visualization with merge nodes',
  ].join('\n'),
  kind: 'history',
  tags: ['merge', 'no-ff', 'history'],
  contracts: [
    'main has the merge commit at HEAD',
    'HEAD has 2 parents',
    'worktree is clean',
    'main is checked out',
    'feat/x exists and is merged into main',
  ],
  setup: chain(
    // baseline on main
    addCommit({ message: 'chore: initial', files: { 'README.md': '# repo\n' } }),
    addCommit({ message: 'feat: baseline a', files: { 'src/a.ts': 'a\n' } }),

    // feat/x gets its own commit on a different file (no overlap → no conflict)
    switchToBranch('feat/x'),
    addCommit({ message: 'feat: add x', files: { 'src/x.ts': 'x\n' } }),

    // back to main, merge with --no-ff so a merge commit is produced
    checkoutBranch('main'),
    startMerge('feat/x', { noFastForward: true, message: 'Merge branch feat/x' }),
  ),
})
