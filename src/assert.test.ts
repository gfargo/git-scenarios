/**
 * Tests for the `assertRepo(...)` fluent assertion API. Covers the
 * happy path (chains resolve to the snapshot), failure path (throws a
 * RepoAssertionError carrying assertion/expected/actual), chaining
 * semantics (one snapshot per chain), and the simple-git source form.
 */

import { assertRepo } from './assert'
import { InvalidArgumentError, RepoAssertionError } from './errors'
import { spinUpScenario } from './spinUpScenario'
import { createTempGitRepo, type TempGitRepo } from './tempGitRepo'

describe('assertRepo', () => {
  describe('feature-pr-ready', () => {
    let repo: TempGitRepo
    beforeAll(async () => {
      repo = await spinUpScenario('feature-pr-ready')
    })
    afterAll(async () => {
      await repo.cleanup()
    })

    it('passes a chain of true assertions and resolves to the snapshot', async () => {
      const snap = await assertRepo(repo)
        .onBranch('feat/widget-v2')
        .hasBranch('main')
        .cleanWorktree()
        .noConflicts()
        .noOperation()
        .commitCount(7)
      expect(snap.head.branch).toBe('feat/widget-v2')
    })

    it('throws RepoAssertionError on a wrong branch, with structured fields', async () => {
      expect.assertions(4)
      try {
        await assertRepo(repo).onBranch('main')
      } catch (error) {
        const e = error as RepoAssertionError
        expect(e).toBeInstanceOf(RepoAssertionError)
        expect(e.assertion).toBe('onBranch')
        expect(e.expected).toBe('main')
        expect(e.actual).toBe('feat/widget-v2')
      }
    })

    it('reports the first failing check in a chain', async () => {
      await expect(assertRepo(repo).cleanWorktree().commitCount(999)).rejects.toThrow(
        /999 commit/,
      )
    })

    it('works against a raw simple-git instance', async () => {
      const snap = await assertRepo(repo.git).onBranch('feat/widget-v2')
      expect(snap.commitCount).toBe(7)
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

    it('asserts the in-progress merge and conflicts', async () => {
      await assertRepo(repo).inOperation('merge').dirtyWorktree().hasConflict()
    })

    it('fails noConflicts() and names the conflicted paths', async () => {
      await expect(assertRepo(repo).noConflicts()).rejects.toThrow(/conflict/i)
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

    it('asserts staged / modified / untracked presence', async () => {
      await assertRepo(repo).hasStaged().hasModified().hasUntracked().dirtyWorktree()
    })
  })

  describe('branch-ahead-of-upstream', () => {
    let repo: TempGitRepo
    beforeAll(async () => {
      repo = await spinUpScenario('branch-ahead-of-upstream')
    })
    afterAll(async () => {
      await repo.cleanup()
    })

    it('asserts a positive ahead count', async () => {
      const snap = await repo.snapshot()
      await assertRepo(repo).ahead(snap.status.ahead).behind(0)
    })
  })

  describe('aheadOf / behindOf', () => {
    let repo: TempGitRepo

    beforeAll(async () => {
      repo = await createTempGitRepo()
      // Commit A on main, tag it as v0, then add commit B.
      // HEAD (B) is then 1 ahead of v0 and 0 behind v0.
      await repo.writeFile('a.txt', '1')
      await repo.commitAll('base commit')
      await repo.git.raw(['tag', 'v0'])   // lightweight tag at commit A
      await repo.writeFile('a.txt', '2')
      await repo.commitAll('extra commit') // commit B — now 1 ahead of v0
    })

    afterAll(async () => {
      await repo.cleanup()
    })

    it('aheadOf passes when the ahead count matches', async () => {
      await assertRepo(repo).aheadOf('v0', 1)
    })

    it('aheadOf throws RepoAssertionError on mismatch', async () => {
      const err = await assertRepo(repo).aheadOf('v0', 5).then(() => null, (e) => e)
      expect(err).toBeInstanceOf(RepoAssertionError)
      const rae = err as RepoAssertionError
      expect(rae.assertion).toBe('aheadOf')
      expect(rae.expected).toBe(5)
      expect(rae.actual).toBe(1)
    })

    it('behindOf passes when the behind count matches (v0 is ancestor of HEAD → 0 behind)', async () => {
      await assertRepo(repo).behindOf('v0', 0)
    })

    it('behindOf throws RepoAssertionError on mismatch', async () => {
      await expect(assertRepo(repo).behindOf('v0', 99)).rejects.toThrow(/99.*behind.*"v0"/)
    })

    it('aheadOf works with a raw SimpleGit instance', async () => {
      await assertRepo(repo.git).aheadOf('v0', 1)
    })

    it('aheadOf throws InvalidArgumentError for plain snapshot sources', () => {
      const plainSource = { snapshot: () => Promise.resolve({} as never) }
      expect(() => assertRepo(plainSource).aheadOf('v0', 1)).toThrow(InvalidArgumentError)
    })

    it('can combine aheadOf and behindOf in one chain', async () => {
      await assertRepo(repo).aheadOf('v0', 1).behindOf('v0', 0)
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

    it('asserts a detached HEAD', async () => {
      await assertRepo(repo).detached()
    })

    it('fails onBranch with a detached-HEAD-aware message', async () => {
      await expect(assertRepo(repo).onBranch('main')).rejects.toThrow(/detached/)
    })
  })
})
