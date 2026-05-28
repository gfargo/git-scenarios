/**
 * Mocha framework adapter for `@gfargo/git-scenarios`.
 *
 * Mocha injects `describe`, `before`, `after`, and `it` as globals
 * when running tests. This adapter wraps them the same way the Jest
 * and Vitest adapters wrap their respective frameworks.
 *
 * Usage:
 *
 *   import { describeWithScenario } from '@gfargo/git-scenarios/mocha'
 *
 *   describeWithScenario('feature-pr-ready', (getRepo) => {
 *     it('is on a feature branch', async () => {
 *       const repo = getRepo()
 *       const status = await repo.git.status()
 *       expect(status.current).to.not.equal('main')
 *     })
 *   })
 *
 * Run with:
 *   npx mocha --require ts-node/register 'src/**\/*.test.ts'
 *
 * The scenario is spun up once in `before()` and cleaned up in
 * `after()`. The `getRepo()` accessor returns the live `TempGitRepo`
 * instance — call it inside `it()` blocks.
 *
 * **Why a separate adapter?** Mocha's globals (`describe`, `before`,
 * `after`, `it`) are runtime-injected by the Mocha CLI, not imported
 * from a module. The adapter declares them as ambient so TypeScript
 * checks pass without requiring Mocha as a compile-time dependency.
 * At runtime the test framework provides them.
 */

import type { TempGitRepo } from './tempGitRepo'
import type { Step } from './atoms/types'
import { createTempGitRepo } from './tempGitRepo'
import { resolveScenario } from './resolveScenario'
import { chain } from './atoms/chain'

// Mocha's globals are runtime-injected by the Mocha CLI. Declare
// them ambient so TypeScript doesn't error on usage.
declare const describe: (label: string, fn: (this: { timeout(ms: number): void }) => void) => void
declare const before: (fn: () => void | Promise<void>) => void
declare const after: (fn: () => void | Promise<void>) => void

export type DescribeWithScenarioOptions = {
  /**
   * Timeout for the suite in milliseconds (default: 30_000ms).
   * Mocha's default is 2000ms which is too short for git operations.
   * This value is passed to `this.timeout(ms)` inside the describe
   * block.
   */
  timeout?: number
  /**
   * Additional atoms to apply after the scenario's setup.
   * Useful for extending a base scenario with test-specific state.
   */
  extraSteps?: Step[]
}

/**
 * A Mocha `describe` wrapper that spins up a named scenario in
 * `before()` and cleans it up in `after()`.
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

  describe(`scenario: ${scenarioName}`, function () {
    // Mocha uses `this.timeout()` inside the describe callback
    // (must be a regular function, not arrow, to access `this`).
    this.timeout(timeout)

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
 *
 *   import { describeEachScenario } from '@gfargo/git-scenarios/mocha'
 *
 *   describeEachScenario(
 *     ['feature-pr-ready', 'two-commit-feature'],
 *     (getRepo, scenarioName) => {
 *       it(`has a clean worktree in ${scenarioName}`, async () => {
 *         const repo = getRepo()
 *         const status = await repo.git.status()
 *         expect(status.isClean()).to.be.true
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
