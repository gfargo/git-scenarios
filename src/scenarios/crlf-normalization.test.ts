import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { crlfNormalizationScenario } from './crlf-normalization'

describe('crlf-normalization scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await crlfNormalizationScenario.setup(repo)
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

  it('has .gitattributes enforcing LF line endings', async () => {
    const content = await repo.readFile('.gitattributes')
    expect(content).toContain('* text=auto eol=lf')
  })

  it('stores src/lf-only.txt with LF line endings in the git object store', async () => {
    // Read the committed blob directly from git (bypasses working-tree CRLF
    // conversion on Windows), so the assertion holds on every platform.
    const blob = await repo.git.raw(['show', 'HEAD:src/lf-only.txt'])
    expect(blob).not.toMatch(/\r\n/)
    expect(blob).toContain('\n')
  })

  it('has a clean worktree', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
