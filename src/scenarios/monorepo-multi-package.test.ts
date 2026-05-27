import { monorepoMultiPackageScenario } from './monorepo-multi-package'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

describe('monorepo-multi-package scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await monorepoMultiPackageScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('has 3 commits on main', async () => {
    const log = await repo.git.log(['main'])
    expect(log.total).toBe(3)
  })

  it('root package.json declares packages/* workspaces', () => {
    const pkgPath = join(repo.path, 'package.json')
    expect(existsSync(pkgPath)).toBe(true)
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    expect(pkg.workspaces).toContain('packages/*')
  })

  it('packages/app is clean (no staged or unstaged changes)', async () => {
    const status = await repo.git.status()
    const appChanges = [
      ...status.staged,
      ...status.modified,
      ...status.not_added,
    ].filter((p) => p.startsWith('packages/app/'))
    expect(appChanges).toEqual([])
  })

  it('packages/lib has staged changes', async () => {
    const status = await repo.git.status()
    const libStaged = status.staged.filter((p) => p.startsWith('packages/lib/'))
    expect(libStaged.length).toBeGreaterThan(0)
  })

  it('packages/cli has unstaged changes', async () => {
    const status = await repo.git.status()
    // The modified set covers worktree-only edits to tracked files.
    const cliUnstaged = status.modified.filter((p) => p.startsWith('packages/cli/'))
    expect(cliUnstaged.length).toBeGreaterThan(0)
  })
})
