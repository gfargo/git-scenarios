/**
 * Internal helper: look up a scenario by name in the mutable registry,
 * throwing a friendly error (with the list of available names) if it's
 * not found. Used by every public entry point that takes a scenario
 * name string — keeps the error message consistent across
 * `spinUpScenario`, `fromScenario`, the Jest adapter, and any future
 * framework adapters.
 */

import type { Scenario } from './scenarios/types'
import { findRegistered, listRegistered } from './registry'

/**
 * Resolve a scenario name to a registered `Scenario`, or throw with
 * the list of available names so the caller can spot a typo.
 *
 * The caller can pass an `origin` label to attribute the error to a
 * specific entry point (e.g. `'describeWithScenario'`,
 * `'spinUpScenario'`) — useful when the same lookup happens through
 * multiple wrappers.
 */
export function resolveScenario(name: string, origin?: string): Scenario {
  const scenario = findRegistered(name)
  if (!scenario) {
    const available = listRegistered().map((s) => s.name).join(', ')
    const prefix = origin ? `${origin}: ` : ''
    throw new Error(
      `${prefix}Unknown scenario "${name}". Available: ${available}`,
    )
  }
  return scenario
}
