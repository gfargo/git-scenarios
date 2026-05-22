/**
 * Shallow clone atom — convert a repo into a shallow state or create
 * a shallow clone. Useful for testing tools that need to detect or
 * handle shallow repositories (`git rev-parse --is-shallow-repository`).
 *
 * Note: This atom works by grafting the history to simulate a shallow
 * repo without requiring a network clone. It writes the `.git/shallow`
 * file directly, which is the same mechanism git uses internally.
 *
 *   chain(
 *     addCommit({ message: 'old history', files: { 'a.ts': 'a' } }),
 *     addCommit({ message: 'more history', files: { 'b.ts': 'b' } }),
 *     addCommit({ message: 'recent', files: { 'c.ts': 'c' } }),
 *     shallowAt(1),
 *     // Repo now appears shallow — only the last commit is reachable
 *   )
 */

import { writeFile } from 'fs/promises'
import { join } from 'path'
import type { Step } from './types'

/**
 * Make the repository appear shallow by writing a `.git/shallow` file
 * containing the SHA of the commit at the specified depth from HEAD.
 * This simulates `git clone --depth <depth>` without requiring a
 * remote.
 *
 * After this atom runs, `git rev-parse --is-shallow-repository`
 * returns `true` and `git log` only shows commits from HEAD back to
 * the shallow boundary.
 *
 * @param depth - Number of commits to keep reachable from HEAD.
 *   depth=1 means only HEAD is reachable.
 */
export function shallowAt(depth: number): Step {
  return async (repo) => {
    // Get the commit at the boundary (depth commits back from HEAD)
    const boundaryRef = `HEAD~${depth}`
    const sha = await repo.git.raw(['rev-parse', boundaryRef])
    const shallowFile = join(repo.path, '.git', 'shallow')
    await writeFile(shallowFile, sha.trim() + '\n')
  }
}

/**
 * Remove the shallow boundary, making the full history reachable
 * again. Equivalent to `git fetch --unshallow` but works without
 * a remote.
 */
export function unshallow(): Step {
  return async (repo) => {
    const { rm } = await import('fs/promises')
    const shallowFile = join(repo.path, '.git', 'shallow')
    await rm(shallowFile, { force: true })
  }
}
