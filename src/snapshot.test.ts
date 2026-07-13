/**
 * Tests for `repo.snapshot()` / `snapshotRepo` — the structured
 * repo-state primitive. We exercise it against a spread of built-in
 * scenarios so each field (HEAD, branches, status split, in-progress
 * operation, conflicts, stashes, commit count) is covered by at least
 * one real state.
 */

import { addCommit, chain, renameFile } from './atoms'
import { spinUpScenario } from './spinUpScenario'
import { createTempGitRepo } from './tempGitRepo'
import type { TempGitRepo } from './tempGitRepo'

describe('repo.snapshot()', () => {
  describe('empty repo', () => {
    let repo: TempGitRepo
    beforeAll(async () => {
      repo = await createTempGitRepo()
    })
    afterAll(async () => {
      await repo.cleanup()
    })

    it('reports the initial branch with no commits and a clean tree', async () => {
      const snap = await repo.snapshot()
      expect(snap.head.branch).toBe('main')
      expect(snap.head.detached).toBe(false)
      expect(snap.head.sha).toBeNull()
      expect(snap.commitCount).toBe(0)
      expect(snap.status.clean).toBe(true)
      expect(snap.operation).toBeNull()
      expect(snap.conflicts).toEqual([])
      expect(snap.graph).toEqual([])
    })
  })

  describe('feature-pr-ready (clean feature branch)', () => {
    let repo: TempGitRepo
    beforeAll(async () => {
      repo = await spinUpScenario('feature-pr-ready')
    })
    afterAll(async () => {
      await repo.cleanup()
    })

    it('reports the checked-out branch, sha, and clean tree', async () => {
      const snap = await repo.snapshot()
      expect(snap.head.branch).toBe('feat/widget-v2')
      expect(snap.head.detached).toBe(false)
      expect(snap.head.sha).toMatch(/^[0-9a-f]{7,}$/)
      expect(snap.status.clean).toBe(true)
      expect(snap.operation).toBeNull()
    })

    it('lists both local branches', async () => {
      const snap = await repo.snapshot()
      expect(snap.branches).toEqual(expect.arrayContaining(['main', 'feat/widget-v2']))
    })

    it('counts the commits reachable from HEAD', async () => {
      const snap = await repo.snapshot()
      // 3 on main + 4 on the feature branch
      expect(snap.commitCount).toBe(7)
      expect(snap.graph.length).toBeGreaterThan(0)
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

    it('reports detached HEAD with a sha but no branch', async () => {
      const snap = await repo.snapshot()
      expect(snap.head.detached).toBe(true)
      expect(snap.head.branch).toBeNull()
      expect(snap.head.sha).toMatch(/^[0-9a-f]{7,}$/)
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

    it('detects the in-progress merge and its conflicts', async () => {
      const snap = await repo.snapshot()
      expect(snap.operation).toBe('merge')
      expect(snap.conflicts.length).toBeGreaterThan(0)
      expect(snap.status.clean).toBe(false)
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

    it('detects the in-progress rebase', async () => {
      const snap = await repo.snapshot()
      expect(snap.operation).toBe('rebase')
    })
  })

  describe('partial-stage (staged + unstaged + untracked)', () => {
    let repo: TempGitRepo
    beforeAll(async () => {
      repo = await spinUpScenario('partial-stage')
    })
    afterAll(async () => {
      await repo.cleanup()
    })

    it('splits changes by stage', async () => {
      const snap = await repo.snapshot()
      expect(snap.status.clean).toBe(false)
      expect(snap.status.staged.length).toBeGreaterThan(0)
      expect(snap.status.modified.length).toBeGreaterThan(0)
      expect(snap.status.untracked.length).toBeGreaterThan(0)
    })
  })

  describe('staged rename', () => {
    let repo: TempGitRepo
    beforeAll(async () => {
      repo = await createTempGitRepo()
      await chain(
        addCommit({ message: 'init', files: { 'old.ts': 'content\n' } }),
        renameFile('old.ts', 'new.ts'),
      )(repo)
    })
    afterAll(async () => {
      await repo.cleanup()
    })

    it('reports the new path, not the raw "old -> new" porcelain line', async () => {
      const snap = await repo.snapshot()
      expect(snap.status.staged).toContain('new.ts')
      expect(snap.status.staged).not.toContain('old.ts -> new.ts')
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

    it('reports a positive ahead count against the upstream', async () => {
      const snap = await repo.snapshot()
      expect(snap.status.ahead).toBeGreaterThan(0)
      expect(snap.status.behind).toBe(0)
    })
  })

  describe('branch-behind-upstream', () => {
    let repo: TempGitRepo
    beforeAll(async () => {
      repo = await spinUpScenario('branch-behind-upstream')
    })
    afterAll(async () => {
      await repo.cleanup()
    })

    it('reports a positive behind count against the upstream', async () => {
      const snap = await repo.snapshot()
      expect(snap.status.behind).toBeGreaterThan(0)
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

    it('counts stash entries', async () => {
      const snap = await repo.snapshot()
      expect(snap.stashes).toBeGreaterThan(0)
    })
  })

  it('is deterministic — two runs of one scenario snapshot identically', async () => {
    const a = await spinUpScenario('feature-pr-ready')
    const b = await spinUpScenario('feature-pr-ready')
    try {
      expect(await a.snapshot()).toEqual(await b.snapshot())
    } finally {
      await a.cleanup()
      await b.cleanup()
    }
  })
})
