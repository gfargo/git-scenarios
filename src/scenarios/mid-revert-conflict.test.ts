import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

import { midRevertConflictScenario } from './mid-revert-conflict'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'

describe('mid-revert-conflict scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await midRevertConflictScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    // Abort the revert so cleanup doesn't trip on the in-flight state.
    try {
      await repo.git.raw(['revert', '--abort'])
    } catch {
      /* ignore */
    }
    await repo?.cleanup()
  })

  it('has main checked out', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
  })

  it('has a revert in progress (REVERT_HEAD exists)', () => {
    expect(existsSync(join(repo.path, '.git', 'REVERT_HEAD'))).toBe(true)
  })

  it('has conflict markers in src/service.ts', () => {
    const content = readFileSync(join(repo.path, 'src/service.ts'), 'utf-8')
    expect(content).toContain('<<<<<<<')
    expect(content).toContain('=======')
    expect(content).toContain('>>>>>>>')
  })

  it('reports exactly 1 unresolved conflict', async () => {
    const status = await repo.git.status()
    expect(status.conflicted).toEqual(['src/service.ts'])
  })
})
