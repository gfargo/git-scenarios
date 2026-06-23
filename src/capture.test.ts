/**
 * Tests for the `capture` feature — reading a real repo's shape and
 * rendering it back as a scenario module.
 *
 * The headline test is the round-trip: build a repo from a known
 * built-in scenario, capture it, render the module, transpile +
 * evaluate the generated code (with the local atoms injected), run its
 * `setup` on a fresh repo, and assert the reproduced repo has the same
 * shape. That proves the generated module is both syntactically valid
 * AND behaviorally faithful.
 */

import * as ts from 'typescript'

import {
  captureToJson,
  deriveContracts,
  gatherRepoState,
  normalizeName,
  renderScenarioModule,
  type CapturedState,
} from './capture'
import * as gitScenarios from './index'
import { findRegistered } from './registry'
import { createTempGitRepo, type TempGitRepo } from './tempGitRepo'

async function buildScenario(name: string): Promise<TempGitRepo> {
  const repo = await createTempGitRepo()
  const scenario = findRegistered(name)
  if (!scenario) throw new Error(`unknown scenario ${name}`)
  await scenario.setup(repo)
  return repo
}

/**
 * Transpile a generated scenario module and evaluate it with the local
 * `@gfargo/git-scenarios` atoms injected in place of the import, then
 * return the exported scenario object.
 */
function evalScenarioModule(source: string): gitScenarios.Scenario {
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText

  const moduleExports: Record<string, unknown> = {}
  const fakeRequire = () => gitScenarios
  // eslint-disable-next-line no-new-func
  const fn = new Function('require', 'exports', 'module', js)
  fn(fakeRequire, moduleExports, { exports: moduleExports })

  const exported = Object.values(moduleExports).find(
    (v) => v && typeof v === 'object' && 'setup' in (v as object),
  )
  if (!exported) throw new Error('generated module exported no scenario')
  return exported as gitScenarios.Scenario
}

describe('capture — gatherRepoState (data layer)', () => {
  it('captures branch divergence (feature-pr-ready)', async () => {
    const repo = await buildScenario('feature-pr-ready')
    try {
      const state = await gatherRepoState(repo.git, repo.path)
      expect(state.currentBranch).toBe('feat/widget-v2')
      expect(state.detached).toBe(false)
      expect(state.baseBranch).toBe('main')
      expect(state.baseCommits).toHaveLength(3)
      expect(state.branchCommits).toHaveLength(4)
      expect(state.clean).toBe(true)
      // Messages preserved, oldest-first.
      expect(state.baseCommits[0].message).toBe('chore: initial commit')
      expect(state.branchCommits[3].message).toMatch(/widget-v2 API/)
    } finally {
      await repo.cleanup()
    }
  }, 30_000)

  it('captures a dirty working tree (single-staged-file)', async () => {
    const repo = await buildScenario('single-staged-file')
    try {
      const state = await gatherRepoState(repo.git, repo.path)
      expect(state.clean).toBe(false)
      expect(state.changes.length).toBeGreaterThan(0)
      expect(state.changes.some((c) => c.staged)).toBe(true)
    } finally {
      await repo.cleanup()
    }
  }, 30_000)

  it('handles an empty repo (no commits)', async () => {
    const repo = await createTempGitRepo()
    try {
      const state = await gatherRepoState(repo.git, repo.path)
      expect(state.branchCommits).toHaveLength(0)
      expect(state.baseCommits).toHaveLength(0)
      expect(state.clean).toBe(true)
    } finally {
      await repo.cleanup()
    }
  })

  it('detects a detached HEAD', async () => {
    const repo = await buildScenario('detached-head')
    try {
      const state = await gatherRepoState(repo.git, repo.path)
      expect(state.detached).toBe(true)
      expect(state.currentBranch).toBeNull()
    } finally {
      await repo.cleanup()
    }
  }, 30_000)
})

describe('capture — renderScenarioModule', () => {
  it('emits syntactically valid TypeScript', async () => {
    const repo = await buildScenario('feature-pr-ready')
    try {
      const state = await gatherRepoState(repo.git, repo.path)
      const source = renderScenarioModule(state, { name: 'render-check' })

      const result = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        reportDiagnostics: true,
      })
      expect(result.diagnostics ?? []).toHaveLength(0)
      expect(source).toContain('defineScenario(')
      expect(source).toContain('switchToBranch("feat/widget-v2")')
      expect(source).toContain("kind: \"branch\"")
    } finally {
      await repo.cleanup()
    }
  }, 30_000)

  it('only imports atoms it actually uses', () => {
    const cleanState: CapturedState = {
      currentBranch: 'main',
      detached: false,
      baseBranch: null,
      baseCommits: [],
      branchCommits: [{ message: 'init', date: '2026-01-01T00:00:00Z' }],
      localBranches: ['main'],
      remotes: [],
      changes: [],
      clean: true,
    }
    const source = renderScenarioModule(cleanState, { name: 'minimal' })
    // No working-tree changes → no writeFiles/stageFiles import.
    expect(source).not.toContain('writeFiles')
    expect(source).not.toContain('stageFiles')
    // No base branch → no switchToBranch import.
    expect(source).not.toContain('switchToBranch')
    expect(source).toContain('addCommit')
  })
})

describe('capture — round-trip (generated module reproduces the shape)', () => {
  it.each(['feature-pr-ready', 'two-commit-feature', 'single-staged-file'])(
    'reproduces %s',
    async (scenarioName) => {
      const original = await buildScenario(scenarioName)
      let reproduced: TempGitRepo | null = null
      try {
        const stateA = await gatherRepoState(original.git, original.path)
        const source = renderScenarioModule(stateA, {
          name: 'round-trip-repro',
          importFrom: '@gfargo/git-scenarios',
        })

        const scenario = evalScenarioModule(source)
        reproduced = await createTempGitRepo()
        await scenario.setup(reproduced)

        const stateB = await gatherRepoState(reproduced.git, reproduced.path)
        expect(stateB.currentBranch).toBe(stateA.currentBranch)
        expect(stateB.baseBranch).toBe(stateA.baseBranch)
        expect(stateB.baseCommits).toHaveLength(stateA.baseCommits.length)
        expect(stateB.branchCommits).toHaveLength(stateA.branchCommits.length)
        expect(stateB.clean).toBe(stateA.clean)
      } finally {
        await original.cleanup()
        if (reproduced) await reproduced.cleanup()
      }
    },
    45_000,
  )
})

describe('capture — helpers', () => {
  it('normalizeName produces kebab-case', () => {
    expect(normalizeName('My Bug Repro')).toBe('my-bug-repro')
    expect(normalizeName('feat/widget-v2')).toBe('feat-widget-v2')
    expect(normalizeName('___')).toBe('captured-scenario')
  })

  it('deriveContracts reflects divergence and dirtiness', () => {
    const state: CapturedState = {
      currentBranch: 'feature',
      detached: false,
      baseBranch: 'main',
      baseCommits: [{ message: 'a', date: '' }, { message: 'b', date: '' }],
      branchCommits: [{ message: 'c', date: '' }],
      localBranches: ['main', 'feature'],
      remotes: [],
      changes: [{ path: 'x.ts', staged: false, untracked: true, content: 'x' }],
      clean: false,
    }
    const contracts = deriveContracts(state)
    expect(contracts).toContain('feature is checked out')
    expect(contracts).toContain('main has 2 commits')
    expect(contracts).toContain('feature is 1 commits ahead of main')
    expect(contracts).toContain('worktree has 1 uncommitted change')
  })

  it('captureToJson omits file content but keeps change metadata', () => {
    const state: CapturedState = {
      currentBranch: 'main',
      detached: false,
      baseBranch: null,
      baseCommits: [],
      branchCommits: [],
      localBranches: ['main'],
      remotes: [{ name: 'origin', url: 'git@github.com:org/repo.git' }],
      changes: [{ path: 'secret.env', staged: true, untracked: false, content: 'TOKEN=xyz' }],
      clean: false,
    }
    const json = captureToJson(state, 'x') as { changes: Array<Record<string, unknown>> }
    expect(json.changes[0]).not.toHaveProperty('content')
    expect(json.changes[0].path).toBe('secret.env')
    expect(json.changes[0].staged).toBe(true)
  })
})
