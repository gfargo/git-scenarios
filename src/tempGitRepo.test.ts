/**
 * Tests for the TempGitRepo helpers added in v0.6:
 *   - readFile / exists
 *   - autoCleanup option (process-exit hook)
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { createTempGitRepo, type TempGitRepo } from './tempGitRepo'

describe('TempGitRepo.readFile', () => {
  let repo: TempGitRepo

  beforeEach(async () => {
    repo = await createTempGitRepo()
  })

  afterEach(async () => {
    await repo.cleanup()
  })

  it('reads a file written via writeFile', async () => {
    await repo.writeFile('a.ts', 'export const x = 1\n')
    const content = await repo.readFile('a.ts')
    expect(content).toBe('export const x = 1\n')
  })

  it('reads a deeply-nested path', async () => {
    await repo.writeFile('src/lib/util.ts', 'export const u = 2\n')
    expect(await repo.readFile('src/lib/util.ts')).toBe('export const u = 2\n')
  })

  it('throws on missing file', async () => {
    await expect(repo.readFile('does-not-exist.ts')).rejects.toThrow()
  })
})

describe('TempGitRepo.exists', () => {
  let repo: TempGitRepo

  beforeEach(async () => {
    repo = await createTempGitRepo()
  })

  afterEach(async () => {
    await repo.cleanup()
  })

  it('returns true for an existing file', async () => {
    await repo.writeFile('a.ts', 'x')
    expect(await repo.exists('a.ts')).toBe(true)
  })

  it('returns false for a missing file', async () => {
    expect(await repo.exists('missing.ts')).toBe(false)
  })

  it('returns true for an existing directory', async () => {
    await repo.writeFile('src/a.ts', 'x')
    expect(await repo.exists('src')).toBe(true)
  })

  it('returns true for the .git dir', async () => {
    expect(await repo.exists('.git')).toBe(true)
  })
})

describe('TempGitRepo.autoCleanup', () => {
  // We can't easily test the actual process-exit hook in a Jest run
  // (the hook fires when *Jest* exits, not the test). But we can
  // verify autoCleanup repos are tracked, and that explicit cleanup
  // removes them from the tracker.
  it('explicit cleanup still works when autoCleanup is enabled', async () => {
    const repo = await createTempGitRepo({ autoCleanup: true })
    expect(existsSync(repo.path)).toBe(true)
    await repo.cleanup()
    expect(existsSync(repo.path)).toBe(false)
  })

  it('cleanup is idempotent', async () => {
    const repo = await createTempGitRepo({ autoCleanup: true })
    await repo.cleanup()
    // Second call should not throw.
    await expect(repo.cleanup()).resolves.toBeUndefined()
  })

  it('default behavior (no autoCleanup) still requires explicit cleanup', async () => {
    const repo = await createTempGitRepo()
    expect(existsSync(repo.path)).toBe(true)
    // The path persists until explicit cleanup.
    expect(existsSync(repo.path)).toBe(true)
    await repo.cleanup()
    expect(existsSync(repo.path)).toBe(false)
  })
})

describe('createTempGitRepo race conditions', () => {
  it('multiple parallel calls produce distinct paths', async () => {
    const repos = await Promise.all([
      createTempGitRepo(),
      createTempGitRepo(),
      createTempGitRepo(),
      createTempGitRepo(),
      createTempGitRepo(),
    ])
    try {
      const paths = repos.map((r) => r.path)
      expect(new Set(paths).size).toBe(repos.length)
      // Each is independently functional
      for (const repo of repos) {
        await repo.writeFile('marker.ts', `id: ${repo.path}`)
        const content = readFileSync(join(repo.path, 'marker.ts'), 'utf8')
        expect(content).toBe(`id: ${repo.path}`)
      }
    } finally {
      await Promise.all(repos.map((r) => r.cleanup()))
    }
  })
})
