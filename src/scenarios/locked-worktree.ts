/**
 * `locked-worktree` — a repo with a linked worktree that has been locked
 * via `git worktree lock`.
 *
 * State after setup:
 *   - `main` is checked out in the primary worktree (1 commit)
 *   - 1 linked worktree exists on `hotfix/reserved`, locked with a reason
 *   - `git worktree list --porcelain` shows `locked <reason>` for it
 *   - `.git/worktrees/<name>/locked` contains the lock reason
 *
 * Locked worktrees resist removal (`git worktree remove` fails without
 * `--force`). This models the "reserved for a release" use case where a
 * worktree must not be accidentally deleted.
 *
 * EXTRACTION DISCIPLINE: no coco-specific imports.
 */

import { addCommit, chain, defineScenario } from '../atoms'
import { mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import type { Step } from '../atoms/types'

export const LOCKED_WORKTREE_REASON = 'reserved for hotfix release'

/**
 * Create a worktree at a fresh temp path, then lock it with a reason.
 * Inlined here (vs composing addWorktree + lockWorktree atoms) because
 * the worktree path must be generated at run time and shared between the
 * two git commands — the same pattern used by `multiple-worktrees.ts`.
 */
function addAndLockWorktree(branch: string, reason: string): Step {
  return async (repo) => {
    await repo.git.raw(['branch', branch])
    const wtPath = await mkdtemp(
      join(tmpdir(), `git-scenarios-wt-${branch.replace(/\//g, '-')}-`),
    )
    await repo.git.raw(['worktree', 'add', wtPath, branch])
    await repo.git.raw(['worktree', 'lock', '--reason', reason, wtPath])
  }
}

export const lockedWorktreeScenario = defineScenario({
  name: 'locked-worktree',
  summary: 'primary worktree on main + 1 linked worktree locked with a reason',
  description: [
    'A repository with one linked worktree that has been locked via',
    '`git worktree lock`. Locked worktrees appear in `git worktree list`',
    'with a `locked <reason>` annotation and resist removal without `--force`.',
    '',
    'Useful for testing:',
    '  - worktree list rendering when a worktree is locked',
    '  - locked-worktree badge / indicator in the worktree panel',
    '  - error handling when trying to delete a locked worktree',
    '  - unlock flow (`git worktree unlock`) before safe removal',
  ].join('\n'),
  kind: 'worktree',
  tags: ['worktree', 'locked', 'in-progress'],
  contracts: [
    '1 linked worktree exists',
    'the linked worktree is locked',
    'git worktree list --porcelain shows locked with a reason',
    '.git/worktrees/ has a locked file for the linked worktree',
  ],
  setup: chain(
    addCommit({
      message: 'chore: initial scaffold',
      files: {
        'README.md': '# Project\n',
        'src/index.ts': 'export {}\n',
      },
    }),
    addAndLockWorktree('hotfix/reserved', LOCKED_WORKTREE_REASON),
  ),
})
