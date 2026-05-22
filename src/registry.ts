/**
 * Programmatic scenario registry — allows consumers to register
 * custom scenarios alongside the built-in ones.
 *
 * The built-in scenarios from `./scenarios/index.ts` are loaded into
 * the registry automatically. Consumers can add their own via
 * `registerScenario()` or `registerScenarios()`, and they'll appear
 * in `listRegistered()`, `findRegistered()`, and the CLI's
 * `list`/`describe`/`create` commands.
 *
 * Usage:
 *
 *   import { registerScenario, defineScenario, chain, addCommit } from '@gfargo/git-scenarios'
 *
 *   registerScenario(defineScenario({
 *     name: 'my-custom-scenario',
 *     summary: 'A custom scenario for my tool',
 *     description: '...',
 *     kind: 'branch',
 *     setup: chain(addCommit({ message: 'init', files: { 'README.md': '# custom' } })),
 *   }))
 *
 *   // Now available via spinUpScenario('my-custom-scenario')
 *   // and in the CLI: git-scenarios create my-custom-scenario
 */

import type { Scenario } from './scenarios/types'
import { allScenarios } from './scenarios'

/**
 * Internal mutable registry. Starts with the built-in scenarios and
 * grows as consumers register custom ones.
 */
const registry: Scenario[] = [...allScenarios]

/**
 * Register a custom scenario. The scenario becomes available via
 * `findRegistered()`, `listRegistered()`, and `spinUpScenario()`.
 *
 * Throws if a scenario with the same name is already registered
 * (prevents silent shadowing of built-in scenarios).
 *
 * @param scenario - A validated scenario (use `defineScenario()` to create one)
 */
export function registerScenario(scenario: Scenario): void {
  const existing = registry.find((s) => s.name === scenario.name)
  if (existing) {
    throw new Error(
      `registerScenario: a scenario named "${scenario.name}" is already registered. ` +
      `Use a different name or call unregisterScenario("${scenario.name}") first.`
    )
  }
  registry.push(scenario)
}

/**
 * Register multiple scenarios at once. Convenience wrapper around
 * `registerScenario()` — throws on the first duplicate name.
 *
 * @param scenarios - Array of validated scenarios
 */
export function registerScenarios(scenarios: Scenario[]): void {
  for (const scenario of scenarios) {
    registerScenario(scenario)
  }
}

/**
 * Remove a previously registered scenario by name. Returns `true` if
 * the scenario was found and removed, `false` if it wasn't registered.
 *
 * Note: removing built-in scenarios is allowed (useful for replacing
 * them with custom versions).
 */
export function unregisterScenario(name: string): boolean {
  const index = registry.findIndex((s) => s.name === name)
  if (index === -1) return false
  registry.splice(index, 1)
  return true
}

/**
 * List all registered scenarios (built-in + custom). Returns a
 * read-only view of the registry.
 */
export function listRegistered(): readonly Scenario[] {
  return registry
}

/**
 * Find a registered scenario by name. Searches both built-in and
 * custom scenarios.
 */
export function findRegistered(name: string): Scenario | undefined {
  return registry.find((s) => s.name === name)
}

/**
 * Reset the registry to only the built-in scenarios. Useful in test
 * teardown to avoid leaking custom registrations between tests.
 */
export function resetRegistry(): void {
  registry.length = 0
  registry.push(...allScenarios)
}
