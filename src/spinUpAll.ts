/**
 * `spinUpAll` — materialize multiple scenarios concurrently with
 * bounded parallelism.
 *
 * Suites that exercise many scenarios (and the `www` graph-generation
 * script) currently go serial. `spinUpAll` cuts wall-clock time without
 * exhausting file handles by limiting concurrent materializations.
 *
 * @example
 * ```ts
 * import { spinUpAll } from '@gfargo/git-scenarios'
 *
 * // Spin up 3 scenarios with default concurrency (4):
 * const repos = await spinUpAll(['feature-pr-ready', 'mid-merge-conflict', 'stashed-changes'])
 *
 * // Custom concurrency:
 * const repos = await spinUpAll(['large-repo', 'rich-history-graph'], { concurrency: 2 })
 *
 * // Clean up when done:
 * await Promise.all(repos.map((r) => r.cleanup()))
 * ```
 *
 * Each entry in the returned array corresponds positionally to the
 * input names array. If a scenario fails to materialize, the error
 * propagates and all already-materialized repos are cleaned up.
 */

import { spinUpScenario, type SpinUpScenarioOptions } from './spinUpScenario'
import type { TempGitRepo } from './tempGitRepo'

/** Options for `spinUpAll`. */
export type SpinUpAllOptions = SpinUpScenarioOptions & {
  /**
   * Maximum number of scenarios materialized concurrently.
   * Higher values reduce wall-clock time but consume more file handles
   * and disk I/O. A safe default for CI runners is 4.
   *
   * @default 4
   */
  concurrency?: number
}

/**
 * Materialize multiple scenarios concurrently with bounded parallelism.
 *
 * @param names - Array of registered scenario names (kebab-case)
 * @param options - Optional config: concurrency limit + all spinUpScenario options
 * @returns Array of TempGitRepo handles, positionally matching `names`
 *
 * @throws if any scenario name is unknown or any materialization fails.
 *   On failure, all already-materialized repos are cleaned up before
 *   the error propagates.
 */
export async function spinUpAll(
  names: string[],
  options: SpinUpAllOptions = {},
): Promise<TempGitRepo[]> {
  const { concurrency = 4, ...scenarioOptions } = options

  if (names.length === 0) return []

  const limit = Math.max(1, concurrency)
  const results: TempGitRepo[] = new Array(names.length)
  const completed: TempGitRepo[] = []

  // Bounded-concurrency executor: process names as a work queue,
  // running at most `limit` workers concurrently.
  let nextIndex = 0
  let firstError: unknown = null

  async function worker(): Promise<void> {
    while (firstError === null) {
      const idx = nextIndex++
      if (idx >= names.length) break

      const repo = await spinUpScenario(names[idx], scenarioOptions)
      completed.push(repo)
      results[idx] = repo
    }
  }

  const workers = Array.from({ length: Math.min(limit, names.length) }, () =>
    worker().catch((err) => {
      if (firstError === null) firstError = err
    }),
  )

  await Promise.all(workers)

  if (firstError !== null) {
    // Clean up any repos that were successfully materialized
    await Promise.all(completed.map((r) => r.cleanup().catch(() => {})))
    throw firstError
  }

  return results
}
