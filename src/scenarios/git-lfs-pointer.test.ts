import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { gitLfsPointerScenario } from './git-lfs-pointer'

describe('git-lfs-pointer scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await gitLfsPointerScenario.setup(repo)
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

  it('has .gitattributes marking *.bin as LFS-tracked', async () => {
    const content = await repo.readFile('.gitattributes')
    expect(content).toMatch(/\*\.bin\s+filter=lfs\s+diff=lfs\s+merge=lfs\s+-text/)
  })

  it('has assets/blob.bin containing a canonical LFS pointer', async () => {
    const content = await repo.readFile('assets/blob.bin')
    expect(content).toMatch(/^version https:\/\/git-lfs\.github\.com\/spec\/v1/)
    expect(content).toMatch(/^oid sha256:[0-9a-f]{64}/m)
    expect(content).toMatch(/^size \d+/m)
  })

  it('has a clean worktree', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
