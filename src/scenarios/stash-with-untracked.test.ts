import { stashWithUntrackedScenario } from './stash-with-untracked'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'

describe('stash-with-untracked scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await stashWithUntrackedScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('main has 2 commits', async () => {
    const log = await repo.git.log(['main'])
    expect(log.total).toBe(2)
  })

  it('worktree is clean', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })

  it('git stash list reports 1 entry', async () => {
    const list = await repo.git.raw(['stash', 'list'])
    const lines = list.trim().split('\n').filter(Boolean)
    expect(lines.length).toBe(1)
  })

  it('stash includes the new untracked file', async () => {
    // Tracked changes show in the regular stash diff.
    const files = await repo.git.raw(['stash', 'show', '--name-only', 'stash@{0}'])
    expect(files).toContain('src/feature.ts')

    // Untracked files in a stash are stored as a third parent commit
    // (stash@{0}^3) when --include-untracked is used. List its tree
    // to verify the untracked file made it in.
    const untrackedTree = await repo.git.raw(['ls-tree', '-r', '--name-only', 'stash@{0}^3'])
    expect(untrackedTree).toContain('src/new-feature.ts')
  })
})
