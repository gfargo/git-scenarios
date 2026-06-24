/**
 * Vitest framework adapter for `@gfargo/git-scenarios`.
 *
 * Mirror of `./jest.ts` but for Vitest consumers. The shape and
 * behavior is identical — the only difference is which test
 * framework's `describe` / `beforeAll` / `afterAll` globals are
 * referenced.
 *
 *   import { describeWithScenario } from '@gfargo/git-scenarios/vitest'
 *
 *   describeWithScenario('feature-pr-ready', (getRepo) => {
 *     it('is on a feature branch', async () => {
 *       const repo = getRepo()
 *       const status = await repo.git.status()
 *       expect(status.current).not.toBe('main')
 *     })
 *   })
 *
 * **Why a separate adapter?** Vitest's `describe` / `beforeAll` /
 * `afterAll` globals are runtime-resolved through `vitest`'s
 * registered globals, while Jest's are runtime-resolved through
 * `@jest/globals`. The two ecosystems don't interop — Vitest tests
 * importing the Jest adapter would resolve `describe` against the
 * wrong registry. Hence two thin adapter files.
 *
 * Vitest is a `peerDependency` of this subpath. Consumers using
 * `@gfargo/git-scenarios/vitest` need `vitest` installed in their
 * project.
 */

import type { TempGitRepo } from './tempGitRepo'
import type { Step } from './atoms/types'
import { createTempGitRepo } from './tempGitRepo'
import { resolveScenario } from './resolveScenario'
import { chain } from './atoms/chain'

// Vitest's globals are runtime-injected when the test file is run
// through the `vitest` CLI. Importing them as types ONLY (no runtime
// dependency) keeps this adapter dependency-free at install time —
// consumers don't pay the cost unless they actually use the adapter.
//
// We declare the Vitest globals here as an ambient module so
// TypeScript checks against the right shape without forcing a Vitest
// import in our own build. At runtime the test framework provides
// them.
declare const describe: (label: string, fn: () => void) => void
declare const beforeAll: (fn: () => void | Promise<void>, timeout?: number) => void
declare const afterAll: (fn: () => void | Promise<void>) => void

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

// The Vitest fixture "use" callback: receives the value and resolves
// when the test (and any nested fixtures) finish.
type UseFn<T> = (value: T) => Promise<void>

export type RepoFixtureOptions = {
  /**
   * Additional atoms to apply after the scenario's setup.
   * Useful for extending a base scenario with test-specific state.
   */
  extraSteps?: Step[]
  /**
   * If provided, registers this URL as the `origin` remote after
   * setup — mirrors the `remote` option of `spinUpScenario`.
   */
  remote?: string
}

/**
 * Factory that returns a Vitest `test.extend`-compatible fixture map.
 * Spread the result into `base.extend(...)` — the consumer owns the
 * `test` import so this file stays dependency-free at install time.
 *
 * Each test gets a **fresh** repo; cleanup runs automatically after
 * every test (not `afterAll`).
 *
 * @example
 * ```ts
 * import { test as base } from 'vitest'
 * import { repoFixture } from '@gfargo/git-scenarios/vitest'
 *
 * const test = base.extend(repoFixture('feature-pr-ready'))
 *
 * test('on feature branch', async ({ repo }) => {
 *   const status = await repo.git.status()
 *   expect(status.current).toBe('feat/widget-v2')
 * })
 * ```
 *
 * With extra steps and a fake remote:
 * ```ts
 * const test = base.extend(repoFixture('feature-pr-ready', {
 *   extraSteps: [writeFiles({ 'NOTES.md': 'notes\n' })],
 *   remote: 'git@github.com:org/repo.git',
 * }))
 * ```
 */
export function repoFixture(
  scenarioName: string,
  options: RepoFixtureOptions = {},
): { repo: (args: object, use: UseFn<TempGitRepo>) => Promise<void> } {
  const { extraSteps, remote } = options
  return {
    repo: async (_fixtures: object, use: UseFn<TempGitRepo>): Promise<void> => {
      const scenario = resolveScenario(scenarioName, 'repoFixture')
      const repo = await createTempGitRepo()
      await scenario.setup(repo)
      if (extraSteps?.length) await chain(...extraSteps)(repo)
      if (remote) await repo.git.addRemote('origin', remote)
      try {
        await use(repo)
      } finally {
        await repo.cleanup()
      }
    },
  }
}

/**
 * A Vitest `describe` wrapper that spins up a named scenario in
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
