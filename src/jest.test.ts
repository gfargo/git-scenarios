/**
 * Tests for the Jest framework adapter.
 */

import { describeWithScenario, describeEachScenario } from './jest'
import { writeFiles } from './atoms'

// Test describeWithScenario with a simple scenario
describeWithScenario('empty-repo', (getRepo) => {
  it('provides a repo instance', () => {
    const repo = getRepo()
    expect(repo).toBeDefined()
    expect(repo.path).toBeTruthy()
    expect(repo.git).toBeDefined()
  })

  it('repo has a .git directory', async () => {
    const { existsSync } = await import('fs')
    const { join } = await import('path')
    const repo = getRepo()
    expect(existsSync(join(repo.path, '.git'))).toBe(true)
  })
})

// Test with a scenario that has actual state
describeWithScenario('two-commit-feature', (getRepo) => {
  it('has commits', async () => {
    const repo = getRepo()
    const log = await repo.git.log()
    expect(log.total).toBeGreaterThan(0)
  })

  it('is on main', async () => {
    const repo = getRepo()
    const status = await repo.git.status()
    expect(status.current).toBe('main')
  })
})

// Test with extra steps
describeWithScenario('empty-repo', (getRepo) => {
  it('has the extra file from extraSteps', async () => {
    const { existsSync } = await import('fs')
    const { join } = await import('path')
    const repo = getRepo()
    // empty-repo has no commits, but our extra step adds a file
    // Note: empty-repo is truly empty (no commits), so writeFiles
    // just puts a file in the worktree without committing
    expect(existsSync(join(repo.path, 'injected.ts'))).toBe(true)
  })
}, {
  extraSteps: [writeFiles({ 'injected.ts': 'injected\n' })],
})

// Test describeEachScenario
describeEachScenario(
  ['two-commit-feature', 'feature-branch-one-commit'],
  (getRepo, scenarioName) => {
    it(`${scenarioName} has a git repo`, async () => {
      const repo = getRepo()
      const status = await repo.git.status()
      expect(status.current).toBeTruthy()
    })
  },
)
