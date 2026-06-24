import { join } from 'path'
import { simpleGit } from 'simple-git'

import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { outOfDateSubmoduleScenario } from './out-of-date-submodule'

describe('out-of-date-submodule scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await outOfDateSubmoduleScenario.setup(repo)
  }, 60_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('parent main has 2 commits', async () => {
    const log = await repo.git.log(['main'])
    expect(log.total).toBe(2)
  })

  it('.gitmodules registers vendor/lib', async () => {
    const body = await repo.readFile('.gitmodules')
    expect(body).toMatch(/\[submodule "vendor\/lib"\]/)
    expect(body).toMatch(/path\s*=\s*vendor\/lib/)
  })

  it('git submodule status shows + for vendor/lib (out-of-date)', async () => {
    const out = await repo.git.raw(['submodule', 'status'])
    expect(out).toMatch(/^\+[0-9a-f]{7,40}\s+vendor\/lib/m)
  })

  it('vendor/lib HEAD is 1 commit ahead of the parent pin', async () => {
    // The parent's recorded pin is in its index (the gitlink SHA from HEAD).
    const lsTree = await repo.git.raw(['ls-tree', 'HEAD', 'vendor/lib'])
    const pinnedSha = lsTree.trim().split(/\s+/)[2]
    expect(pinnedSha).toMatch(/^[0-9a-f]{40}$/)

    const subGit = simpleGit(join(repo.path, 'vendor/lib'))
    const aheadCount = (
      await subGit.raw(['rev-list', '--count', `${pinnedSha}..HEAD`])
    ).trim()
    expect(aheadCount).toBe('1')
  })
})
