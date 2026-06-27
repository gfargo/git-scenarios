// Replace `myNewScenario` and the import path to match your scenario file.
// When placed in src/scenarios/, the import paths below are correct as-is.
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { myNewScenario } from './my-new-scenario'

describe('my-new-scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await myNewScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  // One `it()` per contract line. The contract text becomes the test description.

  it('has 1 commit on main', async () => {
    const log = await repo.git.log(['main'])
    expect(log.total).toBe(1)
  })

  it('has feat/example checked out', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('feat/example')
  })

  it('has a clean worktree', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
