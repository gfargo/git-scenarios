/**
 * `merge-conflict-rename-rename` — a repo mid-merge with a rename/rename
 * conflict: both branches renamed `orig.txt` to different names.
 *
 * State after setup:
 *   - `main` has 3 commits — scaffold, baseline `orig.txt`, and a
 *     rename to `main-name.txt`
 *   - `feat/x` has 2 commits forked from the baseline — a rename to
 *     `feat-name.txt`
 *   - `main` is checked out, `git merge feat/x` was attempted
 *   - `main-name.txt` and `feat-name.txt` both exist in the worktree
 *   - `orig.txt` is absent (deleted by both sides — `DD` in the index)
 *   - `MERGE_HEAD` is set; `git status` reports `AU`, `UA`, and `DD`
 *     entries for the three conflicted paths
 *
 * Git does NOT inject conflict markers for rename/rename conflicts —
 * both renamed files appear as distinct, unmarked files. The conflict
 * is expressed as unresolved index entries rather than in-file markers.
 *
 * EXTRACTION DISCIPLINE: no coco-specific imports.
 */

import {
  addCommit,
  chain,
  checkoutBranch,
  commit,
  defineScenario,
  renameFile,
  startMerge,
  switchToBranch,
} from '../atoms'

export const mergeConflictRenameRenameScenario = defineScenario({
  name: 'merge-conflict-rename-rename',
  summary: 'in-progress merge with a rename/rename conflict (orig.txt → two different names)',
  description: [
    'A repository mid-merge, blocked on a rename/rename conflict.',
    '`main` renamed `orig.txt` to `main-name.txt`; `feat/x` renamed',
    'the same file to `feat-name.txt`. Running `git merge feat/x` on',
    '`main` detected the conflicting renames and left the merge',
    'uncommitted.',
    '',
    'Unlike content conflicts, there are no in-file conflict markers.',
    'Both renamed files exist in the worktree as ordinary files; the',
    'conflict is expressed as unresolved index entries (`AU`, `UA`,',
    '`DD` in `git status --porcelain`). `orig.txt` is absent because',
    'both sides deleted it (via the rename).',
    '',
    'Useful for testing:',
    '  - conflict views that must handle non-marker conflict types',
    '  - rename detection and display in diff/status tools',
    '  - tooling that reads git index stage entries (stages 1-3)',
  ].join('\n'),
  kind: 'operation',
  tags: ['conflict', 'merge', 'rename'],
  contracts: [
    'main is checked out',
    'a merge is in progress (MERGE_HEAD exists)',
    'orig.txt was renamed to main-name.txt on main and to feat-name.txt on feat/x',
    'main-name.txt and feat-name.txt both exist in the worktree (no conflict markers)',
    'orig.txt is absent from the worktree (DD — deleted by both sides)',
    'at least 2 unresolved conflicts (AU/UA/DD index entries)',
  ],
  setup: chain(
    // === baseline shared by both branches ===
    addCommit({ message: 'chore: initial scaffold', files: { 'README.md': '# Project\n' } }),
    addCommit({ message: 'chore: add shared file', files: { 'orig.txt': 'shared content\n' } }),

    // === feat/x — renames orig.txt to feat-name.txt ===
    switchToBranch('feat/x'),
    renameFile('orig.txt', 'feat-name.txt'),
    commit('refactor: rename orig.txt to feat-name.txt'),

    // === main — renames orig.txt to a different name ===
    checkoutBranch('main'),
    renameFile('orig.txt', 'main-name.txt'),
    commit('refactor: rename orig.txt to main-name.txt'),

    // === merge attempt — leaves rename/rename conflict ===
    startMerge('feat/x'),
  ),
})
