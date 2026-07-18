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
 *  - worktree/submodule scenarios are declined + fall back to cold replay
 *  - hash-identity holds for extra steps applied after a cache hit
 */

import { existsSync } from 'fs'
import { readdir, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

import { cacheRoot, clearScenarioCache, materializeCached } from './scenarioCache'
import { spinUpScenario } from './spinUpScenario'
import { fromScenario } from './fromScenario'
import { addCommit } from './atoms/addCommit'
import { defineScenario } from './atoms/defineScenario'
import { registerScenario, unregisterScenario, resetRegistry } from './registry'
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

  it('extra step hash-identical to cold replay (clock restored after cache hit)', async () => {
    const step = addCommit({ message: 'extra: clock test', files: { 'clock.ts': 'export const t = 1\n' } })

    // Cold: replay scenario from scratch, then apply extra step
    const { createTempGitRepo } = await import('./tempGitRepo')
    const { findRegistered } = await import('./registry')
    const scenario = findRegistered('feature-pr-ready')!
    const cold = await createTempGitRepo()
    await scenario.setup(cold)
    await step(cold)

    // Warm: materialized from cache, then apply same extra step
    const warm = await fromScenario('feature-pr-ready', { cache: true }, step)
    repo = warm

    const coldHashes = await cold.git.raw(['log', '--all', '--format=%H'])
    const warmHashes = await warm.git.raw(['log', '--all', '--format=%H'])

    await cold.cleanup()

    expect(warmHashes.trim()).toBe(coldHashes.trim())
    expect(warmHashes.trim().length).toBeGreaterThan(0)
  })
})

describe('cache safety: uncacheable scenarios', () => {
  let repo: TempGitRepo

  afterEach(async () => {
    await repo?.cleanup()
  })

  it('declines to cache multiple-worktrees and falls back to cold replay', async () => {
    const { findRegistered } = await import('./registry')
    const scenario = findRegistered('multiple-worktrees')!
    expect(scenario).toBeDefined()

    repo = await materializeCached(scenario)
    expect(existsSync(repo.path)).toBe(true)
    expect(existsSync(join(repo.path, '.git'))).toBe(true)

    // No template should exist in the cache for this scenario
    const cacheEntries = await readdir(cacheRoot()).catch(() => [])
    const worktreeTemplate = cacheEntries.find((e) => e.startsWith('multiple-worktrees'))
    expect(worktreeTemplate).toBeUndefined()
  })

  it('declines to cache submodule-with-history and falls back to cold replay', async () => {
    const { findRegistered } = await import('./registry')
    const scenario = findRegistered('submodule-with-history')!
    expect(scenario).toBeDefined()

    repo = await materializeCached(scenario)
    expect(existsSync(repo.path)).toBe(true)
    expect(existsSync(join(repo.path, '.git'))).toBe(true)

    const cacheEntries = await readdir(cacheRoot()).catch(() => [])
    const submoduleTemplate = cacheEntries.find((e) => e.startsWith('submodule-with-history'))
    expect(submoduleTemplate).toBeUndefined()
  }, 60_000)
})

describe('cache safety: custom scenarios', () => {
  let repo: TempGitRepo

  afterEach(async () => {
    await repo?.cleanup()
    resetRegistry()
  })

  it('never serves a stale template for a version-less custom scenario', async () => {
    registerScenario(
      defineScenario({
        name: 'my-scenario',
        summary: 'custom scenario A',
        description: 'writes file A',
        kind: 'branch',
        setup: async (r) => {
          await r.writeFile('marker.txt', 'A')
          await r.commitAll('chore: A')
        },
      }),
    )

    const { findRegistered } = await import('./registry')
    const first = await materializeCached(findRegistered('my-scenario')!)
    const firstContent = await readFile(join(first.path, 'marker.txt'), 'utf8')
    expect(firstContent).toBe('A')
    await first.cleanup()

    unregisterScenario('my-scenario')
    registerScenario(
      defineScenario({
        name: 'my-scenario',
        summary: 'custom scenario B',
        description: 'writes file B',
        kind: 'branch',
        setup: async (r) => {
          await r.writeFile('marker.txt', 'B')
          await r.commitAll('chore: B')
        },
      }),
    )

    const second = await materializeCached(findRegistered('my-scenario')!)
    repo = second
    const secondContent = await readFile(join(second.path, 'marker.txt'), 'utf8')
    expect(secondContent).toBe('B')

    const cacheEntries = await readdir(cacheRoot()).catch(() => [])
    const customTemplate = cacheEntries.find((e) => e.startsWith('my-scenario@'))
    expect(customTemplate).toBeUndefined()
  })

  it('caches a custom scenario only when an explicit version is supplied, and bumping it invalidates', async () => {
    registerScenario(
      defineScenario({
        name: 'my-versioned',
        summary: 'custom versioned scenario v1',
        description: 'writes file v1',
        kind: 'branch',
        version: '1',
        setup: async (r) => {
          await r.writeFile('marker.txt', 'v1')
          await r.commitAll('chore: v1')
        },
      }),
    )

    const { findRegistered } = await import('./registry')
    const v1 = await materializeCached(findRegistered('my-versioned')!)
    await v1.cleanup()

    let cacheEntries = await readdir(cacheRoot()).catch(() => [])
    expect(cacheEntries.some((e) => e.startsWith('my-versioned@custom-1'))).toBe(true)

    unregisterScenario('my-versioned')
    registerScenario(
      defineScenario({
        name: 'my-versioned',
        summary: 'custom versioned scenario v2',
        description: 'writes file v2',
        kind: 'branch',
        version: '2',
        setup: async (r) => {
          await r.writeFile('marker.txt', 'v2')
          await r.commitAll('chore: v2')
        },
      }),
    )

    const v2 = await materializeCached(findRegistered('my-versioned')!)
    repo = v2
    const v2Content = await readFile(join(v2.path, 'marker.txt'), 'utf8')
    expect(v2Content).toBe('v2')

    cacheEntries = await readdir(cacheRoot()).catch(() => [])
    expect(cacheEntries.some((e) => e.startsWith('my-versioned@custom-1'))).toBe(true)
    expect(cacheEntries.some((e) => e.startsWith('my-versioned@custom-2'))).toBe(true)
  })

  it('treats a re-registered scenario with a built-in name as custom (reference identity)', async () => {
    unregisterScenario('empty-repo')
    registerScenario(
      defineScenario({
        name: 'empty-repo',
        summary: 'shadow of built-in empty-repo',
        description: 'a completely different setup',
        kind: 'branch',
        setup: async (r) => {
          await r.writeFile('shadow.txt', 'shadow')
          await r.commitAll('chore: shadow')
        },
      }),
    )

    const { findRegistered } = await import('./registry')
    repo = await materializeCached(findRegistered('empty-repo')!)
    expect(existsSync(join(repo.path, 'shadow.txt'))).toBe(true)

    // The built-in template key must not have been reused/overwritten by
    // this shadowing custom scenario.
    const cacheEntries = await readdir(cacheRoot()).catch(() => [])
    const emptyRepoTemplates = cacheEntries.filter((e) => e.startsWith('empty-repo@'))
    expect(emptyRepoTemplates.every((e) => !e.includes('custom'))).toBe(true)
  })
})
