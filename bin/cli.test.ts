/**
 * Smoke tests for the `git-scenarios` CLI.
 *
 * The CLI uses the mutable registry (so custom-registered scenarios
 * surface in `list`, `describe`, and `create`). These tests exercise
 * that registry path — they're intentionally lightweight; the full
 * registry surface is covered in `src/registry.test.ts`.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { findRegistered, listRegistered, registerScenario, resetRegistry } from '../src/registry'
import { defineScenario, chain, addCommit } from '../src/atoms'
import { moveDir, parseGitVersion } from '../bin/cli'

describe('CLI — scenario registry (lookup path used by CLI)', () => {
  afterEach(() => {
    resetRegistry()
  })

  it('has at least 20 registered scenarios', () => {
    expect(listRegistered().length).toBeGreaterThanOrEqual(20)
  })

  it('findRegistered returns undefined for unknown names', () => {
    expect(findRegistered('nonexistent-scenario-xyz')).toBeUndefined()
  })

  it('findRegistered returns a scenario for a known name', () => {
    const scenario = findRegistered('mid-merge-conflict')
    expect(scenario).toBeDefined()
    expect(scenario!.name).toBe('mid-merge-conflict')
    expect(scenario!.kind).toBe('operation')
  })

  it('all scenarios have required fields', () => {
    for (const s of listRegistered()) {
      expect(s.name).toMatch(/^[a-z][a-z0-9-]*$/)
      expect(s.summary.length).toBeGreaterThan(0)
      expect(s.description.length).toBeGreaterThan(0)
      expect(['branch', 'worktree', 'operation', 'history', 'stash', 'submodule']).toContain(s.kind)
      expect(typeof s.setup).toBe('function')
    }
  })

  it('scenario names are unique', () => {
    const names = listRegistered().map((s) => s.name)
    expect(new Set(names).size).toBe(names.length)
  })

  // Critical: the CLI must see custom-registered scenarios. This was
  // a regression in v0.5 — the CLI was importing `findScenario` from
  // `scenarios/index.ts` which only had built-ins.
  it('CLI lookup path surfaces custom-registered scenarios', () => {
    const custom = defineScenario({
      name: 'cli-custom-test',
      summary: 'a custom scenario for CLI lookup verification',
      description: 'verifies the CLI uses the mutable registry, not a static array.',
      kind: 'branch',
      setup: chain(addCommit({ message: 'init', files: { 'a.ts': 'a\n' } })),
    })
    registerScenario(custom)
    expect(findRegistered('cli-custom-test')).toBeDefined()
    expect(listRegistered().some((s) => s.name === 'cli-custom-test')).toBe(true)
  })
})

describe('CLI — create flow (smoke)', () => {
  it('creates and cleans up a scenario', async () => {
    const { createTempGitRepo } = await import('../src/tempGitRepo')

    const scenario = findRegistered('empty-repo')!
    const repo = await createTempGitRepo()
    await scenario.setup(repo)

    expect(existsSync(repo.path)).toBe(true)
    expect(existsSync(join(repo.path, '.git'))).toBe(true)

    await repo.cleanup()
    expect(existsSync(repo.path)).toBe(false)
  })

  it('creates feature-pr-ready and verifies basic state', async () => {
    const { createTempGitRepo } = await import('../src/tempGitRepo')

    const scenario = findRegistered('feature-pr-ready')!
    const repo = await createTempGitRepo()

    try {
      await scenario.setup(repo)
      const branches = await repo.git.branchLocal()
      expect(branches.all).toContain('main')
      expect(branches.current).not.toBe('main')
    } finally {
      await repo.cleanup()
    }
  })
})

describe('moveDir (cross-platform replacement for spawnSync("mv"))', () => {
  it('moves a populated directory to a fresh destination', () => {
    const src = mkdtempSync(join(tmpdir(), 'git-scenarios-movedir-src-'))
    const dest = join(tmpdir(), `git-scenarios-movedir-dest-${process.pid}-${Math.random().toString(36).slice(2)}`)
    writeFileSync(join(src, 'file.txt'), 'hello\n')

    try {
      moveDir(src, dest)

      expect(existsSync(src)).toBe(false)
      expect(existsSync(dest)).toBe(true)
      expect(readFileSync(join(dest, 'file.txt'), 'utf8')).toBe('hello\n')
    } finally {
      rmSync(dest, { recursive: true, force: true })
    }
  })

  it('falls back to copy+remove when renameSync reports EXDEV', () => {
    const fs = jest.requireActual('fs')
    const src = mkdtempSync(join(tmpdir(), 'git-scenarios-movedir-exdev-src-'))
    const dest = join(tmpdir(), `git-scenarios-movedir-exdev-dest-${process.pid}-${Math.random().toString(36).slice(2)}`)
    writeFileSync(join(src, 'file.txt'), 'cross-device\n')

    const renameSpy = jest.spyOn(fs, 'renameSync').mockImplementation(() => {
      const error = new Error('EXDEV: cross-device link not permitted') as NodeJS.ErrnoException
      error.code = 'EXDEV'
      throw error
    })

    try {
      moveDir(src, dest)

      expect(existsSync(src)).toBe(false)
      expect(existsSync(dest)).toBe(true)
      expect(readFileSync(join(dest, 'file.txt'), 'utf8')).toBe('cross-device\n')
    } finally {
      renameSpy.mockRestore()
      rmSync(dest, { recursive: true, force: true })
    }
  })
})

describe('parseGitVersion', () => {
  it('parses a standard version string', () => {
    expect(parseGitVersion('git version 2.39.0')).toEqual([2, 39, 0])
  })

  it('parses the minimum required version', () => {
    expect(parseGitVersion('git version 2.25.0')).toEqual([2, 25, 0])
  })

  it('parses a version below the minimum', () => {
    expect(parseGitVersion('git version 2.24.9')).toEqual([2, 24, 9])
  })

  it('parses a Windows extended version string', () => {
    expect(parseGitVersion('git version 2.40.1.windows.1')).toEqual([2, 40, 1])
  })

  it('returns null for garbage input', () => {
    expect(parseGitVersion('not a git version')).toBeNull()
    expect(parseGitVersion('')).toBeNull()
    expect(parseGitVersion('version 2.39.0')).toBeNull()
  })
})

describe('CLI — list filtering (--kind / --tag)', () => {
  // The CLI's applyFilters is a private helper; test the same
  // semantics via the registry directly. The CLI calls listRegistered()
  // then filters, which is what we mimic here.
  it('--kind filter narrows by scenario.kind', () => {
    const all = listRegistered()
    const operations = all.filter((s) => s.kind === 'operation')
    expect(operations.length).toBeGreaterThanOrEqual(5) // 4 conflict + bisect
    for (const s of operations) {
      expect(s.kind).toBe('operation')
    }
  })

  it('--tag filter narrows by scenario.tags inclusion', () => {
    const all = listRegistered()
    const conflicts = all.filter((s) => s.tags?.includes('conflict'))
    expect(conflicts.length).toBeGreaterThanOrEqual(4) // merge, rebase, cherry-pick, revert
    for (const s of conflicts) {
      expect(s.tags).toContain('conflict')
    }
  })

  it('--kind + --tag combine (AND semantics)', () => {
    const all = listRegistered()
    const stashUntracked = all.filter(
      (s) => s.kind === 'stash' && s.tags?.includes('untracked'),
    )
    expect(stashUntracked.length).toBe(1)
    expect(stashUntracked[0].name).toBe('stash-with-untracked')
  })
})
