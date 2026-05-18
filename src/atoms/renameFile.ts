import type { Step } from './types'

/**
 * Rename (move) a tracked file via `git mv`. Stages the rename in
 * the index so git's rename detection picks it up in the next commit.
 * Parent directories at the destination are created automatically by
 * git.
 *
 * Useful for scenarios that test rename-detection in diff views,
 * blame-across-renames, or refactoring tools:
 *
 *   chain(
 *     addCommit({ message: 'init', files: { 'src/old.ts': 'content' } }),
 *     renameFile('src/old.ts', 'src/new.ts'),
 *     commit('refactor: rename old → new'),
 *   )
 *
 * The file must be tracked (committed or staged). Renaming an
 * untracked file will fail — use `writeFiles` + `deleteFiles` for
 * that case.
 */
export function renameFile(from: string, to: string): Step {
  return async (repo) => {
    await repo.git.raw(['mv', from, to])
  }
}
