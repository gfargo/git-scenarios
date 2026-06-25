import { existsSync, readdirSync } from 'fs'
import { join } from 'path'

import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { LOCKED_WORKTREE_REASON, lockedWorktreeScenario } from './locked-worktree'

describe('locked-worktree scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await lockedWorktreeScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    // Unlock and force-remove all linked worktrees before cleanup.
    try {
      const wtList = await repo.git.raw(['worktree', 'list', '--porcelain'])
      const paths = wtList
        .split('\n')
        .filter((l) => l.startsWith('worktree '))
        .map((l) => l.replace('worktree ', ''))
        .filter((p) => p !== repo.path)
      for (const p of paths) {
        try {
          await repo.git.raw(['worktree', 'unlock', p])
        } catch {
          /* already unlocked */
        }
        await repo.git.raw(['worktree', 'remove', '--force', p])
      }
    } catch {
      /* best effort */
    }
    await repo?.cleanup()
  })

  it('has 1 linked worktree', async () => {
    const wtList = await repo.git.raw(['worktree', 'list', '--porcelain'])
    const worktrees = wtList.split('\n').filter((l) => l.startsWith('worktree '))
    // 2 total: 1 primary + 1 linked
    expect(worktrees.length).toBe(2)
  })

  it('git worktree list --porcelain shows the linked worktree is locked', async () => {
    const out = await repo.git.raw(['worktree', 'list', '--porcelain'])
    // 'locked' line appears for the locked worktree (with or without reason)
    expect(out).toMatch(/^locked\b/m)
  })

  it('git worktree list --porcelain includes the lock reason', async () => {
    const out = await repo.git.raw(['worktree', 'list', '--porcelain'])
    expect(out).toContain(LOCKED_WORKTREE_REASON)
  })

  it('.git/worktrees/ has a locked file for the linked worktree', () => {
    const worktreesDir = join(repo.path, '.git', 'worktrees')
    const entries = readdirSync(worktreesDir)
    const hasLocked = entries.some((entry) =>
      existsSync(join(worktreesDir, entry, 'locked')),
    )
    expect(hasLocked).toBe(true)
  })
})
