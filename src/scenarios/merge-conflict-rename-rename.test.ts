import { existsSync } from 'fs'
import { join } from 'path'

import { mergeConflictRenameRenameScenario } from './merge-conflict-rename-rename'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'

describe('merge-conflict-rename-rename scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await mergeConflictRenameRenameScenario.setup(repo)
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

  it('has main-name.txt in the worktree (from main rename)', () => {
    expect(existsSync(join(repo.path, 'main-name.txt'))).toBe(true)
  })

  it('has feat-name.txt in the worktree (from feat/x rename)', () => {
    expect(existsSync(join(repo.path, 'feat-name.txt'))).toBe(true)
  })

  it('orig.txt is absent from the worktree (deleted by both sides)', () => {
    expect(existsSync(join(repo.path, 'orig.txt'))).toBe(false)
  })

  it('reports at least 2 unresolved conflicts (rename/rename produces AU/UA/DD entries)', async () => {
    const status = await repo.git.status()
    expect(status.conflicted.length).toBeGreaterThanOrEqual(2)
  })
})
