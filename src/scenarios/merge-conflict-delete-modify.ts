/**
 * `merge-conflict-delete-modify` — a repo mid-merge with a delete/modify
 * conflict: `main` deleted `src/component.ts` while `feat/x` modified it.
 *
 * State after setup:
 *   - `main` has 3 commits — scaffold, baseline `src/component.ts`, and
 *     a commit that deletes it
 *   - `feat/x` has 2 commits forked from the baseline — a modification
 *     to `src/component.ts`
 *   - `main` is checked out, `git merge feat/x` was attempted
 *   - `src/component.ts` exists in the worktree with `feat/x` content
 *     (git leaves the modified version when the delete conflicts)
 *   - No conflict markers — the conflict is expressed as a `DU` entry
 *     in `git status --porcelain`
 *   - `MERGE_HEAD` is set; `git status` reports 1 unresolved conflict
 *
 * EXTRACTION DISCIPLINE: no coco-specific imports.
 */

import {
  addCommit,
  chain,
  checkoutBranch,
  commit,
  defineScenario,
  deleteFiles,
  stageFiles,
  startMerge,
  switchToBranch,
} from '../atoms'

const componentSource = (version: string): string =>
  [`export const component = {`, `  version: "${version}",`, `}`, ``].join('\n')

export const mergeConflictDeleteModifyScenario = defineScenario({
  name: 'merge-conflict-delete-modify',
  summary: 'in-progress merge with a delete/modify conflict on src/component.ts',
  description: [
    'A repository mid-merge, blocked on a delete/modify conflict.',
    '`main` deleted `src/component.ts` while `feat/x` modified it.',
    'Running `git merge feat/x` on `main` detected the conflict and',
    'left the merge uncommitted.',
    '',
    'Unlike content conflicts, there are no in-file conflict markers.',
    'Git leaves `src/component.ts` in the worktree with the content',
    'from `feat/x` (the modifying side). The conflict is expressed as',
    'a `DU` entry in `git status --porcelain` (deleted by us, modified',
    'by them).',
    '',
    'Useful for testing:',
    '  - conflict views that must handle delete-side conflicts',
    '  - tools that show "deleted by us" in their conflicts UI',
    '  - the "keep theirs / remove file" resolution paths',
  ].join('\n'),
  kind: 'operation',
  tags: ['conflict', 'merge', 'delete'],
  contracts: [
    'main is checked out',
    'a merge is in progress (MERGE_HEAD exists)',
    'src/component.ts was deleted on main but modified on feat/x',
    'src/component.ts exists in the worktree with feat/x content (no conflict markers)',
    'exactly 1 unresolved conflict (DU status: deleted by us, modified by them)',
  ],
  setup: chain(
    // === baseline shared by both branches ===
    addCommit({ message: 'chore: initial scaffold', files: { 'README.md': '# Project\n' } }),
    addCommit({
      message: 'feat: add component',
      files: { 'src/component.ts': componentSource('1.0') },
    }),

    // === feat/x — modifies the component ===
    switchToBranch('feat/x'),
    addCommit({
      message: 'feat: update component to v2',
      files: { 'src/component.ts': componentSource('2.0') },
    }),

    // === main — deletes the component ===
    checkoutBranch('main'),
    deleteFiles('src/component.ts'),
    stageFiles('src/component.ts'),
    commit('refactor: remove component'),

    // === merge attempt — leaves delete/modify conflict ===
    startMerge('feat/x'),
  ),
})
