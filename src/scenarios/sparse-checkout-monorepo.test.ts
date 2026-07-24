import { existsSync } from 'fs'
import { join } from 'path'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { sparseCheckoutMonorepoScenario } from './sparse-checkout-monorepo'

describe('sparse-checkout-monorepo', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await sparseCheckoutMonorepoScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('main is checked out', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
  })

  it('main has 4 commits', async () => {
    const log = await repo.git.log()
    expect(log.total).toBe(4)
  })

  it('sparse checkout is enabled in cone mode', async () => {
    const sparseList = await repo.git.raw(['sparse-checkout', 'list'])
    expect(sparseList.trim()).toContain('packages/app')
    expect(sparseList.trim()).toContain('packages/shared')
  })

  it('packages/app is in the working tree', () => {
    expect(existsSync(join(repo.path, 'packages/app/src/index.ts'))).toBe(true)
  })

  it('packages/shared is in the working tree', () => {
    expect(existsSync(join(repo.path, 'packages/shared/src/index.ts'))).toBe(true)
  })

  it('packages/lib is NOT in the working tree (sparse-filtered)', () => {
    expect(existsSync(join(repo.path, 'packages/lib'))).toBe(false)
  })

  it('worktree is clean', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
