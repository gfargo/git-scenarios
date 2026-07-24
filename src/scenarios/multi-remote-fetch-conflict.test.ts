import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { multiRemoteFetchConflictScenario } from './multi-remote-fetch-conflict'

describe('multi-remote-fetch-conflict', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await multiRemoteFetchConflictScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('main is checked out', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
  })

  it('main has 3 commits', async () => {
    const count = await repo.git.raw(['rev-list', '--count', 'main'])
    expect(parseInt(count.trim(), 10)).toBe(3)
  })

  it('origin and upstream remotes are configured', async () => {
    const remotes = await repo.git.getRemotes()
    const names = remotes.map((r) => r.name).sort()
    expect(names).toEqual(['origin', 'upstream'])
  })

  it('main tracks origin/main', async () => {
    const remote = await repo.git.raw(['config', 'branch.main.remote'])
    expect(remote.trim()).toBe('origin')
  })

  it('main is 2 commits behind origin/main', async () => {
    const behind = await repo.git.raw(['rev-list', '--count', 'main..origin/main'])
    expect(parseInt(behind.trim(), 10)).toBe(2)
  })

  it('upstream/main is 1 commit ahead of local main', async () => {
    const ahead = await repo.git.raw(['rev-list', '--count', 'main..upstream/main'])
    expect(parseInt(ahead.trim(), 10)).toBe(1)
  })

  it('origin/main and upstream/main have diverged (different tips)', async () => {
    const originTip = await repo.git.raw(['rev-parse', 'origin/main'])
    const upstreamTip = await repo.git.raw(['rev-parse', 'upstream/main'])
    expect(originTip.trim()).not.toBe(upstreamTip.trim())
  })

  it('worktree is clean', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
