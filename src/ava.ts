/**
 * AVA framework adapter for `@gfargo/git-scenarios`.
 *
 * AVA's test model is flat (no `describe` nesting), so this adapter
 * uses a different shape from the Jest/Vitest/Mocha adapters. Instead
 * of `describeWithScenario`, it exports `withScenario` which returns
 * a handle with `setup`, `cleanup`, and `getRepo` — designed to plug
 * into AVA's `test.before()` and `test.after.always()` hooks.
 *
 * Usage:
 *
 *   import test from 'ava'
 *   import { withScenario } from '@gfargo/git-scenarios/ava'
 *
 *   const scenario = withScenario('feature-pr-ready')
 *
 *   test.before(scenario.setup)
 *   test.after.always(scenario.cleanup)
 *
 *   test('is on a feature branch', async (t) => {
 *     const repo = scenario.getRepo()
 *     const status = await repo.git.status()
 *     t.not(status.current, 'main')
 *   })
 *
 * For scenarios that need extra atoms on top:
 *
 *   import { withScenario } from '@gfargo/git-scenarios/ava'
 *   import { writeFiles } from '@gfargo/git-scenarios/atoms'
 *
 *   const scenario = withScenario('mid-merge-conflict', {
 *     extraSteps: [writeFiles({ 'extra.ts': 'extra\n' })],
 *   })
 *
 * **Why a different shape?** AVA doesn't have `describe` blocks.
 * Tests are flat and run concurrently by default. The `withScenario`
 * pattern gives AVA users a familiar before/after hook workflow
 * without forcing a describe-like wrapper that doesn't exist in AVA.
 *
 * **Concurrency note:** AVA runs tests concurrently by default. Since
 * all tests in a `withScenario` group share a single repo instance,
 * use `test.serial` if your tests mutate the repo state. If tests
 * are read-only (status checks, log queries), concurrent is fine.
 */

import type { TempGitRepo } from './tempGitRepo'
import type { Step } from './atoms/types'
import { createTempGitRepo } from './tempGitRepo'
import { resolveScenario } from './resolveScenario'
import { chain } from './atoms/chain'

export type WithScenarioOptions = {
  /**
   * Additional atoms to apply after the scenario's setup.
   * Useful for extending a base scenario with test-specific state.
   */
  extraSteps?: Step[]
}

/**
 * The handle returned by `withScenario`. Plug `setup` into
 * `test.before()` and `cleanup` into `test.after.always()`.
 * Call `getRepo()` inside test bodies.
 */
export type ScenarioHandle = {
  /**
   * Async setup function — pass to `test.before(scenario.setup)`.
   * Spins up the scenario and applies any extra steps.
   */
  setup: () => Promise<void>
  /**
   * Async cleanup function — pass to `test.after.always(scenario.cleanup)`.
   * Removes the temp directory.
   */
  cleanup: () => Promise<void>
  /**
   * Returns the live `TempGitRepo` instance. Call inside test bodies
   * after `setup` has run.
   *
   * @throws if called before `setup` completes.
   */
  getRepo: () => TempGitRepo
}

/**
 * Create a scenario handle for use with AVA's before/after hooks.
 *
 * @param scenarioName - The registered scenario name (kebab-case)
 * @param options - Optional configuration (extra steps)
 * @returns A handle with `setup`, `cleanup`, and `getRepo`
 *
 * @example
 * ```ts
 * import test from 'ava'
 * import { withScenario } from '@gfargo/git-scenarios/ava'
 *
 * const scenario = withScenario('feature-pr-ready')
 *
 * test.before(scenario.setup)
 * test.after.always(scenario.cleanup)
 *
 * test('is on a feature branch', async (t) => {
 *   const repo = scenario.getRepo()
 *   const status = await repo.git.status()
 *   t.not(status.current, 'main')
 * })
 * ```
 */
export function withScenario(
  scenarioName: string,
  options: WithScenarioOptions = {},
): ScenarioHandle {
  const { extraSteps } = options
  let repo: TempGitRepo | undefined

  return {
    setup: async () => {
      const scenario = resolveScenario(scenarioName, 'withScenario')
      repo = await createTempGitRepo()
      await scenario.setup(repo)

      if (extraSteps && extraSteps.length > 0) {
        await chain(...extraSteps)(repo)
      }
    },

    cleanup: async () => {
      await repo?.cleanup()
      repo = undefined
    },

    getRepo: () => {
      if (!repo) {
        throw new Error(
          `withScenario('${scenarioName}'): getRepo() called before setup() completed. ` +
          `Make sure test.before(scenario.setup) runs before your tests.`,
        )
      }
      return repo
    },
  }
}

/**
 * Convenience: create multiple scenario handles at once for
 * parameterized test files.
 *
 * @example
 * ```ts
 * import test from 'ava'
 * import { withScenarios } from '@gfargo/git-scenarios/ava'
 *
 * const scenarios = withScenarios([
 *   'feature-pr-ready',
 *   'two-commit-feature',
 *   'multi-commit-branch',
 * ])
 *
 * for (const [name, scenario] of Object.entries(scenarios)) {
 *   test.before(scenario.setup)
 *   test.after.always(scenario.cleanup)
 *
 *   test(`${name}: has a clean worktree`, async (t) => {
 *     const repo = scenario.getRepo()
 *     const status = await repo.git.status()
 *     t.true(status.isClean())
 *   })
 * }
 * ```
 */
export function withScenarios(
  scenarioNames: string[],
  options: WithScenarioOptions = {},
): Record<string, ScenarioHandle> {
  const handles: Record<string, ScenarioHandle> = {}
  for (const name of scenarioNames) {
    handles[name] = withScenario(name, options)
  }
  return handles
}
