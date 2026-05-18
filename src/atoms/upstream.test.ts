import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import {
  addCommit,
  addRemote,
  chain,
  checkoutBranch,
  setRemoteRef,
  setUpstream,
  switchToBranch,
  withRemoteTracking,
} from './'

async function withRepo(callback: (repo: TempGitRepo) => Promise<void>): Promise<void> {
  const repo = await createTempGitRepo()
  try {
    await callback(repo)
  } finally {
    await repo.cleanup()
  }
}

describe('setRemoteRef', () => {
  it('creates a remote-tracking ref pointing at the given sha', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'README.md': '# repo\n' } }),
        addCommit({ message: 'feat: one', files: { 'a.ts': 'a\n' } }),
        addRemote('origin', '/fake/url'),
        setRemoteRef('origin', 'main', 'HEAD'),
      )(repo)

      const headSha = (await repo.git.revparse(['HEAD'])).trim()
      const remoteRefSha = (await repo.git.revparse(['refs/remotes/origin/main'])).trim()
      expect(remoteRefSha).toBe(headSha)
    })
  })

  it('accepts relative refs like HEAD~1', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'README.md': '# repo\n' } }),
        addCommit({ message: 'feat: one', files: { 'a.ts': 'a\n' } }),
        addCommit({ message: 'feat: two', files: { 'b.ts': 'b\n' } }),
        addRemote('origin', '/fake/url'),
        setRemoteRef('origin', 'main', 'HEAD~2'),
      )(repo)

      const olderSha = (await repo.git.revparse(['HEAD~2'])).trim()
      const remoteRefSha = (await repo.git.revparse(['refs/remotes/origin/main'])).trim()
      expect(remoteRefSha).toBe(olderSha)
    })
  })

  it('accepts branch names as the sha argument', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'README.md': '# repo\n' } }),
        switchToBranch('feat/x'),
        addCommit({ message: 'feat: x', files: { 'x.ts': 'x\n' } }),
        checkoutBranch('main'),
        addRemote('origin', '/fake/url'),
        setRemoteRef('origin', 'feat/x', 'feat/x'),
      )(repo)

      const branchSha = (await repo.git.revparse(['feat/x'])).trim()
      const remoteRefSha = (await repo.git.revparse(['refs/remotes/origin/feat/x'])).trim()
      expect(remoteRefSha).toBe(branchSha)
    })
  })
})

describe('setUpstream', () => {
  it('sets branch.<X>.remote and branch.<X>.merge config', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'README.md': '# repo\n' } }),
        addRemote('origin', '/fake/url'),
        setRemoteRef('origin', 'main', 'HEAD'),
        setUpstream('main', 'origin'),
      )(repo)

      const remote = (await repo.git.raw(['config', '--get', 'branch.main.remote'])).trim()
      const merge = (await repo.git.raw(['config', '--get', 'branch.main.merge'])).trim()
      expect(remote).toBe('origin')
      expect(merge).toBe('refs/heads/main')
    })
  })

  it('defaults remoteBranch to localBranch when omitted', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'README.md': '# repo\n' } }),
        switchToBranch('feat/x'),
        addCommit({ message: 'feat: x', files: { 'x.ts': 'x\n' } }),
        addRemote('origin', '/fake/url'),
        setRemoteRef('origin', 'feat/x', 'HEAD'),
        setUpstream('feat/x', 'origin'),
      )(repo)

      const merge = (await repo.git.raw(['config', '--get', 'branch.feat/x.merge'])).trim()
      expect(merge).toBe('refs/heads/feat/x')
    })
  })

  it('honors an explicit remoteBranch argument', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'README.md': '# repo\n' } }),
        switchToBranch('local-name'),
        addCommit({ message: 'feat', files: { 'x.ts': 'x\n' } }),
        addRemote('origin', '/fake/url'),
        setRemoteRef('origin', 'remote-name', 'HEAD'),
        setUpstream('local-name', 'origin', 'remote-name'),
      )(repo)

      const merge = (await repo.git.raw(['config', '--get', 'branch.local-name.merge'])).trim()
      expect(merge).toBe('refs/heads/remote-name')
    })
  })

  it('produces ahead/behind counts in git status when combined with setRemoteRef', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'README.md': '# repo\n' } }),
        addCommit({ message: 'feat: one', files: { 'a.ts': 'a\n' } }),
        addCommit({ message: 'feat: two', files: { 'b.ts': 'b\n' } }),
        addRemote('origin', '/fake/url'),
        // Pretend origin/main is 2 commits behind local.
        setRemoteRef('origin', 'main', 'HEAD~2'),
        setUpstream('main', 'origin'),
      )(repo)

      const status = await repo.git.status()
      expect(status.ahead).toBe(2)
      expect(status.behind).toBe(0)
      expect(status.tracking).toBe('origin/main')
    })
  })
})

describe('withRemoteTracking', () => {
  it('creates origin/<branch> with commits from the step that local does not have', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'README.md': '# repo\n' } }),
        addCommit({ message: 'local A', files: { 'a.ts': 'a\n' } }),
        addRemote('origin', '/fake/url'),
        withRemoteTracking('origin', 'main', chain(
          addCommit({ message: 'upstream B', files: { 'b.ts': 'b\n' } }),
          addCommit({ message: 'upstream C', files: { 'c.ts': 'c\n' } }),
        )),
        setUpstream('main', 'origin'),
      )(repo)

      const status = await repo.git.status()
      expect(status.behind).toBe(2)
      expect(status.ahead).toBe(0)
      expect(status.tracking).toBe('origin/main')
    })
  })

  it('leaves the parent working tree, HEAD, and current branch untouched', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'README.md': '# repo\n' } }),
        addCommit({ message: 'feat: A', files: { 'a.ts': 'a\n' } }),
        addRemote('origin', '/fake/url'),
      )(repo)

      const headBefore = (await repo.git.revparse(['HEAD'])).trim()
      const branchBefore = (await repo.git.status()).current

      await withRemoteTracking('origin', 'main', chain(
        addCommit({ message: 'upstream feat B', files: { 'b.ts': 'b\n' } }),
      ))(repo)

      const headAfter = (await repo.git.revparse(['HEAD'])).trim()
      const branchAfter = (await repo.git.status()).current
      expect(headAfter).toBe(headBefore)
      expect(branchAfter).toBe(branchBefore)

      // Working tree should not contain b.ts — that commit only exists on the remote.
      const { existsSync } = await import('fs')
      const { join } = await import('path')
      expect(existsSync(join(repo.path, 'b.ts'))).toBe(false)
    })
  })

  it('supports a diverged scenario when composed with subsequent local commits', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'README.md': '# repo\n' } }),
        addCommit({ message: 'shared base', files: { 'base.ts': 'base\n' } }),
        addRemote('origin', '/fake/url'),
        withRemoteTracking('origin', 'main', chain(
          addCommit({ message: 'upstream X', files: { 'x.ts': 'x\n' } }),
          addCommit({ message: 'upstream Y', files: { 'y.ts': 'y\n' } }),
        )),
        // Now add local-only commits on top of `shared base`.
        addCommit({ message: 'local M', files: { 'm.ts': 'm\n' } }),
        addCommit({ message: 'local N', files: { 'n.ts': 'n\n' } }),
        setUpstream('main', 'origin'),
      )(repo)

      const status = await repo.git.status()
      expect(status.ahead).toBe(2)
      expect(status.behind).toBe(2)
      expect(status.tracking).toBe('origin/main')
    })
  })

  it('handles a non-current branch as the tracking target', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'README.md': '# repo\n' } }),
        switchToBranch('feat/x'),
        addCommit({ message: 'feat x init', files: { 'x.ts': 'x\n' } }),
        checkoutBranch('main'),
        addRemote('origin', '/fake/url'),
        // Run an upstream step against feat/x even though we're on main.
        withRemoteTracking('origin', 'feat/x', chain(
          addCommit({ message: 'upstream feat x advance', files: { 'x.ts': 'x advanced\n' } }),
        )),
      )(repo)

      const remoteSha = (await repo.git.revparse(['refs/remotes/origin/feat/x'])).trim()
      const localSha = (await repo.git.revparse(['feat/x'])).trim()
      expect(remoteSha).not.toBe(localSha)

      // We should still be on main — the parent's branch state is untouched.
      const status = await repo.git.status()
      expect(status.current).toBe('main')
    })
  })
})
