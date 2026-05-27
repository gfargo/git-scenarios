import { partialStageScenario } from './partial-stage'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'

describe('partial-stage scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await partialStageScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  // simple-git's StatusResult double-counts files modified in both
  // index AND worktree. Use porcelain v2 to get unambiguous counts.
  async function porcelainCounts(): Promise<{
    stagedOnly: number
    unstagedOnly: number
    untracked: number
  }> {
    const raw = await repo.git.raw(['status', '--porcelain'])
    let stagedOnly = 0
    let unstagedOnly = 0
    let untracked = 0
    for (const line of raw.split('\n')) {
      if (!line) continue
      const [x, y] = [line[0], line[1]]
      if (x === '?' && y === '?') {
        untracked += 1
      } else {
        if (x !== ' ' && x !== '?') stagedOnly += 1
        if (y !== ' ' && y !== '?') unstagedOnly += 1
      }
    }
    return { stagedOnly, unstagedOnly, untracked }
  }

  it('has 2 commits on main', async () => {
    const log = await repo.git.log(['main'])
    expect(log.total).toBe(2)
  })

  it('has exactly 2 staged files', async () => {
    const counts = await porcelainCounts()
    expect(counts.stagedOnly).toBe(2)
  })

  it('has exactly 2 modified-but-unstaged files', async () => {
    const counts = await porcelainCounts()
    expect(counts.unstagedOnly).toBe(2)
  })

  it('has exactly 1 untracked file', async () => {
    const counts = await porcelainCounts()
    expect(counts.untracked).toBe(1)
  })
})
