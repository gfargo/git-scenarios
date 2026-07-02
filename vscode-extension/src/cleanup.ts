import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as vscode from 'vscode'
import { clearScenarioCache } from '@gfargo/git-scenarios'

export const CURRENT_PREFIX = 'git-scenarios-'
export const LEGACY_PREFIX = 'coco-git-test-'
export const CACHE_DIR_NAME = 'git-scenarios-cache'

/** Extract a useful message from an unknown thrown value. */
function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

// Pure predicate — safe to test without mocking the filesystem
export function isScenarioDir(name: string): boolean {
  return (
    (name.startsWith(CURRENT_PREFIX) || name.startsWith(LEGACY_PREFIX)) &&
    name !== CACHE_DIR_NAME
  )
}

/**
 * Returns true when `dir` is a safe deletion target:
 * it must reside directly under os.tmpdir() and its basename must match a
 * known scenario prefix. This prevents tampered globalState from causing
 * deletion of arbitrary paths.
 */
export function isSafeDeletionTarget(dir: string): boolean {
  const tmp = os.tmpdir()
  const resolved = path.resolve(dir)
  return resolved.startsWith(tmp + path.sep) && isScenarioDir(path.basename(resolved))
}

function findOrphanDirs(): string[] {
  const tmp = os.tmpdir()
  let entries: string[]
  try {
    entries = fs.readdirSync(tmp)
  } catch {
    return []
  }

  return entries
    .filter(isScenarioDir)
    .filter((name) => {
      try {
        return fs.statSync(path.join(tmp, name)).isDirectory()
      } catch {
        return false
      }
    })
    .map((name) => path.join(tmp, name))
}

export async function runCleanup(context: vscode.ExtensionContext): Promise<void> {
  // Sanitize stored value — could be corrupted or a non-array type
  const raw: unknown = context.globalState.get('gitScenarios.dirs')
  const tracked: string[] = Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : []

  const orphans = findOrphanDirs()
  const toRemove = [...new Set([...tracked, ...orphans])].filter(isSafeDeletionTarget)

  const count = toRemove.length
  if (count === 0) {
    // Still allow clearing the cache even with no dirs to remove
    try {
      await clearScenarioCache()
    } catch {
      // best-effort
    }
    await context.globalState.update('gitScenarios.dirs', [])
    vscode.window.showInformationMessage('No scenario directories found. Cache cleared.')
    return
  }

  const label = count === 1 ? '1 directory' : `${count} directories`

  const confirm = await vscode.window.showWarningMessage(
    `Remove ${label} and clear scenario cache?`,
    { modal: true },
    'Delete',
  )

  if (confirm !== 'Delete') return

  let removed = 0
  for (const dir of toRemove) {
    try {
      await fs.promises.rm(dir, { recursive: true, force: true })
      removed++
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to remove ${path.basename(dir)}: ${errorMessage(err)}`,
      )
    }
  }

  try {
    await clearScenarioCache()
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to clear scenario cache: ${errorMessage(err)}`,
    )
  }

  await context.globalState.update('gitScenarios.dirs', [])

  vscode.window.showInformationMessage(
    `Removed ${removed} director${removed === 1 ? 'y' : 'ies'} and cleared scenario cache.`,
  )
}
