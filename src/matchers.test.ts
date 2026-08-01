/**
 * Tests for the `expect(...)` matchers. Registers them via
 * `expect.extend` (the same call consumers make in a setup file) and
 * exercises pass, fail, and `.not` paths against real scenarios.
 */

import { matchers } from './matchers'
import { spinUpScenario } from './spinUpScenario'
import { createTempGitRepo, type TempGitRepo } from './tempGitRepo'

expect.extend(matchers)

describe('expect matchers', () => {
  describe('feature-pr-ready', () => {
    let repo: TempGitRepo
    beforeAll(async () => {
      repo = await spinUpScenario('feature-pr-ready')
    })
    afterAll(async () => {
      await repo.cleanup()
    })

    it('matches branch, clean worktree, and commit count', async () => {
      await expect(repo).toBeOnBranch('feat/widget-v2')
      await expect(repo).toHaveCleanWorktree()
      await expect(repo).toHaveCommitCount(7)
      await expect(repo).toHaveNoConflicts()
    })

    it('supports .not', async () => {
      await expect(repo).not.toBeOnBranch('main')
      await expect(repo).not.toBeMidMerge()
      await expect(repo).not.toHaveDirtyWorktree()
    })

    it('produces a helpful message on failure', async () => {
      await expect(expect(repo).toBeOnBranch('main')).rejects.toThrow(/feat\/widget-v2/)
    })
  })

  describe('mid-merge-conflict', () => {
    let repo: TempGitRepo
    beforeAll(async () => {
      repo = await spinUpScenario('mid-merge-conflict')
    })
    afterAll(async () => {
      await repo.cleanup()
    })

    it('matches the in-progress merge and conflicts', async () => {
      await expect(repo).toBeMidMerge()
      await expect(repo).toBeMidOperation('merge')
      await expect(repo).toHaveConflictIn()
      await expect(repo).toHaveDirtyWorktree()
    })

    it('.not.toHaveNoConflicts holds when conflicts exist', async () => {
      await expect(repo).not.toHaveNoConflicts()
    })
  })

  describe('mid-rebase-conflict', () => {
    let repo: TempGitRepo
    beforeAll(async () => {
      repo = await spinUpScenario('mid-rebase-conflict')
    })
    afterAll(async () => {
      await repo.cleanup()
    })

    it('matches the in-progress rebase', async () => {
      await expect(repo).toBeMidRebase()
    })
  })

  describe('partial-stage', () => {
    let repo: TempGitRepo
    beforeAll(async () => {
      repo = await spinUpScenario('partial-stage')
    })
    afterAll(async () => {
      await repo.cleanup()
    })

    it('matches staged / modified / untracked presence', async () => {
      await expect(repo).toHaveStagedFile()
      await expect(repo).toHaveModifiedFile()
      await expect(repo).toHaveUntrackedFile()
    })
  })

  describe('detached-head', () => {
    let repo: TempGitRepo
    beforeAll(async () => {
      repo = await spinUpScenario('detached-head')
    })
    afterAll(async () => {
      await repo.cleanup()
    })

    it('matches a detached HEAD', async () => {
      await expect(repo).toBeDetached()
    })
  })

  describe('stashed-changes', () => {
    let repo: TempGitRepo
    beforeAll(async () => {
      repo = await spinUpScenario('stashed-changes')
    })
    afterAll(async () => {
      await repo.cleanup()
    })

    it('matches the presence of a stash', async () => {
      await expect(repo).toHaveStash()
    })
  })

  describe('toBeAheadOf / toBeBehindOf', () => {
    let repo: TempGitRepo

    beforeAll(async () => {
      repo = await createTempGitRepo()
      // commit A, tag it as v0, then add commit B — HEAD is 1 ahead of v0
      await repo.writeFile('a.txt', '1')
      await repo.commitAll('base commit')
      await repo.git.raw(['tag', 'v0'])
      await repo.writeFile('a.txt', '2')
      await repo.commitAll('extra commit')
    })

    afterAll(async () => {
      await repo.cleanup()
    })

    it('toBeAheadOf passes when ahead count matches', async () => {
      await expect(repo).toBeAheadOf('v0', 1)
    })

    it('toBeAheadOf fails with a descriptive message on mismatch', async () => {
      await expect(expect(repo).toBeAheadOf('v0', 5)).rejects.toThrow(/5.*ahead.*"v0"/)
    })

    it('.not.toBeAheadOf passes when the count does not match', async () => {
      await expect(repo).not.toBeAheadOf('v0', 5)
    })

    it('toBeBehindOf passes when behind count matches (ancestor tag → 0 behind)', async () => {
      await expect(repo).toBeBehindOf('v0', 0)
    })

    it('toBeBehindOf fails with a descriptive message on mismatch', async () => {
      await expect(expect(repo).toBeBehindOf('v0', 3)).rejects.toThrow(/3.*behind.*"v0"/)
    })

    it('.not.toBeBehindOf passes when the count does not match', async () => {
      await expect(repo).not.toBeBehindOf('v0', 3)
    })
  })

  describe('toBeInSyncWithUpstream', () => {
    it('fails for a repo with no upstream configured', async () => {
      const repo = await createTempGitRepo()
      try {
        await repo.writeFile('README.md', '# repo\n')
        await repo.commitAll('init')
        await expect(expect(repo).toBeInSyncWithUpstream()).rejects.toThrow(/no upstream/i)
        // .not passes when no upstream — the assertion itself fails
        await expect(repo).not.toBeInSyncWithUpstream()
      } finally {
        await repo.cleanup()
      }
    })

    it('fails for feature-pr-ready (clean branch but no upstream)', async () => {
      const repo = await spinUpScenario('feature-pr-ready')
      try {
        await expect(repo).not.toBeInSyncWithUpstream()
      } finally {
        await repo.cleanup()
      }
    })

    it('passes for branch-tracking-upstream (synced)', async () => {
      const repo = await spinUpScenario('branch-tracking-upstream')
      try {
        await expect(repo).toBeInSyncWithUpstream()
      } finally {
        await repo.cleanup()
      }
    })
  })
})
