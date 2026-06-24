import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

import { mergeConflictAddAddScenario } from './merge-conflict-add-add'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'

describe('merge-conflict-add-add scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await mergeConflictAddAddScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    try {
      await repo.git.raw(['merge', '--abort'])
    } catch {
      /* ignore */
    }
    await repo?.cleanup()
  })

  it('has main checked out', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
  })

  it('has a merge in progress (MERGE_HEAD exists)', () => {
    expect(existsSync(join(repo.path, '.git', 'MERGE_HEAD'))).toBe(true)
  })

  it('has conflict markers in src/config.ts', () => {
    const content = readFileSync(join(repo.path, 'src', 'config.ts'), 'utf-8')
    expect(content).toContain('<<<<<<<')
    expect(content).toContain('=======')
    expect(content).toContain('>>>>>>>')
  })

  it('reports exactly 1 unresolved conflict', async () => {
    const status = await repo.git.status()
    expect(status.conflicted).toEqual(['src/config.ts'])
  })
})
