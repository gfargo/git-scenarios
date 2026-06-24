import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { danglingCommitScenario } from './dangling-commit'

describe('dangling-commit scenario', () => {
  let repo: TempGitRepo
  let danglingSha: string

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await danglingCommitScenario.setup(repo)
    // Capture the dangling commit SHA via reflog before any further operations.
    danglingSha = (
      await repo.git.raw(['reflog', 'show', '--format=%H', '-n', '1', 'HEAD@{1}'])
    ).trim()
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('has main with 2 commits', async () => {
    const log = await repo.git.log(['main'])
    expect(log.total).toBe(2)
  })

  it('has a clean worktree', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })

  it('has a reflog entry for the dropped commit', async () => {
    expect(danglingSha).toMatch(/^[0-9a-f]{40}$/)
  })

  it('dangling commit object still exists in the object store', async () => {
    const result = await repo.git.raw(['cat-file', '-t', danglingSha])
    expect(result.trim()).toBe('commit')
  })

  it('dangling commit is not reachable from any branch', async () => {
    const branches = await repo.git.raw(['branch', '--contains', danglingSha])
    expect(branches.trim()).toBe('')
  })
})
