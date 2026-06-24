import { existsSync } from 'fs'
import { join } from 'path'

import { mergeConflictDeleteModifyScenario } from './merge-conflict-delete-modify'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'

describe('merge-conflict-delete-modify scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await mergeConflictDeleteModifyScenario.setup(repo)
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

  it('has src/component.ts in the worktree (modified version from feat/x)', () => {
    expect(existsSync(join(repo.path, 'src', 'component.ts'))).toBe(true)
  })

  it('reports exactly 1 unresolved conflict', async () => {
    const status = await repo.git.status()
    expect(status.conflicted).toEqual(['src/component.ts'])
  })
})
