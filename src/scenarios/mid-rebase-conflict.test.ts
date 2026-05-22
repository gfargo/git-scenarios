import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

import { midRebaseConflictScenario } from './mid-rebase-conflict'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'

describe('mid-rebase-conflict scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await midRebaseConflictScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    // Abort the rebase so cleanup doesn't trip on the in-flight state.
    try {
      await repo.git.raw(['rebase', '--abort'])
    } catch {
      /* ignore */
    }
    await repo?.cleanup()
  })

  it('has a rebase in progress (.git/rebase-merge/ exists)', () => {
    expect(existsSync(join(repo.path, '.git', 'rebase-merge'))).toBe(true)
  })

  it('has REBASE_HEAD set', () => {
    expect(existsSync(join(repo.path, '.git', 'REBASE_HEAD'))).toBe(true)
  })

  it('has conflict markers in src/config.ts', () => {
    const content = readFileSync(join(repo.path, 'src/config.ts'), 'utf-8')
    expect(content).toContain('<<<<<<<')
    expect(content).toContain('=======')
    expect(content).toContain('>>>>>>>')
  })

  it('reports exactly 1 unresolved conflict', async () => {
    const status = await repo.git.status()
    expect(status.conflicted).toEqual(['src/config.ts'])
  })
})
