import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { branchSyncShowcaseScenario } from './branch-sync-showcase'

describe('branch-sync-showcase scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await branchSyncShowcaseScenario.setup(repo)
  }, 60_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('has main checked out', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
  })

  it('main is 2 commits behind origin/main', async () => {
    const status = await repo.git.status()
    expect(status.tracking).toBe('origin/main')
    expect(status.behind).toBe(2)
    expect(status.ahead).toBe(0)
  })

  it('feat/ahead-only is 3 commits ahead of origin/feat/ahead-only', async () => {
    // Compute the divergence directly from the rev-list count. Avoids
    // the side effect of checking out the branch, which would mutate
    // the worktree.
    const aheadStr = (
      await repo.git.raw([
        'rev-list',
        '--count',
        'origin/feat/ahead-only..feat/ahead-only',
      ])
    ).trim()
    const behindStr = (
      await repo.git.raw([
        'rev-list',
        '--count',
        'feat/ahead-only..origin/feat/ahead-only',
      ])
    ).trim()
    expect(Number.parseInt(aheadStr, 10)).toBe(3)
    expect(Number.parseInt(behindStr, 10)).toBe(0)
  })

  it('feat/diverged is 2 ahead and 2 behind origin/feat/diverged', async () => {
    const aheadStr = (
      await repo.git.raw([
        'rev-list',
        '--count',
        'origin/feat/diverged..feat/diverged',
      ])
    ).trim()
    const behindStr = (
      await repo.git.raw([
        'rev-list',
        '--count',
        'feat/diverged..origin/feat/diverged',
      ])
    ).trim()
    expect(Number.parseInt(aheadStr, 10)).toBe(2)
    expect(Number.parseInt(behindStr, 10)).toBe(2)
  })

  it('feat/synced points at the same commit as origin/feat/synced', async () => {
    const localSha = (await repo.git.revparse(['feat/synced'])).trim()
    const remoteSha = (await repo.git.revparse(['refs/remotes/origin/feat/synced'])).trim()
    expect(localSha).toBe(remoteSha)
  })

  it('local-only has no upstream configured', async () => {
    // `git config --get branch.local-only.remote` either rejects with
    // an exit-1 error, or simple-git returns an empty string — depends
    // on the simple-git version's plumbing. Accept either as "no
    // upstream configured".
    let value = ''
    try {
      value = (
        await repo.git.raw(['config', '--get', 'branch.local-only.remote'])
      ).trim()
    } catch {
      value = ''
    }
    expect(value).toBe('')
  })

  it('all four tracked branches have branch.<X>.remote = origin', async () => {
    for (const branch of ['main', 'feat/ahead-only', 'feat/diverged', 'feat/synced']) {
      const remote = (
        await repo.git.raw(['config', '--get', `branch.${branch}.remote`])
      ).trim()
      expect(remote).toBe('origin')
    }
  })

  it('has the expected five local branches', async () => {
    const branches = await repo.git.branchLocal()
    const names = branches.all.sort()
    expect(names).toEqual([
      'feat/ahead-only',
      'feat/diverged',
      'feat/synced',
      'local-only',
      'main',
    ])
  })

  it('worktree is clean', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
