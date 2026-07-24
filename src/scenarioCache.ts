/**
 * Content-addressed scenario cache.
 *
 * Materialises each scenario once into a template directory, then serves
 * subsequent spin-ups by copying that template (near-instant) rather than
 * replaying every git atom from scratch.
 *
 * Cache key depends on whether the scenario is built-in or custom
 * (determined by object-reference identity against `allScenarios`):
 *   - built-in  → `${scenarioName}@${LIBRARY_VERSION}` — safe, because a
 *     built-in's `setup` only changes when the package version bumps.
 *   - custom, with an explicit `scenario.version` → `${scenarioName}@custom-${version}`.
 *   - custom, without a `version` → not cached at all; always cold-replayed.
 *     A consumer's `setup` can change at any time without a package version
 *     bump, so caching it under a version-less key would risk silently
 *     serving a stale template. See `Scenario.version` in `scenarios/types.ts`.
 *
 * Cache root: `$GIT_SCENARIOS_CACHE_DIR` env override, or
 *   `<os.tmpdir()>/git-scenarios-cache`.
 *
 * Concurrent builders are handled via an atomic `rename`: two processes
 * racing to build the same template both build into unique staging dirs;
 * whichever renames first wins and the loser discards its copy.
 *
 * Safety gate: scenarios that use linked worktrees (external gitdir
 * pointers) or submodules cannot be faithfully reproduced by a plain
 * directory copy — they are silently declined and served via cold replay.
 */

import { readFileSync } from 'fs'
import { cp, mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'

import { getCommitClockCount, resetCommitClock, setCommitClockCount } from './commitClock'
import { allScenarios } from './scenarios'
import type { Scenario } from './scenarios/types'
import {
  createTempGitRepo,
  wrapRepoAtPath,
  type CreateTempGitRepoOptions,
  type TempGitRepo,
} from './tempGitRepo'

// __dirname: in CJS (jest, CJS build output) it is native; in ESM build output
// tsup shims it via fileURLToPath(import.meta.url).  No hand-sync needed.
const { version: LIBRARY_VERSION } = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
) as { version: string }

const CACHE_ROOT_NAME = 'git-scenarios-cache'

/** Filename inside `.git/` that stores the commit-clock count for a template. */
const CLOCK_FILE = 'GIT_SCENARIOS_CLOCK'

/**
 * Identity set of the built-in scenarios, used to decide cacheability.
 * Reference identity (not name) so a consumer who unregisters a built-in
 * and re-registers a different scenario under the same name is correctly
 * treated as custom.
 */
const BUILTIN_SCENARIOS = new Set<Scenario>(allScenarios)

/** Returns the root directory that holds all cached scenario templates. */
export function cacheRoot(): string {
  return process.env['GIT_SCENARIOS_CACHE_DIR'] ?? join(tmpdir(), CACHE_ROOT_NAME)
}

/** Replace characters that may be unsafe as a filesystem path segment. */
function sanitize(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9-]/g, '_')
}

/**
 * Compute the on-disk cache key for a scenario, or `null` when the
 * scenario must not be cached.
 *
 * - Built-in scenarios (by object-reference identity) key on the
 *   installed package version — their `setup` only changes on a version
 *   bump, so this can never go stale.
 * - Custom scenarios with an explicit `version` key on that value —
 *   bumping it produces a fresh cache entry.
 * - Custom scenarios without a `version` are not cacheable: their
 *   `setup` can change at any time without a package version bump, so
 *   there is no safe key. These are always cold-replayed.
 */
function cacheKeyFor(scenario: Scenario): string | null {
  const safeName = sanitize(scenario.name)
  if (BUILTIN_SCENARIOS.has(scenario)) {
    return `${safeName}@${LIBRARY_VERSION}`
  }
  if (scenario.version) {
    return `${safeName}@custom-${sanitize(scenario.version)}`
  }
  return null
}

/** Returns the path of the cached template for a given scenario, or `null` if uncacheable. */
function templatePath(scenario: Scenario): string | null {
  const key = cacheKeyFor(scenario)
  return key === null ? null : join(cacheRoot(), key)
}

/**
 * Return true when a staging repo cannot be faithfully reproduced by a
 * plain directory copy:
 *   - linked worktrees register absolute gitdir back-pointers that break
 *     when the tree is copied to a new path
 *   - submodules embed absolute paths in .git/modules/ and .gitmodules
 */
async function isUncacheable(stagingPath: string): Promise<boolean> {
  // Linked worktrees: .git/worktrees/<name>/ entries contain absolute paths
  try {
    const entries = await readdir(join(stagingPath, '.git', 'worktrees'))
    if (entries.length > 0) return true
  } catch {
    // No worktrees directory — fine
  }

  // Submodules: .gitmodules presence is sufficient signal
  try {
    await stat(join(stagingPath, '.gitmodules'))
    return true
  } catch {
    // No .gitmodules — fine
  }

  return false
}

/**
 * Replay `scenario` into a fresh temp repo and atomically promote the
 * result to `dest` as the permanent template.
 *
 * Returns `true` when the template was stored (cacheable), or the
 * already-built `TempGitRepo` when the scenario cannot be safely cached
 * (linked worktrees or submodules) — so the caller can reuse it directly
 * rather than replaying the scenario a second time.
 *
 * If a concurrent builder already wrote `dest` (rename throws), the
 * staging copy is discarded — both results are byte-identical.
 */
async function buildTemplate(
  scenario: Scenario,
  dest: string,
  options: CreateTempGitRepoOptions,
): Promise<true | TempGitRepo> {
  await mkdir(dirname(dest), { recursive: true })

  const repo = await createTempGitRepo()
  try {
    await scenario.setup(repo)
  } catch (err) {
    await repo.cleanup()
    throw err
  }
  const staging = repo.path

  // Decline scenarios that a directory copy cannot faithfully reproduce.
  // Return the already-built repo so the caller can use it directly
  // without a second cold replay.
  if (await isUncacheable(staging)) {
    return wrapRepoAtPath(staging, options)
  }

  // Persist the commit-clock counter so copies start the clock at the
  // right position (matching where a cold replay would be post-setup).
  const clockCount = getCommitClockCount(staging)
  await writeFile(join(staging, '.git', CLOCK_FILE), String(clockCount), 'utf8')

  // Clean up the in-process clock entry — the staging path no longer exists
  // after the rename below, so leaking the counter serves no purpose.
  resetCommitClock(staging)

  try {
    await rename(staging, dest)
  } catch {
    // Another concurrent builder won the rename race, or the rename
    // failed for another transient reason.  Either way, discard the
    // staging copy — if dest now exists the winner's template is valid;
    // if it doesn't, the next caller will retry.
    await rm(staging, { recursive: true, force: true }).catch(() => undefined)
  }

  return true
}

/**
 * Ensure the template for `scenario` exists.
 *
 * Returns the template path on success, or the already-built `TempGitRepo`
 * when the scenario cannot be safely cached — either because a plain
 * directory copy can't reproduce it faithfully (linked worktrees /
 * submodules), or because it's a custom scenario with no `version` (no
 * safe cache key — see `cacheKeyFor`).
 */
async function ensureTemplate(
  scenario: Scenario,
  options: CreateTempGitRepoOptions,
): Promise<string | TempGitRepo> {
  const dest = templatePath(scenario)
  if (dest === null) {
    // Not cacheable by key — cold-replay directly, skipping the on-disk
    // cache entirely so no stale template can ever be served.
    const repo = await createTempGitRepo(options)
    try {
      await scenario.setup(repo)
    } catch (err) {
      await repo.cleanup()
      throw err
    }
    return repo
  }
  try {
    await stat(dest)
    return dest // cache hit
  } catch {
    // cache miss — build the template
  }
  const result = await buildTemplate(scenario, dest, options)
  return result === true ? dest : result
}

/** Read the saved commit-clock count from a template directory. */
async function readClockCount(template: string): Promise<number> {
  try {
    const raw = await readFile(join(template, '.git', CLOCK_FILE), 'utf8')
    const n = parseInt(raw.trim(), 10)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

/**
 * Materialise `scenario` via the cache.
 *
 * On the first call for a given `scenarioName@version`, the scenario is
 * replayed and the result is stored as a reusable template.  All
 * subsequent calls copy that template in O(dir size) time.
 *
 * The returned `TempGitRepo` is byte-identical to a cold replay — same
 * commit hashes, same file tree, same git config — and the commit clock
 * is advanced to match the position it would be at after a cold replay,
 * so any extra steps applied afterward produce the same hashes too.
 *
 * Scenarios that use linked worktrees or submodules cannot be reproduced
 * by a plain directory copy; for those, this function transparently falls
 * back to a cold replay so the caller always gets a valid repo.
 *
 * @param scenario - The scenario to materialise
 * @param options  - Standard repo options (`autoCleanup`, etc.)
 */
export async function materializeCached(
  scenario: Scenario,
  options: CreateTempGitRepoOptions = {},
): Promise<TempGitRepo> {
  const templateOrRepo = await ensureTemplate(scenario, options)

  // Scenario cannot be cached (linked worktrees / submodules) — reuse the
  // already-built repo returned by ensureTemplate instead of rebuilding.
  if (typeof templateOrRepo !== 'string') {
    return templateOrRepo
  }

  const template = templateOrRepo
  const clockCount = await readClockCount(template)

  // mkdtemp creates an empty placeholder; remove it so fs.cp can write
  // the destination as a proper directory copy of the template.
  const dest = await mkdtemp(join(tmpdir(), 'git-scenarios-'))
  await rm(dest, { recursive: true, force: true })
  await cp(template, dest, { recursive: true })

  // Restore the commit clock so extra steps applied after materialisation
  // produce the same dates (and hashes) as a cold replay would.
  setCommitClockCount(dest, clockCount)

  return wrapRepoAtPath(dest, options)
}

/** Remove all cached scenario templates (the entire cache root). */
export async function clearScenarioCache(): Promise<void> {
  await rm(cacheRoot(), { recursive: true, force: true })
}
