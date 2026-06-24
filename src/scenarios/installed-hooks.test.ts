import { access, constants } from 'node:fs/promises'
import { join } from 'node:path'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { installedHooksScenario } from './installed-hooks'

describe('installed-hooks scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await installedHooksScenario.setup(repo)
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

  it('has .git/hooks/pre-commit that is executable', async () => {
    await expect(
      access(join(repo.path, '.git', 'hooks', 'pre-commit'), constants.X_OK),
    ).resolves.toBeUndefined()
  })

  it('has .git/hooks/commit-msg that is executable', async () => {
    await expect(
      access(join(repo.path, '.git', 'hooks', 'commit-msg'), constants.X_OK),
    ).resolves.toBeUndefined()
  })

  it('has a clean worktree', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
