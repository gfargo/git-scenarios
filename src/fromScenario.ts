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
 * The returned `TempGitRepo` is the same shape as `spinUpScenario` —
 * caller is responsible for `cleanup()` in test teardown.
 */

import type { Step } from './atoms/types'
import { chain } from './atoms/chain'
import { findScenario, allScenarios } from './scenarios'
import { createTempGitRepo, type TempGitRepo } from './tempGitRepo'

/**
 * Spin up a named scenario, then apply zero or more additional steps
 * on top. Returns the fully-configured `TempGitRepo`.
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
 * ```
 */
export async function fromScenario(
  name: string,
  ...extraSteps: Step[]
): Promise<TempGitRepo> {
  const scenario = findScenario(name)
  if (!scenario) {
    const available = allScenarios.map((s) => s.name).join(', ')
    throw new Error(
      `Unknown scenario "${name}". Available: ${available}`
    )
  }

  const repo = await createTempGitRepo()
  await scenario.setup(repo)

  if (extraSteps.length > 0) {
    await chain(...extraSteps)(repo)
  }

  return repo
}
