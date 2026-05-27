import { mergeNoConflictScenario } from './merge-no-conflict'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'

describe('merge-no-conflict scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await mergeNoConflictScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('main is checked out', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
  })

  it('worktree is clean', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })

  it('HEAD has 2 parents (merge commit)', async () => {
    const parents = await repo.git.raw(['rev-list', '--parents', '-n', '1', 'HEAD'])
    // Format: "<commit-sha> <parent1-sha> <parent2-sha>"
    const shas = parents.trim().split(/\s+/)
    expect(shas.length).toBe(3) // commit + 2 parents
  })

  it('feat/x exists and is merged into main', async () => {
    const branches = await repo.git.branchLocal()
    expect(branches.all).toContain('feat/x')
    // git branch --merged main includes feat/x
    const merged = await repo.git.raw(['branch', '--merged', 'main'])
    expect(merged).toContain('feat/x')
  })

  it('main contains both feat/x changes and baseline', async () => {
    const log = await repo.git.log(['main'])
    const subjects = log.all.map((e) => e.message.split('\n')[0])
    expect(subjects).toContain('feat: add x')
    expect(subjects).toContain('feat: baseline a')
    // And the merge commit on top
    expect(log.latest?.message).toContain('Merge branch')
  })
})
