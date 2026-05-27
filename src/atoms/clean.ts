import type { Step } from './types';

/**
 * Remove untracked files from the working tree (`git clean -f`).
 *
 *   gitClean()                                  // git clean -f (untracked files only)
 *   gitClean({ directories: true })             // git clean -fd (also untracked dirs)
 *   gitClean({ directories: true, force: true }) // explicit force; same as default
 *
 * `force` defaults to true since `git clean` requires `-f` to do
 * anything by default. The flag is exposed for API symmetry but
 * passing `force: false` is unusual — it would surface git's safety
 * error.
 *
 * Useful for testing tools that detect or perform cleanup, and for
 * resetting a worktree between test phases without recreating the
 * whole repo.
 *
 * Does NOT touch:
 *   - tracked files (modified or otherwise)
 *   - paths matched by `.gitignore` (unless `ignored: true` is set)
 */
export function gitClean(
  options: { directories?: boolean; force?: boolean; ignored?: boolean } = {},
): Step {
  const force = options.force !== false
  return async (repo) => {
    const args = ['clean']
    if (force) args.push('-f')
    if (options.directories) args.push('-d')
    if (options.ignored) args.push('-x')
    await repo.git.raw(args)
  }
}
