/**
 * `interactive-rebase-mid-edit` — a repo mid-interactive-rebase, paused at
 * the first `edit` action with two remaining picks in the todo list.
 *
 * State after setup:
 *   - 4 commits were on `main` before the rebase started
 *   - `git rebase -i HEAD~3` was launched; the first of the 3 commits
 *     in the range was marked `edit`, the rebase applied it and paused
 *   - `.git/rebase-merge/` exists (rebase in progress)
 *   - `.git/rebase-merge/interactive` exists (interactive-rebase marker)
 *   - HEAD is detached at the applied commit
 *   - `.git/rebase-merge/git-rebase-todo` has 2 remaining picks
 *
 * Distinct from `mid-rebase-conflict` because:
 *   - No conflict markers — the rebase paused at `edit`, not a conflict
 *   - The user is expected to amend the current commit, then `--continue`
 *   - `REBASE_HEAD` is NOT set (no conflict pending)
 *
 * EXTRACTION DISCIPLINE: no coco-specific imports.
 */

import { addCommit, chain, defineScenario, startInteractiveRebase } from '../atoms'

export const interactiveRebaseMidEditScenario = defineScenario({
  name: 'interactive-rebase-mid-edit',
  summary: 'interactive rebase paused at an edit action with 2 remaining picks',
  description: [
    'A repository mid-interactive-rebase, stopped at the first commit',
    'marked `edit`. Three commits are in the rebase range (`HEAD~3`);',
    'the first was applied and the rebase paused so the user can amend it.',
    'Two picks remain in `.git/rebase-merge/git-rebase-todo`.',
    '',
    'Useful for testing:',
    '  - detecting interactive-rebase state (`.git/rebase-merge/interactive`)',
    '  - distinguishing `edit`-pause from conflict-pause (no conflict markers,',
    '    no `REBASE_HEAD`, HEAD is at the applied commit not a pre-apply detach)',
    '  - displaying the remaining todo list and the current edit position',
    '  - `git rebase --continue` / `--abort` flows in the edit (non-conflict) case',
  ].join('\n'),
  kind: 'operation',
  tags: ['rebase', 'interactive', 'in-progress'],
  contracts: [
    'a rebase is in progress (.git/rebase-merge/ exists)',
    '.git/rebase-merge/interactive exists',
    'HEAD is detached',
    '.git/rebase-merge/git-rebase-todo has at least 1 remaining pick',
  ],
  setup: chain(
    addCommit({
      message: 'chore: initial scaffold',
      files: { 'README.md': '# Project\n' },
    }),
    addCommit({
      message: 'feat: add module a',
      files: { 'src/a.ts': 'export const a = 1\n' },
    }),
    addCommit({
      message: 'feat: add module b',
      files: { 'src/b.ts': 'export const b = 2\n' },
    }),
    addCommit({
      message: 'feat: add module c',
      files: { 'src/c.ts': 'export const c = 3\n' },
    }),
    // Rebase the 3 feature commits; the first becomes 'edit' so the
    // rebase pauses immediately, leaving 2 picks in the todo.
    startInteractiveRebase('HEAD~3'),
  ),
})
