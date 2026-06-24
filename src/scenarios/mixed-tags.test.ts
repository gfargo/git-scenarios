import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { mixedTagsScenario } from './mixed-tags'

describe('mixed-tags scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await mixedTagsScenario.setup(repo)
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

  it('v0.1.0 is a lightweight tag pointing at HEAD~2 (cat-file -t → commit)', async () => {
    const type = (await repo.git.raw(['cat-file', '-t', 'v0.1.0'])).trim()
    expect(type).toBe('commit')
    const tagSha = (await repo.git.raw(['rev-parse', 'v0.1.0'])).trim()
    const firstCommitSha = (await repo.git.raw(['rev-parse', 'HEAD~2'])).trim()
    expect(tagSha).toBe(firstCommitSha)
  })

  it('v1.0.0 is an annotated tag object pointing at HEAD (cat-file -t → tag)', async () => {
    const type = (await repo.git.raw(['cat-file', '-t', 'v1.0.0'])).trim()
    expect(type).toBe('tag')
    const taggedCommitSha = (await repo.git.raw(['rev-parse', 'v1.0.0^{}'])).trim()
    const headSha = (await repo.git.raw(['rev-parse', 'HEAD'])).trim()
    expect(taggedCommitSha).toBe(headSha)
  })

  it('tree-snapshot is a lightweight tag pointing at a tree object (cat-file -t → tree)', async () => {
    const type = (await repo.git.raw(['cat-file', '-t', 'tree-snapshot'])).trim()
    expect(type).toBe('tree')
  })

  it('has a clean worktree', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
