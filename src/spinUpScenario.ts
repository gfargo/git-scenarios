/**
 * Programmatic API for the scenario library — the one-line replacement
 * for hand-writing inline `tempGitRepo` setup in integration tests.
 *
 * Before:
 *   const repo = await createTempGitRepo()
 *   await repo.writeFile('.gitkeep', '\n')
 *   await repo.commitAll('chore: initial commit')
 *   await repo.writeFile('README.md', '# Temp repo\n')
 *   // ... 12 more lines ...
 *
 * After:
 *   const repo = await spinUpScenario('feature-pr-ready')
 *
 * The returned object is the same `TempGitRepo` shape (`path`, `git`,
 * `writeFile`, `commitAll`, `cleanup`) so tests can still poke the
 * worktree afterward for the specific edge they care about.
 *
 * EXTRACTION DISCIPLINE: this is the public programmatic API. When the
 * scenario library extracts to a standalone package, this is the entry
 * point consumers will import.
 */

import { materializeCached } from './scenarioCache'
import { createTempGitRepo, type CreateTempGitRepoOptions, type TempGitRepo } from './tempGitRepo'
import { resolveScenario } from './resolveScenario'

/**
 * Optional configuration for `spinUpScenario`. All fields are
 * optional — the no-args form (`spinUpScenario(name)`) preserves
 * existing behavior.
 */
export type SpinUpScenarioOptions = CreateTempGitRepoOptions & {
  /**
   * Add an `origin` remote pointing at this URL after the scenario
   * setup runs. Useful for testing tools that detect or interact
   * with a remote without baking the URL into the scenario itself.
   *
   * Mirrors the CLI's `--remote <url>` flag.
   */
  remote?: string
}

/**
 * Spin up a temp git repo and run the named scenario's setup against
 * it. The repo is the standard `TempGitRepo` shape — caller is
 * responsible for `cleanup()` in test teardown.
 *
 * Searches both built-in and custom-registered scenarios.
 *
 * @param name - Registered scenario name (kebab-case)
 * @param options - Optional config (autoCleanup, cache, remote)
 *
 * @throws if the scenario name is unknown — error message lists the
 *   available names so the typo is easy to spot.
 *
 * @example
 * ```ts
 * // Standard usage:
 * const repo = await spinUpScenario('feature-pr-ready')
 *
 * // Cache subsequent spin-ups of the same scenario:
 * const repo = await spinUpScenario('large-repo', { cache: true })
 *
 * // Auto-cleanup safety net for crashy tests:
 * const repo = await spinUpScenario('feature-pr-ready', { autoCleanup: true })
 *
 * // Add a remote so gh-aware tools detect one:
 * const repo = await spinUpScenario('feature-pr-ready', {
 *   remote: 'git@github.com:org/repo.git',
 * })
 * ```
 */
export async function spinUpScenario(
  name: string,
  options: SpinUpScenarioOptions = {},
): Promise<TempGitRepo> {
  const scenario = resolveScenario(name, 'spinUpScenario')
  const { remote, cache, ...repoOptions } = options

  let repo: TempGitRepo
  if (cache) {
    repo = await materializeCached(scenario, repoOptions)
  } else {
    repo = await createTempGitRepo(repoOptions)
    try {
      await scenario.setup(repo)
    } catch (err) {
      await repo.cleanup()
      throw err
    }
  }

  if (remote) {
    try {
      await repo.git.addRemote('origin', remote)
    } catch (err) {
      await repo.cleanup()
      throw err
    }
  }

  return repo
}
