import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

import { midCherryPickConflictScenario } from './mid-cherry-pick-conflict'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'

describe('mid-cherry-pick-conflict scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await midCherryPickConflictScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    // Abort the cherry-pick so cleanup doesn't trip on the in-flight state.
    try {
      await repo.git.raw(['cherry-pick', '--abort'])
    } catch {
      /* ignore */
    }
    await repo?.cleanup()
  })

  it('has main checked out', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
  })

  it('has a cherry-pick in progress (CHERRY_PICK_HEAD exists)', () => {
    expect(existsSync(join(repo.path, '.git', 'CHERRY_PICK_HEAD'))).toBe(true)
  })

  it('has conflict markers in src/utils.ts', () => {
    const content = readFileSync(join(repo.path, 'src/utils.ts'), 'utf-8')
    expect(content).toContain('<<<<<<<')
    expect(content).toContain('=======')
    expect(content).toContain('>>>>>>>')
  })

  it('reports exactly 1 unresolved conflict', async () => {
    const status = await repo.git.status()
    expect(status.conflicted).toEqual(['src/utils.ts'])
  })
})
