/**
 * `merge-conflict-add-add` — a repo mid-merge with an add/add conflict:
 * both branches independently added `src/config.ts` with different content.
 *
 * State after setup:
 *   - `main` has 2 commits — scaffold (README only) and a new
 *     `src/config.ts` targeting production
 *   - `feat/x` has 2 commits forked from the scaffold — a new
 *     `src/config.ts` targeting development
 *   - `main` is checked out, `git merge feat/x` was attempted
 *   - `src/config.ts` has unresolved conflict markers (<<<<<<< / =======
 *     / >>>>>>>) because both sides added the same path with different
 *     content
 *   - `MERGE_HEAD` is set; `git status` reports the file as `AA`
 *     (added by both) with 1 unresolved conflict
 *
 * EXTRACTION DISCIPLINE: no coco-specific imports.
 */

import {
  addCommit,
  chain,
  checkoutBranch,
  defineScenario,
  startMerge,
  switchToBranch,
} from '../atoms'

const configSource = (env: string): string =>
  [`export const config = {`, `  env: "${env}",`, `}`, ``].join('\n')

export const mergeConflictAddAddScenario = defineScenario({
  name: 'merge-conflict-add-add',
  summary: 'in-progress merge with an add/add conflict on src/config.ts',
  description: [
    'A repository mid-merge, blocked on an add/add conflict.',
    'Both `main` and `feat/x` independently added `src/config.ts`',
    'with different environment values. Running `git merge feat/x`',
    'on `main` detected the conflicting additions and left the merge',
    'uncommitted.',
    '',
    'Unlike rename/rename and delete/modify conflicts, git does inject',
    'conflict markers here — the file has `<<<<<<<`, `=======`, and',
    '`>>>>>>>` sections showing both versions. The conflict appears as',
    'an `AA` (added by both) entry in `git status --porcelain`.',
    '',
    'Useful for testing:',
    '  - conflict views on newly-created files (no shared ancestor)',
    '  - add/add distinction from standard content (UU) conflicts',
    '  - merge resolution flows where neither side has a "base"',
  ].join('\n'),
  kind: 'operation',
  tags: ['conflict', 'merge', 'add'],
  contracts: [
    'main is checked out',
    'a merge is in progress (MERGE_HEAD exists)',
    'src/config.ts was independently added on both branches with different content',
    'src/config.ts has unresolved conflict markers',
    'exactly 1 unresolved conflict (AA status: added by both)',
  ],
  setup: chain(
    // === baseline — only README; config.ts does not exist yet ===
    addCommit({ message: 'chore: initial scaffold', files: { 'README.md': '# Project\n' } }),

    // === feat/x — adds config.ts targeting development ===
    switchToBranch('feat/x'),
    addCommit({
      message: 'feat: add config for development',
      files: { 'src/config.ts': configSource('development') },
    }),

    // === main — adds config.ts targeting production ===
    checkoutBranch('main'),
    addCommit({
      message: 'feat: add config for production',
      files: { 'src/config.ts': configSource('production') },
    }),

    // === merge attempt — leaves add/add conflict ===
    startMerge('feat/x'),
  ),
})
