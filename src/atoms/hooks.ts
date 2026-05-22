/**
 * Git hooks atom — write executable hook scripts into `.git/hooks/`.
 * Useful for testing tools that detect, skip, or honor git hooks
 * (pre-commit, commit-msg, pre-push, etc.).
 *
 *   chain(
 *     addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
 *     installHook('pre-commit', '#!/bin/sh\nexit 1'),
 *     // Subsequent commits will fail unless --no-verify is used
 *   )
 */

import { chmod, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import type { Step } from './types'

/**
 * Valid git hook names. Not exhaustive but covers the common ones
 * that tools typically interact with.
 */
export type GitHookName =
  | 'applypatch-msg'
  | 'commit-msg'
  | 'post-checkout'
  | 'post-commit'
  | 'post-merge'
  | 'post-receive'
  | 'post-update'
  | 'pre-applypatch'
  | 'pre-commit'
  | 'pre-merge-commit'
  | 'pre-push'
  | 'pre-rebase'
  | 'pre-receive'
  | 'prepare-commit-msg'
  | 'update'

/**
 * Install a git hook script. The script is written to
 * `.git/hooks/<name>` and made executable (chmod 755).
 *
 * @param name - The hook name (e.g., 'pre-commit', 'commit-msg')
 * @param script - The hook script content. Should start with a
 *   shebang line (e.g., `#!/bin/sh`).
 */
export function installHook(name: GitHookName, script: string): Step {
  return async (repo) => {
    const hooksDir = join(repo.path, '.git', 'hooks')
    await mkdir(hooksDir, { recursive: true })
    const hookPath = join(hooksDir, name)
    await writeFile(hookPath, script)
    await chmod(hookPath, 0o755)
  }
}

/**
 * Remove a git hook by deleting the script file.
 *
 * @param name - The hook name to remove
 */
export function removeHook(name: GitHookName): Step {
  return async (repo) => {
    const { rm } = await import('fs/promises')
    const hookPath = join(repo.path, '.git', 'hooks', name)
    await rm(hookPath, { force: true })
  }
}
