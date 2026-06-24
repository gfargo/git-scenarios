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
 *
 * Safety gate: scenarios that use linked worktrees (external gitdir
 * pointers) or submodules cannot be faithfully reproduced by a plain
 * directory copy — they are silently declined and served via cold replay.
 */

import { cp, mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'

import { getCommitClockCount, resetCommitClock, setCommitClockCount } from './commitClock'
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

/** Filename inside `.git/` that stores the commit-clock count for a template. */
const CLOCK_FILE = 'GIT_SCENARIOS_CLOCK'

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
 * result to `dest` as the permanent template.  Returns `true` on success
 * and `false` when the scenario cannot be safely cached (linked worktrees
 * or submodules).
 *
 * If a concurrent builder already wrote `dest` (rename throws), the
 * staging copy is discarded — both results are byte-identical.
 */
async function buildTemplate(scenario: Scenario, dest: string): Promise<boolean> {
  await mkdir(dirname(dest), { recursive: true })

  const repo = await createTempGitRepo()
  await scenario.setup(repo)
  const staging = repo.path

  // Decline scenarios that a directory copy cannot faithfully reproduce
  if (await isUncacheable(staging)) {
    await rm(staging, { recursive: true, force: true }).catch(() => undefined)
    return false
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
 * Returns the template path on success, or `null` when the scenario
 * cannot be safely cached (linked worktrees / submodules).
 */
async function ensureTemplate(scenario: Scenario): Promise<string | null> {
  const dest = templatePath(scenario.name)
  try {
    await stat(dest)
    return dest // cache hit
  } catch {
    // cache miss — build the template
  }
  const built = await buildTemplate(scenario, dest)
  return built ? dest : null
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
  const template = await ensureTemplate(scenario)

  // Scenario cannot be cached (linked worktrees / submodules) — cold replay
  if (template === null) {
    const repo = await createTempGitRepo(options)
    await scenario.setup(repo)
    return repo
  }

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
