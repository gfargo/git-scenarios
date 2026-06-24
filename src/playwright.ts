/**
 * Playwright framework adapter for `@gfargo/git-scenarios`.
 *
 * Provides a `test.extend`-compatible fixture set for spinning up a named
 * scenario per test, with automatic cleanup via Playwright's fixture
 * teardown mechanism.
 *
 * **Setup** — in a shared fixtures file:
 *
 *   import { test as base } from '@playwright/test'
 *   import { createScenarioTest } from '@gfargo/git-scenarios/playwright'
 *
 *   export const test = createScenarioTest(base)
 *   export { expect } from '@playwright/test'
 *
 * **Usage** — in a test file:
 *
 *   import { test, expect } from './fixtures'
 *
 *   test.use({ scenarioName: 'feature-pr-ready' })
 *
 *   test('is on a feature branch', async ({ repo }) => {
 *     const status = await repo.git.status()
 *     expect(status.current).not.toBe('main')
 *   })
 *
 *   test('can extend with extra steps', async ({ repo }) => {
 *     // repo was spun up with scenarioName + scenarioOptions.extraSteps
 *     const status = await repo.git.status()
 *     expect(status.isClean()).toBe(true)
 *   })
 *
 * Set per-test scenario options:
 *
 *   test.use({
 *     scenarioName: 'mid-merge-conflict',
 *     scenarioOptions: { extraSteps: [writeFiles({ 'extra.ts': 'extra\n' })] },
 *   })
 *
 * **Dependency-free at install time.** This adapter does not hard-import
 * `@playwright/test`. Consumers must have it installed in their project.
 * The minimal ambient declarations below let the file type-check under
 * `strict` without `@playwright/test` in devDependencies (same pattern as
 * `vitest.ts`'s `declare const` globals).
 */

import type { TempGitRepo } from './tempGitRepo'
import type { Step } from './atoms/types'
import type { SpinUpScenarioOptions } from './spinUpScenario'
import { createTempGitRepo } from './tempGitRepo'
import { resolveScenario } from './resolveScenario'
import { chain } from './atoms/chain'

// ---------------------------------------------------------------------------
// Minimal ambient types — the subset of Playwright's fixture API we depend
// on. At runtime the consumer's Playwright install provides the real impl.
// ---------------------------------------------------------------------------

/** Playwright's `use()` callback — yield the fixture value to the test. */
type PlaywrightUse<T> = (value: T) => Promise<void>

/** Minimal interface for Playwright's `test` / `base` object. */
interface PlaywrightTestBase {
  extend(fixtures: object): PlaywrightTestBase
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Options accepted by the `scenarioOptions` fixture. Extends the standard
 * `SpinUpScenarioOptions` with `extraSteps` for layering atoms on top of
 * the base scenario.
 */
export type PlaywrightScenarioOptions = SpinUpScenarioOptions & {
  /**
   * Additional atoms to apply after the scenario's setup.
   * Useful for extending a base scenario with test-specific state.
   */
  extraSteps?: Step[]
}

/**
 * The fixture types added by `createScenarioTest` / `scenarioFixtures`.
 * Use as the generic parameter of your own `base.extend<PlaywrightScenarioFixtures>()`.
 */
export type PlaywrightScenarioFixtures = {
  scenarioName: string
  scenarioOptions: PlaywrightScenarioOptions
  repo: TempGitRepo
}

// ---------------------------------------------------------------------------
// Fixture definitions
// ---------------------------------------------------------------------------

/**
 * A Playwright fixture map ready to pass to `base.extend(scenarioFixtures)`.
 *
 * Fixtures included:
 * - `scenarioName` (option) — set via `test.use({ scenarioName: '...' })`; default `''`
 * - `scenarioOptions` (option) — `SpinUpScenarioOptions & { extraSteps? }`; default `{}`
 * - `repo` (test) — a fully-configured `TempGitRepo`; auto-cleaned on teardown
 *
 * @example
 * ```ts
 * import { test as base } from '@playwright/test'
 * import { scenarioFixtures } from '@gfargo/git-scenarios/playwright'
 *
 * export const test = base.extend(scenarioFixtures)
 * ```
 */
export const scenarioFixtures = {
  scenarioName: ['', { option: true }] as [string, { option: true }],
  scenarioOptions: [{}, { option: true }] as [PlaywrightScenarioOptions, { option: true }],

  repo: async (
    {
      scenarioName,
      scenarioOptions,
    }: { scenarioName: string; scenarioOptions: PlaywrightScenarioOptions },
    use: PlaywrightUse<TempGitRepo>,
  ): Promise<void> => {
    const { extraSteps, ...spinOptions } = scenarioOptions
    const scenario = resolveScenario(scenarioName, 'playwright/repo fixture')
    const repo = await createTempGitRepo(spinOptions)
    await scenario.setup(repo)

    if (extraSteps && extraSteps.length > 0) {
      await chain(...extraSteps)(repo)
    }

    await use(repo)
    await repo.cleanup()
  },
}

/**
 * Convenience helper — extends your Playwright `base` test with the
 * scenario fixtures so tests can receive a `repo` fixture directly.
 *
 * @param base - Your project's Playwright `test` object
 * @returns An extended test with `scenarioName`, `scenarioOptions`,
 *   and `repo` fixtures available
 *
 * @example
 * ```ts
 * // fixtures.ts
 * import { test as base } from '@playwright/test'
 * import { createScenarioTest } from '@gfargo/git-scenarios/playwright'
 *
 * export const test = createScenarioTest(base)
 * export { expect } from '@playwright/test'
 * ```
 */
export function createScenarioTest(base: PlaywrightTestBase): PlaywrightTestBase {
  return base.extend(scenarioFixtures)
}
