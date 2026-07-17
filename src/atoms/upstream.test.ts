import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import {
  addCommit,
  addRemote,
  bulkCommits,
  chain,
  checkoutBranch,
  commit,
  emptyCommit,
  setRemoteRef,
  setUpstream,
  stageFiles,
  switchToBranch,
  writeFiles,
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

  it('continues the parent commit clock for every atom, not just commitAll', async () => {
    const buildLog = async (): Promise<string> => {
      let log = ''
      await withRepo(async (repo) => {
        await chain(
          addCommit({ message: 'init', files: { 'README.md': '# repo\n' } }),
          addCommit({ message: 'local A', files: { 'a.ts': 'a\n' } }),
          addRemote('origin', '/fake/url'),
          withRemoteTracking('origin', 'main', chain(
            writeFiles({ 'b.ts': 'b\n' }),
            stageFiles(),
            commit('upstream commit'),
            emptyCommit('upstream empty commit'),
            bulkCommits([
              { message: 'upstream bulk 1', files: { 'c.ts': 'c\n' } },
              { message: 'upstream bulk 2' },
            ]),
          )),
          addCommit({ message: 'local B (after scope)', files: { 'd.ts': 'd\n' } }),
          setUpstream('main', 'origin'),
        )(repo)

        log = await repo.git.raw([
          'log',
          '--all',
          '--format=%H %s %aI %cI',
        ])
      })
      return log
    }

    const [logOne, logTwo] = await Promise.all([buildLog(), buildLog()])
    expect(logOne).toBe(logTwo)
    expect(logOne.length).toBeGreaterThan(0)

    // `git log --all` orders by commit date, not insertion order, so key
    // each committer date by its subject rather than assuming line order.
    const lines = logOne.trim().split('\n')
    // init, local A, upstream commit, upstream empty commit, upstream bulk 1,
    // upstream bulk 2, local B (after scope) = 7 commits total.
    expect(lines).toHaveLength(7)

    // Each line is `<sha> <subject> <authorISO> <committerISO>` — sha and
    // both dates are single tokens, so the subject is whatever's between.
    const bySubject = new Map<string, string>()
    for (const line of lines) {
      const tokens = line.split(' ')
      const committerDate = tokens[tokens.length - 1]
      const subject = tokens.slice(1, tokens.length - 2).join(' ')
      bySubject.set(subject, committerDate)
    }

    // No ties — every commit gets a distinct timestamp, which is what
    // keeps `git log --graph --all` ordering deterministic.
    const committerDates = [...bySubject.values()]
    expect(new Set(committerDates).size).toBe(committerDates.length)

    // None of the *upstream* commits reuse the fresh-clock epoch that a
    // brand-new `clonePath` key would otherwise start at — proves the
    // clone's clock was seeded from the parent instead of restarting.
    // ('init' legitimately sits at the epoch — it's the parent's first commit.)
    for (const subject of ['upstream commit', 'upstream empty commit', 'upstream bulk 1', 'upstream bulk 2']) {
      expect(bySubject.get(subject)).not.toBe('2020-01-01T00:00:00+00:00')
    }

    // Exact chronological chain, in the order the atoms actually ran:
    // parent commits, then every scope atom continuing that sequence,
    // then the post-scope parent commit continuing past all of them.
    const order = [
      'init',
      'local A',
      'upstream commit',
      'upstream empty commit',
      'upstream bulk 1',
      'upstream bulk 2',
      'local B (after scope)',
    ]
    const orderedDates = order.map((subject) => {
      const date = bySubject.get(subject)
      expect(date).toBeDefined()
      return new Date(date!).getTime()
    })
    for (let i = 1; i < orderedDates.length; i++) {
      expect(orderedDates[i]).toBeGreaterThan(orderedDates[i - 1])
    }
  })
})
