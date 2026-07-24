/**
 * `fromScenario` — spin up a named scenario and apply additional
 * atoms on top in a single call. Saves the common pattern of:
 *
 *   const repo = await spinUpScenario('feature-pr-ready')
 *   await chain(extraStep1, extraStep2)(repo)
 *
 * With `fromScenario`:
 *
 *   const repo = await fromScenario('feature-pr-ready',
 *     addCommit({ message: 'extra', files: { 'x.ts': 'x' } }),
 *     writeFiles({ 'dirty.ts': 'uncommitted' }),
 *   )
 *
 * Optionally accepts a leading options object to enable the cache or
 * set `autoCleanup`:
 *
 *   const repo = await fromScenario('large-repo',
 *     { cache: true },
 *     addCommit({ message: 'extra', files: { 'x.ts': 'x' } }),
 *   )
 *
 * The returned `TempGitRepo` is the same shape as `spinUpScenario` —
 * caller is responsible for `cleanup()` in test teardown.
 */

import type { Step } from './atoms/types'
import { chain } from './atoms/chain'
import { resolveScenario } from './resolveScenario'
import { createTempGitRepo, type CreateTempGitRepoOptions, type TempGitRepo } from './tempGitRepo'
import { materializeCached } from './scenarioCache'

export type FromScenarioOptions = CreateTempGitRepoOptions

/**
 * Spin up a named scenario, then apply zero or more additional steps
 * on top. Returns the fully-configured `TempGitRepo`.
 *
 * Accepts an optional leading options object (before any steps). When
 * omitted, the function behaves exactly as before — existing call-sites
 * that pass only steps are unaffected.
 *
 * Searches both built-in and custom-registered scenarios.
 *
 * @param name - Registered scenario name (kebab-case)
 * @param extraSteps - Additional atoms to apply after the scenario's setup
 * @throws if the scenario name is unknown
 *
 * @example
 * ```ts
 * const repo = await fromScenario('mid-merge-conflict',
 *   // Resolve the conflict and commit
 *   writeFiles({ 'src/widget.ts': 'resolved\n' }),
 *   stageFiles('src/widget.ts'),
 *   commit('fix: resolve conflict'),
 * )
 *
 * // With cache enabled:
 * const repo = await fromScenario('large-repo',
 *   { cache: true },
 *   addCommit({ message: 'extra', files: { 'extra.ts': '' } }),
 * )
 * ```
 */
export async function fromScenario(name: string, ...extraSteps: Step[]): Promise<TempGitRepo>
export async function fromScenario(
  name: string,
  options: FromScenarioOptions,
  ...extraSteps: Step[]
): Promise<TempGitRepo>
export async function fromScenario(
  name: string,
  optionsOrFirstStep?: FromScenarioOptions | Step,
  ...rest: Step[]
): Promise<TempGitRepo> {
  const scenario = resolveScenario(name, 'fromScenario')

  let options: FromScenarioOptions = {}
  let extraSteps: Step[]

  if (typeof optionsOrFirstStep === 'function') {
    extraSteps = [optionsOrFirstStep, ...rest]
  } else if (optionsOrFirstStep !== undefined) {
    options = optionsOrFirstStep
    extraSteps = rest
  } else {
    extraSteps = []
  }

  const { cache, ...repoOptions } = options

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

  if (extraSteps.length > 0) {
    try {
      await chain(...extraSteps)(repo)
    } catch (err) {
      await repo.cleanup()
      throw err
    }
  }

  return repo
}
