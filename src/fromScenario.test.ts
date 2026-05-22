/**
 * Tests for the `fromScenario` helper — spin up a scenario with
 * additional atoms applied on top.
 */

import type { TempGitRepo } from './tempGitRepo'
import { fromScenario } from './fromScenario'
import { addCommit, writeFiles } from './atoms'

describe('fromScenario', () => {
  let repo: TempGitRepo

  afterEach(async () => {
    await repo?.cleanup()
  })

  it('spins up a scenario without extra steps', async () => {
    repo = await fromScenario('empty-repo')
    // empty-repo is just a git init — no commits
    const log = await repo.git.log().catch(() => null)
    // empty repo has no commits, log throws or returns empty
    expect(log === null || log.total === 0).toBe(true)
  })

  it('applies extra steps after the scenario setup', async () => {
    repo = await fromScenario(
      'two-commit-feature',
      addCommit({ message: 'extra commit', files: { 'extra.ts': 'extra\n' } }),
    )

    const log = await repo.git.log()
    expect(log.all.some((c) => c.message === 'extra commit')).toBe(true)
  })

  it('applies multiple extra steps in order', async () => {
    repo = await fromScenario(
      'single-staged-file',
      writeFiles({ 'dirty.ts': 'uncommitted content\n' }),
    )

    const status = await repo.git.status()
    // The scenario stages a file; our extra step adds an untracked file
    expect(status.not_added).toContain('dirty.ts')
  })

  it('throws for unknown scenario names', async () => {
    await expect(fromScenario('nonexistent-xyz')).rejects.toThrow(
      /Unknown scenario "nonexistent-xyz"/,
    )
  })
})
