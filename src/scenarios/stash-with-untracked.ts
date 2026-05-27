/**
 * `stash-with-untracked` — a repo with a single stash entry that
 * was created with `--include-untracked`. Tools display these
 * stashes differently because the entry contains both tracked-file
 * edits AND new files that didn't exist in HEAD.
 *
 * State after setup:
 *   - `main` has 2 commits
 *   - worktree is clean
 *   - exactly 1 stash on the stack
 *   - the stash includes:
 *     * a modification to a tracked file (`src/feature.ts`)
 *     * an untracked new file (`src/new-feature.ts`)
 *
 * Distinct from `stashed-changes` (3 stashes, all tracked-file
 * edits only).
 *
 * Useful for testing:
 *   - stash list rendering when entries contain new files
 *   - apply / pop flows that have to recreate untracked content
 *   - tools that show "this stash includes N untracked files"
 */

import {
    addCommit,
    chain,
    defineScenario,
    stashChanges,
    writeFiles,
} from '../atoms'

export const stashWithUntrackedScenario = defineScenario({
  name: 'stash-with-untracked',
  summary: 'one stash containing both modified tracked + untracked new files',
  description: [
    'A clean worktree on `main` with a single stash entry that was',
    'created with `--include-untracked`. The stash mixes a',
    'modification to an existing tracked file (`src/feature.ts`)',
    'with a brand-new untracked file (`src/new-feature.ts`) — the',
    'realistic shape of "I want to set my work aside and pick it',
    'up later" when that work includes scaffolding new files.',
    '',
    'Useful for testing:',
    '  - stash list rendering when entries contain new files',
    '  - apply / pop flows that have to recreate untracked content',
    '  - tools that highlight "stash includes N untracked files"',
  ].join('\n'),
  kind: 'stash',
  tags: ['stash', 'untracked', 'mixed-content'],
  contracts: [
    'main has 2 commits',
    'worktree is clean',
    'git stash list reports 1 entry',
    'the stash includes both modified tracked and untracked new files',
  ],
  setup: chain(
    addCommit({
      message: 'chore: initial scaffold',
      files: { 'README.md': '# stash demo\n' },
    }),
    addCommit({
      message: 'feat: baseline feature',
      files: { 'src/feature.ts': 'export const feature = "v1"\n' },
    }),
    // Modify a tracked file AND create a new untracked one.
    writeFiles({
      'src/feature.ts': 'export const feature = "v2 — WIP"\n',
      'src/new-feature.ts': 'export const newFeature = "in progress"\n',
    }),
    // Stash with --include-untracked so both end up in the stash.
    stashChanges({
      message: 'WIP: feature v2 + new-feature scaffolding',
      includeUntracked: true,
    }),
  ),
})
