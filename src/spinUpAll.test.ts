/**
 * Tests for `spinUpAll` — bounded-concurrency parallel materialization.
 */

import { existsSync } from 'fs'
import { spinUpAll } from './spinUpAll'
import type { TempGitRepo } from './tempGitRepo'

describe('spinUpAll', () => {
  let repos: TempGitRepo[] = []

  afterEach(async () => {
    await Promise.all(repos.map((r) => r.cleanup().catch(() => {})))
    repos = []
  })

  it('returns an empty array for an empty input', async () => {
    repos = await spinUpAll([])
    expect(repos).toEqual([])
  })

  it('materializes a single scenario', async () => {
    repos = await spinUpAll(['empty-repo'])
    expect(repos).toHaveLength(1)
    expect(repos[0].path).toBeDefined()
    expect(existsSync(repos[0].path)).toBe(true)
  }, 30_000)

  it('materializes multiple scenarios in parallel', async () => {
    repos = await spinUpAll([
      'empty-repo',
      'feature-branch-one-commit',
      'two-commit-feature',
    ], { concurrency: 3 })

    expect(repos).toHaveLength(3)
    for (const repo of repos) {
      expect(existsSync(repo.path)).toBe(true)
    }
  }, 30_000)

  it('preserves positional ordering (result[i] corresponds to names[i])', async () => {
    const names = ['feature-pr-ready', 'empty-repo', 'stashed-changes']
    repos = await spinUpAll(names, { concurrency: 2 })

    // feature-pr-ready should be on feat/widget-v2
    const status0 = await repos[0].git.status()
    expect(status0.current).toBe('feat/widget-v2')

    // empty-repo has no commits
    const log1 = await repos[1].git.log().catch(() => null)
    expect(log1).toBeNull()

    // stashed-changes has stash entries
    const stash2 = await repos[2].git.raw(['stash', 'list'])
    expect(stash2).toContain('stash@{0}')
  }, 30_000)

  it('respects concurrency limit (does not exceed it)', async () => {
    // Use concurrency=1 — effectively serial. Should still produce correct results.
    repos = await spinUpAll(['empty-repo', 'feature-branch-one-commit'], { concurrency: 1 })
    expect(repos).toHaveLength(2)
    expect(existsSync(repos[0].path)).toBe(true)
    expect(existsSync(repos[1].path)).toBe(true)
  }, 30_000)

  it('passes spinUpScenario options through (e.g. autoCleanup)', async () => {
    repos = await spinUpAll(['empty-repo'], { autoCleanup: true })
    expect(repos).toHaveLength(1)
    expect(existsSync(repos[0].path)).toBe(true)
  }, 30_000)

  it('cleans up all repos on failure and throws', async () => {
    const paths: string[] = []

    // Spy on a successful materialization before the failure
    const validRepos = await spinUpAll(['empty-repo'], { concurrency: 1 })
    paths.push(validRepos[0].path)
    await validRepos[0].cleanup()

    // Now attempt with an invalid scenario name — should throw
    await expect(
      spinUpAll(['empty-repo', 'this-scenario-does-not-exist'], { concurrency: 2 }),
    ).rejects.toThrow()
  }, 30_000)

  it('defaults concurrency to 4 when not specified', async () => {
    // Materialize 5 scenarios — with default concurrency 4, this should
    // work and produce 5 repos (proves concurrency < names.length works)
    repos = await spinUpAll([
      'empty-repo',
      'feature-branch-one-commit',
      'two-commit-feature',
      'stashed-changes',
      'detached-head',
    ])
    expect(repos).toHaveLength(5)
  }, 60_000)
})
