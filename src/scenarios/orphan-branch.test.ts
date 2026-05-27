import { orphanBranchScenario } from './orphan-branch'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'

describe('orphan-branch scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await orphanBranchScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('main has 2 commits', async () => {
    const log = await repo.git.log(['main'])
    expect(log.total).toBe(2)
  })

  it('gh-pages is checked out', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('gh-pages')
  })

  it('gh-pages has 1 commit', async () => {
    const log = await repo.git.log(['gh-pages'])
    expect(log.total).toBe(1)
    expect(log.latest?.message).toContain('docs: scaffold gh-pages site')
  })

  it('main and gh-pages share no common ancestor', async () => {
    // git merge-base exits 1 with no output when there's no shared base.
    let output = ''
    let exitCode = 0
    try {
      output = await repo.git.raw(['merge-base', 'main', 'gh-pages'])
    } catch (e: unknown) {
      const err = e as { exitCode?: number }
      exitCode = err.exitCode ?? 1
    }
    // Either an error (exit 1) or an empty output indicates no merge base.
    expect(exitCode === 1 || output.trim() === '').toBe(true)
  })
})
