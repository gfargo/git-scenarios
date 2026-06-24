/**
 * Tests for the content-addressed scenario cache (scenarioCache.ts).
 *
 * Exercises:
 *  - cache-miss builds a template and returns a usable repo
 *  - cache-hit returns a byte-identical copy without rebuilding
 *  - clearScenarioCache removes all templates
 *  - materializeCached with autoCleanup works correctly
 *  - spinUpScenario({ cache: true }) end-to-end
 *  - fromScenario({ cache: true }, ...steps) end-to-end
 */

import { existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { cacheRoot, clearScenarioCache, materializeCached } from './scenarioCache'
import { spinUpScenario } from './spinUpScenario'
import { fromScenario } from './fromScenario'
import { addCommit } from './atoms/addCommit'
import type { TempGitRepo } from './tempGitRepo'

// Use a custom cache root per test run to avoid cross-test pollution
// and to allow deterministic teardown.
const TEST_CACHE_ROOT = join(tmpdir(), `git-scenarios-cache-test-${process.pid}`)

beforeAll(() => {
  process.env['GIT_SCENARIOS_CACHE_DIR'] = TEST_CACHE_ROOT
})

afterAll(async () => {
  delete process.env['GIT_SCENARIOS_CACHE_DIR']
  await clearScenarioCache()
})

// Use a cheap scenario so tests are fast
const SCENARIO = 'empty-repo'

describe('cacheRoot()', () => {
  it('returns the GIT_SCENARIOS_CACHE_DIR override when set', () => {
    expect(cacheRoot()).toBe(TEST_CACHE_ROOT)
  })

  it('falls back to tmpdir/git-scenarios-cache when env is unset', () => {
    const saved = process.env['GIT_SCENARIOS_CACHE_DIR']
    delete process.env['GIT_SCENARIOS_CACHE_DIR']
    try {
      expect(cacheRoot()).toBe(join(tmpdir(), 'git-scenarios-cache'))
    } finally {
      if (saved !== undefined) process.env['GIT_SCENARIOS_CACHE_DIR'] = saved
    }
  })
})

describe('materializeCached()', () => {
  let repo: TempGitRepo

  afterEach(async () => {
    await repo?.cleanup()
  })

  it('builds a template on cache miss and returns a usable repo', async () => {
    const { findRegistered } = await import('./registry')
    const scenario = findRegistered(SCENARIO)!
    expect(scenario).toBeDefined()

    repo = await materializeCached(scenario)
    expect(existsSync(repo.path)).toBe(true)
    expect(existsSync(join(repo.path, '.git'))).toBe(true)
  })

  it('cache-hit returns a repo at a different path each time (independent copies)', async () => {
    const { findRegistered } = await import('./registry')
    const scenario = findRegistered(SCENARIO)!

    const repoA = await materializeCached(scenario)
    const repoB = await materializeCached(scenario)

    try {
      expect(repoA.path).not.toBe(repoB.path)
      expect(existsSync(repoA.path)).toBe(true)
      expect(existsSync(repoB.path)).toBe(true)
    } finally {
      await repoA.cleanup()
      await repoB.cleanup()
    }
    // only assign one to `repo` so afterEach doesn't double-cleanup
    repo = await materializeCached(scenario)
  })

  it('cache-hit is hash-identical to a cold replay (empty-repo)', async () => {
    const { findRegistered } = await import('./registry')
    const scenario = findRegistered(SCENARIO)!

    // Cold replay (no cache)
    const { createTempGitRepo } = await import('./tempGitRepo')
    const cold = await createTempGitRepo()
    await scenario.setup(cold)

    // Warm cache copy
    const warm = await materializeCached(scenario)
    repo = warm

    const coldHashes = await cold.git.raw(['log', '--all', '--format=%H'])
    const warmHashes = await warm.git.raw(['log', '--all', '--format=%H'])

    await cold.cleanup()

    expect(warmHashes.trim()).toBe(coldHashes.trim())
  })

  it('cache-hit is hash-identical to a cold replay (scenario with commits)', async () => {
    const { findRegistered } = await import('./registry')
    const scenario = findRegistered('feature-pr-ready')!
    expect(scenario).toBeDefined()

    const { createTempGitRepo } = await import('./tempGitRepo')
    const cold = await createTempGitRepo()
    await scenario.setup(cold)

    const warm = await materializeCached(scenario)
    repo = warm

    const coldHashes = await cold.git.raw(['log', '--all', '--format=%H'])
    const warmHashes = await warm.git.raw(['log', '--all', '--format=%H'])

    await cold.cleanup()

    expect(warmHashes.trim()).toBe(coldHashes.trim())
    // Sanity: there are actual commits to compare
    expect(warmHashes.trim().length).toBeGreaterThan(0)
  })

  it('supports autoCleanup option', async () => {
    const { findRegistered } = await import('./registry')
    const scenario = findRegistered(SCENARIO)!

    repo = await materializeCached(scenario, { autoCleanup: true })
    expect(existsSync(repo.path)).toBe(true)
    await repo.cleanup()
    expect(existsSync(repo.path)).toBe(false)
  })
})

describe('clearScenarioCache()', () => {
  it('removes the cache root directory', async () => {
    const { findRegistered } = await import('./registry')
    const scenario = findRegistered(SCENARIO)!

    // Ensure at least one template exists
    const repo = await materializeCached(scenario)
    await repo.cleanup()
    expect(existsSync(cacheRoot())).toBe(true)

    await clearScenarioCache()
    expect(existsSync(cacheRoot())).toBe(false)
  })

  it('is safe to call when cache is already empty', async () => {
    // Cache was cleared above — calling again must not throw
    await expect(clearScenarioCache()).resolves.toBeUndefined()
  })
})

describe('spinUpScenario({ cache: true })', () => {
  let repo: TempGitRepo

  afterEach(async () => {
    await repo?.cleanup()
  })

  it('returns a usable repo with the expected state', async () => {
    repo = await spinUpScenario(SCENARIO, { cache: true })
    expect(existsSync(repo.path)).toBe(true)
    expect(existsSync(join(repo.path, '.git'))).toBe(true)
  })

  it('is hash-identical to a cold spinUpScenario', async () => {
    const cold = await spinUpScenario(SCENARIO)
    const warm = await spinUpScenario(SCENARIO, { cache: true })
    repo = warm

    const coldHashes = await cold.git.raw(['log', '--all', '--format=%H'])
    const warmHashes = await warm.git.raw(['log', '--all', '--format=%H'])

    await cold.cleanup()

    expect(warmHashes.trim()).toBe(coldHashes.trim())
  })

  it('supports the remote option alongside cache', async () => {
    repo = await spinUpScenario(SCENARIO, {
      cache: true,
      remote: 'git@github.com:org/repo.git',
    })
    const remotes = await repo.git.getRemotes(true)
    const origin = remotes.find((r) => r.name === 'origin')
    expect(origin).toBeDefined()
    expect(origin!.refs.fetch).toBe('git@github.com:org/repo.git')
  })
})

describe('fromScenario({ cache: true }, ...steps)', () => {
  let repo: TempGitRepo

  afterEach(async () => {
    await repo?.cleanup()
  })

  it('applies extra steps on top of a cached base', async () => {
    repo = await fromScenario(
      SCENARIO,
      { cache: true },
      addCommit({ message: 'extra: from cache test', files: { 'extra.ts': 'export const x = 1\n' } }),
    )
    // Use raw git to get commit subjects so we're not tied to simple-git's log format
    const subjects = await repo.git.raw(['log', '--format=%s'])
    expect(subjects.trim().split('\n')[0]).toBe('extra: from cache test')
  })

  it('backward-compat: plain steps still work without options object', async () => {
    repo = await fromScenario(
      SCENARIO,
      addCommit({ message: 'compat', files: { 'a.ts': '' } }),
    )
    const subjects = await repo.git.raw(['log', '--format=%s'])
    expect(subjects.trim().split('\n')[0]).toBe('compat')
  })
})
