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
 *
 * Internal storage uses a Map keyed by name for O(1) lookup. The
 * insertion order is preserved (Map iteration order matches insertion),
 * so `listRegistered()` returns scenarios in the order they were
 * added — built-ins first (in the order defined in scenarios/index.ts),
 * then any custom ones in registration order.
 */

import type { Scenario } from './scenarios/types'
import { allScenarios } from './scenarios'

/**
 * Internal mutable registry. Map for O(1) lookup by name; insertion
 * order is preserved for `listRegistered()`.
 */
const registry = new Map<string, Scenario>(
  allScenarios.map((s) => [s.name, s] as const),
)

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
  if (registry.has(scenario.name)) {
    throw new Error(
      `registerScenario: a scenario named "${scenario.name}" is already registered. ` +
      `Use a different name or call unregisterScenario("${scenario.name}") first.`,
    )
  }
  registry.set(scenario.name, scenario)
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
  return registry.delete(name)
}

/**
 * List all registered scenarios (built-in + custom). Returns a
 * read-only view of the registry in insertion order.
 */
export function listRegistered(): readonly Scenario[] {
  return Array.from(registry.values())
}

/**
 * Find a registered scenario by name. Searches both built-in and
 * custom scenarios. O(1) lookup.
 */
export function findRegistered(name: string): Scenario | undefined {
  return registry.get(name)
}

/**
 * Filter registered scenarios (built-in + custom) by tag. Returns
 * scenarios whose `tags` field includes one or more of the requested
 * tags.
 *
 * @param tags - One or more tags to match against
 * @param match - 'any' (default) returns scenarios matching ANY tag;
 *   'all' returns only scenarios matching ALL tags.
 */
export function findRegisteredByTag(
  tags: string[],
  match: 'any' | 'all' = 'any',
): readonly Scenario[] {
  const result: Scenario[] = []
  for (const s of registry.values()) {
    if (!s.tags || s.tags.length === 0) continue
    const ok = match === 'all'
      ? tags.every((t) => s.tags!.includes(t))
      : tags.some((t) => s.tags!.includes(t))
    if (ok) result.push(s)
  }
  return result
}

/**
 * Reset the registry to only the built-in scenarios. Useful in test
 * teardown to avoid leaking custom registrations between tests.
 */
export function resetRegistry(): void {
  registry.clear()
  for (const s of allScenarios) {
    registry.set(s.name, s)
  }
}
