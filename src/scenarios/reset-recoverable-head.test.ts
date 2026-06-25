import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { resetRecoverableHeadScenario } from './reset-recoverable-head'

describe('reset-recoverable-head scenario', () => {
  let repo: TempGitRepo
  let formerTipSha: string

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await resetRecoverableHeadScenario.setup(repo)
    // The former tip is at main@{1} — capture before any further operations.
    formerTipSha = (await repo.git.raw(['rev-parse', 'main@{1}'])).trim()
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('has main with 2 commits after reset', async () => {
    const log = await repo.git.log(['main'])
    expect(log.total).toBe(2)
  })

  it('has a clean worktree', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })

  it('has a reflog entry for the former tip', async () => {
    expect(formerTipSha).toMatch(/^[0-9a-f]{40}$/)
  })

  it('former tip commit object still exists in the object store', async () => {
    const result = await repo.git.raw(['cat-file', '-t', formerTipSha])
    expect(result.trim()).toBe('commit')
  })

  it('former tip is not the current HEAD', async () => {
    const headSha = (await repo.git.revparse(['HEAD'])).trim()
    expect(headSha).not.toBe(formerTipSha)
  })

  it('former tip is not reachable from main', async () => {
    const branches = await repo.git.raw(['branch', '--contains', formerTipSha])
    expect(branches.trim()).toBe('')
  })
})
