import type { Step } from './types'

/**
 * Remove paths from the index without touching the working tree
 * (`git restore --staged <paths>`). The inverse of `stageFiles`.
 *
 * With no arguments, unstages everything currently staged
 * (`git restore --staged .`). With one or more paths, unstages only
 * those.
 *
 *   chain(
 *     writeFiles({ 'a.ts': 'a', 'b.ts': 'b' }),
 *     stageFiles(),                    // both staged
 *     unstageFiles('b.ts'),            // a still staged, b unstaged
 *   )
 *
 * Useful for assembling "partial stage" states where some hunks are
 * staged and others aren't — a very common real-world worktree
 * shape that tools render distinctly from "all staged" or "all
 * unstaged."
 *
 * Note: uses `git restore --staged` (modern syntax). On a fresh
 * repo with no commits, `git restore` doesn't work — use
 * `git reset` semantics instead by chaining through `stageFiles()`
 * and explicit reset operations.
 */
export function unstageFiles(...paths: string[]): Step {
  return async (repo) => {
    if (paths.length === 0) {
      // Reset the index to match HEAD without touching the worktree.
      // `git reset` (no args) is the canonical "unstage everything"
      // and works even on the initial commit.
      await repo.git.raw(['reset'])
      return
    }
    await repo.git.raw(['restore', '--staged', ...paths])
  }
}
