import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { detachedHeadScenario } from './detached-head'

describe('detached-head scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await detachedHeadScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('has HEAD detached', async () => {
    const status = await repo.git.status()
    expect(status.detached).toBe(true)
  })

  it('still has main as a branch', async () => {
    const branches = await repo.git.branchLocal()
    expect(branches.all).toContain('main')
  })

  it('has main with 4 commits', async () => {
    const log = await repo.git.log(['main'])
    expect(log.total).toBe(4)
  })

  it('has HEAD 2 commits behind main', async () => {
    const headSha = (await repo.git.revparse(['HEAD'])).trim()
    const mainMinus2 = (await repo.git.revparse(['main~2'])).trim()
    expect(headSha).toBe(mainMinus2)
  })

  it('has a clean worktree', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
