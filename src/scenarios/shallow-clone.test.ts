import { shallowCloneScenario } from './shallow-clone'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'

describe('shallow-clone scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await shallowCloneScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('has main checked out', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
  })

  it('reports as a shallow repository', async () => {
    const isShallow = await repo.git.raw(['rev-parse', '--is-shallow-repository'])
    expect(isShallow.trim()).toBe('true')
  })

  it('only 3 commits are reachable from HEAD', async () => {
    // shallowAt(3) → HEAD~2 is the boundary → 3 commits reachable.
    const log = await repo.git.log()
    expect(log.total).toBe(3)
  })
})
