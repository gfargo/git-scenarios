/**
 * `mid-rebase-conflict` — a repo mid-rebase with one unresolved conflict.
 * A feature branch rebases onto `main` where both branches edited the
 * same file, leaving the repo in a paused rebase state.
 *
 * State after setup:
 *   - `feat/refactor` was being rebased onto `main`
 *   - `src/config.ts` has unresolved conflict markers
 *   - `.git/rebase-merge/` exists (rebase in progress)
 *   - `REBASE_HEAD` is set
 *   - `git status` reports the rebase as in progress
 *
 * Distinct from `mid-merge-conflict` because:
 *   - The `.git` state files differ (rebase-merge/ vs MERGE_HEAD)
 *   - Tools render rebase conflicts differently (showing "applying commit X")
 *   - The resolution flow differs (--continue vs commit)
 *
 * EXTRACTION DISCIPLINE: no coco-specific imports.
 */

import {
    addCommit,
    chain,
    checkoutBranch,
    defineScenario,
    startRebase,
    switchToBranch,
} from '../atoms'

const configSource = (env: string): string =>
  [`export const config = {`, `  env: "${env}",`, `  debug: false,`, `  port: 3000,`, `}`, ``].join('\n')

export const midRebaseConflictScenario = defineScenario({
  name: 'mid-rebase-conflict',
  summary: 'in-progress rebase with one unresolved conflict in src/config.ts',
  description: [
    'A repository mid-rebase, blocked on one unresolved conflict.',
    '`feat/refactor` is being rebased onto `main` where both branches',
    'edited `src/config.ts` after forking from a shared baseline.',
    'The rebase paused at the conflicting commit; `.git/rebase-merge/`',
    'exists and `REBASE_HEAD` is set.',
    '',
    'Useful for testing:',
    '  - rebase-specific conflict resolution UI',
    '  - title-bar "REBASING" indicator',
    '  - the difference between merge and rebase conflict states',
    '  - `git rebase --continue` / `--abort` flows',
  ].join('\n'),
  kind: 'operation',
  tags: ['conflict', 'rebase'],
  contracts: [
    'a rebase is in progress (.git/rebase-merge/ exists)',
    'REBASE_HEAD is set',
    'src/config.ts has unresolved conflict markers',
    'exactly 1 unresolved conflict',
  ],
  setup: chain(
    // === baseline shared by both branches ===
    addCommit({ message: 'chore: initial scaffold', files: { 'README.md': '# Config Service\n' } }),
    addCommit({ message: 'feat: baseline config', files: { 'src/config.ts': configSource('development') } }),

    // === feat/refactor — changes the config env to "staging" ===
    switchToBranch('feat/refactor'),
    addCommit({
      message: 'refactor: use staging env',
      files: { 'src/config.ts': configSource('staging') },
    }),

    // === main — conflicting change to "production" ===
    checkoutBranch('main'),
    addCommit({
      message: 'feat: switch to production env',
      files: { 'src/config.ts': configSource('production') },
    }),

    // === rebase feat/refactor onto main — produces conflict ===
    checkoutBranch('feat/refactor'),
    startRebase('main'),
  ),
})
