import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { branchTrackingUpstreamScenario } from './branch-tracking-upstream'

describe('branch-tracking-upstream scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await branchTrackingUpstreamScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('has main checked out with 3 commits', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
    const log = await repo.git.log()
    expect(log.total).toBe(3)
  })

  it('has origin/main pointing at the same commit as main', async () => {
    const headSha = (await repo.git.revparse(['HEAD'])).trim()
    const remoteSha = (await repo.git.revparse(['refs/remotes/origin/main'])).trim()
    expect(remoteSha).toBe(headSha)
  })

  it('has main tracking origin/main', async () => {
    const status = await repo.git.status()
    expect(status.tracking).toBe('origin/main')
    expect(status.ahead).toBe(0)
    expect(status.behind).toBe(0)
  })

  it('has a clean worktree', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
