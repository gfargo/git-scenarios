import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { branchDivergedScenario } from './branch-diverged'

describe('branch-diverged scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await branchDivergedScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('has main checked out with 4 commits', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
    const log = await repo.git.log()
    expect(log.total).toBe(4)
  })

  it('reports main is 2 ahead and 2 behind origin/main', async () => {
    const status = await repo.git.status()
    expect(status.tracking).toBe('origin/main')
    expect(status.ahead).toBe(2)
    expect(status.behind).toBe(2)
  })

  it('has a clean worktree', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
