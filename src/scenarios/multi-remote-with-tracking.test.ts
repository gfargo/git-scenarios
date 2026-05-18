import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { multiRemoteWithTrackingScenario } from './multi-remote-with-tracking'

describe('multi-remote-with-tracking scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await multiRemoteWithTrackingScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('has feat/fork-work checked out', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('feat/fork-work')
  })

  it('has both origin and upstream remotes configured', async () => {
    const remotes = await repo.git.getRemotes()
    const names = remotes.map((r) => r.name).sort()
    expect(names).toEqual(['origin', 'upstream'])
  })

  it('has main tracking upstream/main', async () => {
    const remote = (await repo.git.raw(['config', '--get', 'branch.main.remote'])).trim()
    const merge = (await repo.git.raw(['config', '--get', 'branch.main.merge'])).trim()
    expect(remote).toBe('upstream')
    expect(merge).toBe('refs/heads/main')
  })

  it('has feat/fork-work tracking origin/feat/fork-work', async () => {
    const remote = (await repo.git.raw(['config', '--get', 'branch.feat/fork-work.remote'])).trim()
    const merge = (await repo.git.raw(['config', '--get', 'branch.feat/fork-work.merge'])).trim()
    expect(remote).toBe('origin')
    expect(merge).toBe('refs/heads/feat/fork-work')
  })

  it('reports feat/fork-work is 2 commits ahead of origin/feat/fork-work', async () => {
    const status = await repo.git.status()
    expect(status.tracking).toBe('origin/feat/fork-work')
    expect(status.ahead).toBe(2)
    expect(status.behind).toBe(0)
  })

  it('has main and upstream/main at the same commit', async () => {
    const mainSha = (await repo.git.revparse(['main'])).trim()
    const upstreamSha = (await repo.git.revparse(['refs/remotes/upstream/main'])).trim()
    expect(upstreamSha).toBe(mainSha)
  })

  it('has a clean worktree', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
