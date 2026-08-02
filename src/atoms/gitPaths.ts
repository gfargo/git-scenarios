import { isAbsolute, join } from 'path'
import type { TempGitRepo } from '../tempGitRepo'

/**
 * Resolve `rel` against the repo's actual git directory via
 * `git rev-parse --git-path`, which correctly routes shared files
 * (hooks, shallow) to the common dir and per-worktree files to the
 * worktree's own git dir — unlike a hardcoded `join(repo.path, '.git', rel)`,
 * which breaks when `repo.path` is a linked worktree (`.git` is a file
 * there, not a directory).
 */
export async function gitDirPath(repo: TempGitRepo, rel: string): Promise<string> {
  const out = (await repo.git.raw(['rev-parse', '--git-path', rel])).trim()
  return isAbsolute(out) ? out : join(repo.path, out)
}
