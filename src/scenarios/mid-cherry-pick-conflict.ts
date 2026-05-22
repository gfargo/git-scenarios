/**
 * `mid-cherry-pick-conflict` — a repo mid-cherry-pick with one
 * unresolved conflict. A commit from `feat/hotfix` is cherry-picked
 * onto `main` where the same file was edited differently, leaving
 * the repo in a paused cherry-pick state.
 *
 * State after setup:
 *   - `main` is checked out
 *   - `CHERRY_PICK_HEAD` is set
 *   - `src/utils.ts` has unresolved conflict markers
 *   - `git status` reports the cherry-pick as in progress
 *
 * Distinct from merge/rebase conflicts because:
 *   - The `.git` state file is `CHERRY_PICK_HEAD` (not MERGE_HEAD or rebase-merge/)
 *   - Tools render cherry-pick conflicts differently
 *   - The resolution flow is `git cherry-pick --continue` or `--abort`
 *
 * EXTRACTION DISCIPLINE: no coco-specific imports.
 */

import {
    addCommit,
    chain,
    checkoutBranch,
    cherryPick,
    defineScenario,
    switchToBranch,
} from '../atoms'

const utilsSource = (impl: string): string =>
  [`export function formatDate(date: Date): string {`, `  return ${impl}`, `}`, ``].join('\n')

export const midCherryPickConflictScenario = defineScenario({
  name: 'mid-cherry-pick-conflict',
  summary: 'in-progress cherry-pick with one unresolved conflict in src/utils.ts',
  description: [
    'A repository mid-cherry-pick, blocked on one unresolved conflict.',
    'A commit from `feat/hotfix` is being cherry-picked onto `main`',
    'where both branches edited `src/utils.ts` differently after',
    'forking from a shared baseline. `CHERRY_PICK_HEAD` is set and',
    'the conflicted file has markers in the worktree.',
    '',
    'Useful for testing:',
    '  - cherry-pick-specific conflict resolution UI',
    '  - title-bar "CHERRY-PICKING" indicator',
    '  - distinguishing cherry-pick state from merge/rebase states',
    '  - `git cherry-pick --continue` / `--abort` flows',
  ].join('\n'),
  kind: 'operation',
  tags: ['conflict', 'cherry-pick'],
  contracts: [
    'main is checked out',
    'a cherry-pick is in progress (CHERRY_PICK_HEAD exists)',
    'src/utils.ts has unresolved conflict markers',
    'exactly 1 unresolved conflict',
  ],
  setup: chain(
    // === baseline shared by both branches ===
    addCommit({ message: 'chore: initial scaffold', files: { 'README.md': '# Utils\n' } }),
    addCommit({
      message: 'feat: baseline utils',
      files: { 'src/utils.ts': utilsSource('date.toISOString()') },
    }),

    // === feat/hotfix — changes the implementation ===
    switchToBranch('feat/hotfix'),
    addCommit({
      message: 'fix: use locale string for dates',
      files: { 'src/utils.ts': utilsSource('date.toLocaleString()') },
    }),

    // === main — conflicting change to the same function ===
    checkoutBranch('main'),
    addCommit({
      message: 'feat: use UTC string for dates',
      files: { 'src/utils.ts': utilsSource('date.toUTCString()') },
    }),

    // === cherry-pick the hotfix commit onto main — produces conflict ===
    cherryPick('feat/hotfix'),
  ),
})
