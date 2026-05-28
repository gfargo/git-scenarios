import { GitCommandError } from '../errors'

/**
 * Execute a git operation and wrap failures in GitCommandError.
 * Preserves the atom name for traceability in error messages.
 *
 * simple-git throws `GitError` objects that have a `.git` property
 * with command details. Some errors use `message` directly without
 * the `.git` structure — both cases are handled gracefully.
 */
export async function withGitError<T>(
  atomName: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation()
  } catch (err: unknown) {
    if (err instanceof Error && 'git' in err) {
      const gitErr = err as {
        message: string
        git?: { command?: string; exitCode?: number; stdErr?: string }
      }
      throw new GitCommandError({
        command: gitErr.git?.command ?? 'unknown',
        exitCode: gitErr.git?.exitCode ?? 1,
        stderr: gitErr.git?.stdErr ?? gitErr.message,
        atomName,
      })
    }
    throw err
  }
}
