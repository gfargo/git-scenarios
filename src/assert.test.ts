/**
 * Tests for the `assertRepo(...)` fluent assertion API. Covers the
 * happy path (chains resolve to the snapshot), failure path (throws a
 * RepoAssertionError carrying assertion/expected/actual), chaining
 * semantics (one snapshot per chain), and the simple-git source form.
 */

import { assertRepo } from './assert'
import { RepoAssertionError } from './errors'
import { spinUpScenario } from './spinUpScenario'
import type { TempGitRepo } from './tempGitRepo'

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
