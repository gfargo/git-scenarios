/**
 * Content-addressed scenario cache.
 *
 * Materialises each scenario once into a template directory keyed by
 * `${scenarioName}@${LIBRARY_VERSION}`, then serves subsequent spin-ups
 * by copying that template (near-instant) rather than replaying every
 * git atom from scratch.
 *
 * Cache root: `$GIT_SCENARIOS_CACHE_DIR` env override, or
 *   `<os.tmpdir()>/git-scenarios-cache`.
 *
 * Concurrent builders are handled via an atomic `rename`: two processes
 * racing to build the same template both build into unique staging dirs;
 * whichever renames first wins and the loser discards its copy.
 */

import { cp, mkdir, mkdtemp, rename, rm, stat } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'

import type { Scenario } from './scenarios/types'
import {
  createTempGitRepo,
  wrapRepoAtPath,
  type CreateTempGitRepoOptions,
  type TempGitRepo,
} from './tempGitRepo'

// Must stay in sync with the `version` field in package.json.
// Bumping this string invalidates all existing cached templates.
const LIBRARY_VERSION = '1.1.0'

const CACHE_ROOT_NAME = 'git-scenarios-cache'

/** Returns the root directory that holds all cached scenario templates. */
export function cacheRoot(): string {
  return process.env['GIT_SCENARIOS_CACHE_DIR'] ?? join(tmpdir(), CACHE_ROOT_NAME)
}

/** Returns the path of the cached template for a given scenario name. */
function templatePath(scenarioName: string): string {
  // Sanitise: replace characters that may be unsafe on some filesystems
  const safeName = scenarioName.replace(/[^a-zA-Z0-9-]/g, '_')
  return join(cacheRoot(), `${safeName}@${LIBRARY_VERSION}`)
}

/**
 * Replay `scenario` into a fresh temp repo and atomically promote the
 * result to `dest` as the permanent template.  If a concurrent builder
 * already wrote `dest` (rename throws), the staging copy is discarded
 * — both results are byte-identical.
 */
async function buildTemplate(scenario: Scenario, dest: string): Promise<void> {
  await mkdir(dirname(dest), { recursive: true })

  const repo = await createTempGitRepo()
  await scenario.setup(repo)
  const staging = repo.path

  try {
    await rename(staging, dest)
  } catch {
    // Another concurrent builder won the rename race, or the rename
    // failed for another transient reason.  Either way, discard the
    // staging copy — if dest now exists the winner's template is valid;
    // if it doesn't, the next caller will retry.
    await rm(staging, { recursive: true, force: true }).catch(() => undefined)
  }
}

/** Ensure the template for `scenario` exists; returns its path. */
async function ensureTemplate(scenario: Scenario): Promise<string> {
  const dest = templatePath(scenario.name)
  try {
    await stat(dest)
    return dest // cache hit
  } catch {
    // cache miss — build the template
  }
  await buildTemplate(scenario, dest)
  return dest
}

/**
 * Materialise `scenario` via the cache.
 *
 * On the first call for a given `scenarioName@version`, the scenario is
 * replayed and the result is stored as a reusable template.  All
 * subsequent calls copy that template in O(dir size) time.
 *
 * The returned `TempGitRepo` is byte-identical to a cold replay — same
 * commit hashes, same file tree, same git config.
 *
 * @param scenario - The scenario to materialise
 * @param options  - Standard repo options (`autoCleanup`, etc.)
 */
export async function materializeCached(
  scenario: Scenario,
  options: CreateTempGitRepoOptions = {},
): Promise<TempGitRepo> {
  const template = await ensureTemplate(scenario)

  // mkdtemp creates an empty placeholder; remove it so fs.cp can write
  // the destination as a proper directory copy of the template.
  const dest = await mkdtemp(join(tmpdir(), 'git-scenarios-'))
  await rm(dest, { recursive: true, force: true })
  await cp(template, dest, { recursive: true })

  return wrapRepoAtPath(dest, options)
}

/** Remove all cached scenario templates (the entire cache root). */
export async function clearScenarioCache(): Promise<void> {
  await rm(cacheRoot(), { recursive: true, force: true })
}
