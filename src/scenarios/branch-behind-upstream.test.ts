import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { branchBehindUpstreamScenario } from './branch-behind-upstream'

describe('branch-behind-upstream scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await branchBehindUpstreamScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('has main checked out with 2 commits', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
    const log = await repo.git.log()
    expect(log.total).toBe(2)
  })

  it('reports main is 3 commits behind origin/main', async () => {
    const status = await repo.git.status()
    expect(status.tracking).toBe('origin/main')
    expect(status.behind).toBe(3)
    expect(status.ahead).toBe(0)
  })

  it('has a clean worktree', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
