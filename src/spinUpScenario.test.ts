/**
 * Tests for spinUpScenario, including the v0.6 options bag.
 */

import { spinUpScenario } from './spinUpScenario'
import type { TempGitRepo } from './tempGitRepo'

describe('spinUpScenario', () => {
  let repo: TempGitRepo

  afterEach(async () => {
    await repo?.cleanup()
  })

  it('spins up a built-in scenario by name', async () => {
    repo = await spinUpScenario('feature-pr-ready')
    const status = await repo.git.status()
    expect(status.current).toBe('feat/widget-v2')
  })

  it('throws a friendly error for an unknown scenario name', async () => {
    await expect(spinUpScenario('totally-fake-xyz')).rejects.toThrow(
      /spinUpScenario: Unknown scenario "totally-fake-xyz"/,
    )
  })

  it('error includes available scenario names', async () => {
    await expect(spinUpScenario('totally-fake-xyz')).rejects.toThrow(
      /feature-pr-ready/,
    )
  })

  describe('options', () => {
    it('adds an origin remote when remote is provided', async () => {
      repo = await spinUpScenario('empty-repo', {
        remote: 'git@github.com:org/repo.git',
      })
      const remotes = await repo.git.getRemotes(true)
      const origin = remotes.find((r) => r.name === 'origin')
      expect(origin).toBeDefined()
      expect(origin!.refs.fetch).toBe('git@github.com:org/repo.git')
    })

    it('honors autoCleanup option', async () => {
      // We can't observe the exit hook here, but we can verify the
      // option is accepted and the repo remains usable.
      repo = await spinUpScenario('feature-pr-ready', { autoCleanup: true })
      expect(repo.path).toBeDefined()
      const branches = await repo.git.branchLocal()
      expect(branches.all).toContain('main')
    })

    it('combines remote + autoCleanup', async () => {
      repo = await spinUpScenario('empty-repo', {
        remote: '/fake/url',
        autoCleanup: true,
      })
      const remotes = await repo.git.getRemotes(true)
      expect(remotes.find((r) => r.name === 'origin')).toBeDefined()
    })
  })
})
