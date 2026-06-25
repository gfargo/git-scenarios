import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { interactiveRebaseMidEditScenario } from './interactive-rebase-mid-edit'

describe('interactive-rebase-mid-edit scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await interactiveRebaseMidEditScenario.setup(repo)
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

  it('has .git/rebase-merge/interactive (interactive-rebase marker)', () => {
    expect(existsSync(join(repo.path, '.git', 'rebase-merge', 'interactive'))).toBe(true)
  })

  it('has HEAD detached', async () => {
    const status = await repo.git.status()
    expect(status.detached).toBe(true)
  })

  it('has at least 1 remaining pick in git-rebase-todo', () => {
    const todo = readFileSync(
      join(repo.path, '.git', 'rebase-merge', 'git-rebase-todo'),
      'utf-8',
    )
    const picks = todo.split('\n').filter((l) => /^pick /.test(l))
    expect(picks.length).toBeGreaterThanOrEqual(1)
  })
})
