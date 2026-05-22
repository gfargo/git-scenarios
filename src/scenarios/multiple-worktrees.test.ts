import { multipleWorktreesScenario } from './multiple-worktrees'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'

describe('multiple-worktrees scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await multipleWorktreesScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    // Remove worktrees before cleanup to avoid locked-branch issues
    try {
      const wtList = await repo.git.raw(['worktree', 'list', '--porcelain'])
      const paths = wtList
        .split('\n')
        .filter((l) => l.startsWith('worktree '))
        .map((l) => l.replace('worktree ', ''))
        .filter((p) => p !== repo.path) // skip the main worktree
      for (const p of paths) {
        await repo.git.raw(['worktree', 'remove', '--force', p])
      }
    } catch {
      /* best effort */
    }
    await repo?.cleanup()
  })

  it('has main checked out in the primary worktree', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
  })

  it('has 3 linked worktrees', async () => {
    const wtList = await repo.git.raw(['worktree', 'list', '--porcelain'])
    const worktrees = wtList
      .split('\n')
      .filter((l) => l.startsWith('worktree '))
    // 4 total: 1 primary + 3 linked
    expect(worktrees.length).toBe(4)
  })

  it('feat/alpha has 1 commit ahead of main', async () => {
    const aheadCount = await repo.git.raw(['rev-list', '--count', 'main..feat/alpha'])
    expect(aheadCount.trim()).toBe('1')
  })

  it('feat/beta has 2 commits ahead of main', async () => {
    const aheadCount = await repo.git.raw(['rev-list', '--count', 'main..feat/beta'])
    expect(aheadCount.trim()).toBe('2')
  })

  it('hotfix/urgent has 1 commit ahead of main', async () => {
    const aheadCount = await repo.git.raw(['rev-list', '--count', 'main..hotfix/urgent'])
    expect(aheadCount.trim()).toBe('1')
  })
})
