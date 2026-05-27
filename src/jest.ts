/**
 * Jest framework adapter for `@gfargo/git-scenarios`.
 *
 * Provides `describeWithScenario` — a wrapper around Jest's `describe`
 * that handles scenario setup and teardown automatically.
 *
 * Usage:
 *
 *   import { describeWithScenario } from '@gfargo/git-scenarios/jest'
 *
 *   describeWithScenario('feature-pr-ready', (getRepo) => {
 *     it('is on a feature branch', async () => {
 *       const repo = getRepo()
 *       const status = await repo.git.status()
 *       expect(status.current).not.toBe('main')
 *     })
 *   })
 *
 * The scenario is spun up once in `beforeAll` and cleaned up in
 * `afterAll`. The `getRepo()` accessor returns the live `TempGitRepo`
 * instance — call it inside `it()` blocks, not at the top level of
 * the describe callback.
 *
 * For scenarios that need extra setup on top of the base scenario:
 *
 *   describeWithScenario('mid-merge-conflict', (getRepo) => {
 *     it('has conflicts', async () => {
 *       const repo = getRepo()
 *       const status = await repo.git.status()
 *       expect(status.conflicted.length).toBeGreaterThan(0)
 *     })
 *   }, {
 *     timeout: 60_000,
 *     extraSteps: [writeFiles({ 'extra.ts': 'extra\n' })],
 *   })
 */

import type { TempGitRepo } from './tempGitRepo'
import type { Step } from './atoms/types'
import { createTempGitRepo } from './tempGitRepo'
import { resolveScenario } from './resolveScenario'
import { chain } from './atoms/chain'

export type DescribeWithScenarioOptions = {
  /**
   * Timeout for the beforeAll setup (default: 30_000ms).
   * Increase for scenarios with submodules or large histories.
   */
  timeout?: number
  /**
   * Additional atoms to apply after the scenario's setup.
   * Useful for extending a base scenario with test-specific state.
   */
  extraSteps?: Step[]
}

/**
 * A Jest `describe` wrapper that spins up a named scenario in
 * `beforeAll` and cleans it up in `afterAll`.
 *
 * @param scenarioName - The registered scenario name (kebab-case)
 * @param fn - The describe callback. Receives a `getRepo()` accessor
 *   that returns the `TempGitRepo` instance.
 * @param options - Optional configuration (timeout, extra steps)
 */
export function describeWithScenario(
  scenarioName: string,
  fn: (getRepo: () => TempGitRepo) => void,
  options: DescribeWithScenarioOptions = {},
): void {
  const { timeout = 30_000, extraSteps } = options

  describe(`scenario: ${scenarioName}`, () => {
    let repo: TempGitRepo

    beforeAll(async () => {
      const scenario = resolveScenario(scenarioName, 'describeWithScenario')

      repo = await createTempGitRepo()
      await scenario.setup(repo)

      if (extraSteps && extraSteps.length > 0) {
        await chain(...extraSteps)(repo)
      }
    }, timeout)

    afterAll(async () => {
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
 *   describeEachScenario(
 *     ['feature-pr-ready', 'two-commit-feature', 'multi-commit-branch'],
 *     (getRepo, scenarioName) => {
 *       it(`has a clean worktree in ${scenarioName}`, async () => {
 *         const repo = getRepo()
 *         const status = await repo.git.status()
 *         expect(status.isClean()).toBe(true)
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
