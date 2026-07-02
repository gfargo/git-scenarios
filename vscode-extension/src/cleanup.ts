import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as vscode from 'vscode'
import { clearScenarioCache } from '@gfargo/git-scenarios'

export const CURRENT_PREFIX = 'git-scenarios-'
export const LEGACY_PREFIX = 'coco-git-test-'
export const CACHE_DIR_NAME = 'git-scenarios-cache'

// Pure predicate — safe to test without mocking the filesystem
export function isScenarioDir(name: string): boolean {
  return (
    (name.startsWith(CURRENT_PREFIX) || name.startsWith(LEGACY_PREFIX)) &&
    name !== CACHE_DIR_NAME
  )
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
  const tracked: string[] = context.globalState.get('gitScenarios.dirs', [])
  const orphans = findOrphanDirs()
  const toRemove = [...new Set([...tracked, ...orphans])]

  const count = toRemove.length
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
      fs.rmSync(dir, { recursive: true, force: true })
      removed++
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to remove ${path.basename(dir)}: ${(err as Error).message}`,
      )
    }
  }

  try {
    await clearScenarioCache()
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to clear scenario cache: ${(err as Error).message}`,
    )
  }

  await context.globalState.update('gitScenarios.dirs', [])

  vscode.window.showInformationMessage(
    `Removed ${removed} director${removed === 1 ? 'y' : 'ies'} and cleared scenario cache.`,
  )
}
