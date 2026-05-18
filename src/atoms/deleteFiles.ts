import { rm } from 'fs/promises'
import { join } from 'path'
import type { Step } from './types'

/**
 * Remove files from the working directory. Does NOT stage the
 * deletions — pair with `stageFiles()` or `addCommit()` to land
 * the removal in the index/commit.
 *
 * Useful for scenarios that need "deleted file" status in the
 * worktree or index — testing `git status` rendering, diff views
 * that show removed files, or restore flows.
 *
 *   chain(
 *     addCommit({ message: 'init', files: { 'a.ts': 'a', 'b.ts': 'b' } }),
 *     deleteFiles('b.ts'),
 *     stageFiles('b.ts'),
 *     commit('chore: remove b'),
 *   )
 *
 * Accepts one or more repo-relative paths. Silently skips paths that
 * don't exist (idempotent).
 */
export function deleteFiles(...paths: string[]): Step {
  return async (repo) => {
    for (const filePath of paths) {
      const abs = join(repo.path, filePath)
      await rm(abs, { force: true })
    }
  }
}
