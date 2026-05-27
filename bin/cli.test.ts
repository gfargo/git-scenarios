/**
 * Smoke tests for the `git-scenarios` CLI.
 *
 * The CLI uses the mutable registry (so custom-registered scenarios
 * surface in `list`, `describe`, and `create`). These tests exercise
 * that registry path — they're intentionally lightweight; the full
 * registry surface is covered in `src/registry.test.ts`.
 */

import { existsSync } from 'fs'
import { join } from 'path'

import { findRegistered, listRegistered, registerScenario, resetRegistry } from '../src/registry'
import { defineScenario, chain, addCommit } from '../src/atoms'

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
