/**
 * Tests for the `expect(...)` matchers. Registers them via
 * `expect.extend` (the same call consumers make in a setup file) and
 * exercises pass, fail, and `.not` paths against real scenarios.
 */

import { matchers } from './matchers'
import { spinUpScenario } from './spinUpScenario'
import type { TempGitRepo } from './tempGitRepo'

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
})
