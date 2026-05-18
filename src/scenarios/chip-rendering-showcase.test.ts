import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { chipRenderingShowcaseScenario } from './chip-rendering-showcase'

describe('chip-rendering-showcase scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await chipRenderingShowcaseScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('has main checked out with 6 commits', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
    const log = await repo.git.log()
    expect(log.total).toBe(6)
  })

  it('has both origin and upstream remotes configured', async () => {
    const remotes = await repo.git.getRemotes()
    const names = remotes.map((r) => r.name).sort()
    expect(names).toEqual(['origin', 'upstream'])
  })

  it('has main tracking origin/main, 1 commit ahead', async () => {
    const status = await repo.git.status()
    expect(status.tracking).toBe('origin/main')
    expect(status.ahead).toBe(1)
    expect(status.behind).toBe(0)
  })

  it('has origin/main pinned at commit 5 (HEAD~1)', async () => {
    const headMinusOne = (await repo.git.revparse(['HEAD~1'])).trim()
    const originMain = (await repo.git.revparse(['refs/remotes/origin/main'])).trim()
    expect(originMain).toBe(headMinusOne)
  })

  it('has upstream/main pinned at commit 3 (HEAD~3)', async () => {
    const headMinusThree = (await repo.git.revparse(['HEAD~3'])).trim()
    const upstreamMain = (await repo.git.revparse(['refs/remotes/upstream/main'])).trim()
    expect(upstreamMain).toBe(headMinusThree)
  })

  it('has develop branch at commit 2 (HEAD~4)', async () => {
    const headMinusFour = (await repo.git.revparse(['HEAD~4'])).trim()
    const develop = (await repo.git.revparse(['develop'])).trim()
    expect(develop).toBe(headMinusFour)
  })

  it('has feat/widgets branch at commit 4 (HEAD~2)', async () => {
    const headMinusTwo = (await repo.git.revparse(['HEAD~2'])).trim()
    const featWidgets = (await repo.git.revparse(['feat/widgets'])).trim()
    expect(featWidgets).toBe(headMinusTwo)
  })

  it('has tag v0.1.0 at commit 1 (root)', async () => {
    const root = (await repo.git.revparse(['HEAD~5'])).trim()
    const tagSha = (await repo.git.revparse(['v0.1.0'])).trim()
    expect(tagSha).toBe(root)
  })

  it('has a clean worktree', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })

  it('exposes every chip variant in the decoration log', async () => {
    // Run git log --decorate and verify the six rows carry the
    // expected ref decorations. This is the "chip showcase" property
    // a consumer test would assert on visually — every row's chip
    // kind is observable from the raw refs list.
    const decorations = await repo.git.raw([
      'log',
      '--decorate=short',
      '--pretty=%D',
    ])
    const rows = decorations.trim().split('\n')
    expect(rows).toHaveLength(6)

    // Row 0 = HEAD (newest): "HEAD -> main, ..." (green chip)
    expect(rows[0]).toContain('HEAD -> main')

    // Row 1 = origin/main pin (yellow chip)
    expect(rows[1]).toContain('origin/main')

    // Row 2 = feat/widgets local (blue chip when classified by remote names)
    expect(rows[2]).toContain('feat/widgets')

    // Row 3 = upstream/main pin (yellow chip)
    expect(rows[3]).toContain('upstream/main')

    // Row 4 = develop local (blue chip)
    expect(rows[4]).toContain('develop')

    // Row 5 = root: tag v0.1.0 (NO chip; tag appears in trailing
    // decoration list per standard chip-system rules).
    expect(rows[5]).toContain('tag: v0.1.0')
  })
})
