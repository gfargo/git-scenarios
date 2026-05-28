/**
 * Node.js native test runner adapter for `@gfargo/git-scenarios`.
 *
 * Uses the built-in `node:test` module (stable since Node 20). No
 * external test framework dependency — just Node itself.
 *
 * Usage:
 *
 *   import { describeWithScenario } from '@gfargo/git-scenarios/node-test'
 *   import assert from 'node:assert/strict'
 *
 *   describeWithScenario('feature-pr-ready', (getRepo) => {
 *     it('is on a feature branch', async () => {
 *       const repo = getRepo()
 *       const status = await repo.git.status()
 *       assert.notStrictEqual(status.current, 'main')
 *     })
 *   })
 *
 * Run with:
 *   node --test src/**\/*.test.ts
 *   # or with a loader for TypeScript:
 *   node --import tsx --test src/**\/*.test.ts
 *
 * The scenario is spun up once in `before()` and cleaned up in
 * `after()`. The `getRepo()` accessor returns the live `TempGitRepo`
 * instance — call it inside `it()` / `test()` blocks.
 *
 * For scenarios that need extra setup on top of the base scenario:
 *
 *   describeWithScenario('mid-merge-conflict', (getRepo) => {
 *     it('has conflicts', async () => {
 *       const repo = getRepo()
 *       const status = await repo.git.status()
 *       assert.ok(status.conflicted.length > 0)
 *     })
 *   }, {
 *     timeout: 60_000,
 *     extraSteps: [writeFiles({ 'extra.ts': 'extra\n' })],
 *   })
 *
 * **Why a separate adapter?** `node:test`'s `describe` / `before` /
 * `after` are imported from the `node:test` module, not injected as
 * globals. The Jest and Vitest adapters rely on their respective
 * framework's global injection. This adapter imports directly from
 * `node:test` so it works without any framework runtime.
 */

import { describe, before, after, it } from 'node:test'
import type { TempGitRepo } from './tempGitRepo'
import type { Step } from './atoms/types'
import { createTempGitRepo } from './tempGitRepo'
import { resolveScenario } from './resolveScenario'
import { chain } from './atoms/chain'

export type DescribeWithScenarioOptions = {
  /**
   * Timeout for the before() setup hook in milliseconds.
   * Default: 30_000ms. Increase for scenarios with submodules or
   * large histories.
   *
   * Note: `node:test` applies timeout at the test/suite level via
   * the `timeout` option on `describe()`. This value is passed
   * there so the entire suite (setup + tests + teardown) gets the
   * specified budget.
   */
  timeout?: number
  /**
   * Additional atoms to apply after the scenario's setup.
   * Useful for extending a base scenario with test-specific state.
   */
  extraSteps?: Step[]
}

/**
 * A `node:test` `describe` wrapper that spins up a named scenario in
 * `before()` and cleans it up in `after()`.
 *
 * @param scenarioName - The registered scenario name (kebab-case)
 * @param fn - The describe callback. Receives a `getRepo()` accessor
 *   that returns the `TempGitRepo` instance. Use `it()` from
 *   `node:test` inside (re-exported from this module for convenience).
 * @param options - Optional configuration (timeout, extra steps)
 */
export function describeWithScenario(
  scenarioName: string,
  fn: (getRepo: () => TempGitRepo) => void,
  options: DescribeWithScenarioOptions = {},
): void {
  const { timeout = 30_000, extraSteps } = options

  describe(`scenario: ${scenarioName}`, { timeout }, () => {
    let repo: TempGitRepo

    before(async () => {
      const scenario = resolveScenario(scenarioName, 'describeWithScenario')

      repo = await createTempGitRepo()
      await scenario.setup(repo)

      if (extraSteps && extraSteps.length > 0) {
        await chain(...extraSteps)(repo)
      }
    })

    after(async () => {
      await repo?.cleanup()
    })

    fn(() => repo)
  })
}

/**
 * Run a test function against each of the specified scenarios.
 * Useful for verifying that a tool works correctly across multiple
 * git states.
 *
 *   import { describeEachScenario } from '@gfargo/git-scenarios/node-test'
 *   import assert from 'node:assert/strict'
 *
 *   describeEachScenario(
 *     ['feature-pr-ready', 'two-commit-feature', 'multi-commit-branch'],
 *     (getRepo, scenarioName) => {
 *       it(`has a clean worktree in ${scenarioName}`, async () => {
 *         const repo = getRepo()
 *         const status = await repo.git.status()
 *         assert.ok(status.isClean())
 *       })
 *     },
 *   )
 */
export function describeEachScenario(
  scenarioNames: string[],
  fn: (getRepo: () => TempGitRepo, scenarioName: string) => void,
  options: DescribeWithScenarioOptions = {},
): void {
  for (const name of scenarioNames) {
    describeWithScenario(name, (getRepo) => fn(getRepo, name), options)
  }
}

/**
 * Re-export `it` from `node:test` for convenience so consumers can
 * import everything from one place:
 *
 *   import { describeWithScenario, it } from '@gfargo/git-scenarios/node-test'
 */
export { it }
