import { largeRepoScenario } from './large-repo'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'

describe('large-repo scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await largeRepoScenario.setup(repo)
  }, 60_000) // Large repo needs more time

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('has main checked out', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
  })

  it('main has 80 commits', async () => {
    const count = await repo.git.raw(['rev-list', '--count', 'main'])
    expect(parseInt(count.trim(), 10)).toBe(80)
  })

  it('feat/large-feature exists with 25 commits ahead of its fork point', async () => {
    const branches = await repo.git.branchLocal()
    expect(branches.all).toContain('feat/large-feature')

    // Find the merge-base and count commits ahead
    const mergeBase = await repo.git.raw(['merge-base', 'main', 'feat/large-feature'])
    const aheadCount = await repo.git.raw([
      'rev-list', '--count', `${mergeBase.trim()}..feat/large-feature`,
    ])
    expect(parseInt(aheadCount.trim(), 10)).toBe(25)
  })

  it('develop exists with 10 commits ahead of its fork point', async () => {
    const branches = await repo.git.branchLocal()
    expect(branches.all).toContain('develop')

    const mergeBase = await repo.git.raw(['merge-base', 'main', 'develop'])
    const aheadCount = await repo.git.raw([
      'rev-list', '--count', `${mergeBase.trim()}..develop`,
    ])
    expect(parseInt(aheadCount.trim(), 10)).toBe(10)
  })

  it('tags v0.1.0, v0.5.0, v1.0.0 exist', async () => {
    const tags = await repo.git.tags()
    expect(tags.all).toContain('v0.1.0')
    expect(tags.all).toContain('v0.5.0')
    expect(tags.all).toContain('v1.0.0')
  })

  it('total commit count across all branches is 115', async () => {
    // Count unique commits across all branches
    const allCount = await repo.git.raw([
      'rev-list', '--count', '--all',
    ])
    expect(parseInt(allCount.trim(), 10)).toBe(115)
  })
})
