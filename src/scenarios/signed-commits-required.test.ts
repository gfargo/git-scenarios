import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { signedCommitsRequiredScenario } from './signed-commits-required'

describe('signed-commits-required scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await signedCommitsRequiredScenario.setup(repo)
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

  it('has commit.gpgsign set to true', async () => {
    const value = (await repo.git.raw(['config', '--get', 'commit.gpgsign'])).trim()
    expect(value).toBe('true')
  })

  it('has user.signingkey set', async () => {
    const value = (await repo.git.raw(['config', '--get', 'user.signingkey'])).trim()
    expect(value.length).toBeGreaterThan(0)
  })

  it('has a clean worktree', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
