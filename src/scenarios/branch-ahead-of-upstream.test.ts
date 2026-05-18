import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { branchAheadOfUpstreamScenario } from './branch-ahead-of-upstream'

describe('branch-ahead-of-upstream scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await branchAheadOfUpstreamScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('has main checked out with 6 commits', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
    const log = await repo.git.log()
    expect(log.total).toBe(6)
  })

  it('reports main is 3 commits ahead of origin/main', async () => {
    const status = await repo.git.status()
    expect(status.tracking).toBe('origin/main')
    expect(status.ahead).toBe(3)
    expect(status.behind).toBe(0)
  })

  it('has a clean worktree', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
