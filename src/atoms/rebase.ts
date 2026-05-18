import { execFile } from 'child_process'
import { promisify } from 'util'
import type { Step } from './types'

const execFileAsync = promisify(execFile)

/**
 * Start a rebase of the current branch onto a target ref (`git rebase
 * <onto>`). With `allowConflict: true` (the **default**), conflicts
 * pause the rebase and leave the repo in a mid-rebase state —
 * `.git/rebase-merge/` exists, `REBASE_HEAD` is set, and conflicted
 * files appear in the worktree. With `allowConflict: false`, any
 * failure rethrows.
 *
 * Typical mid-rebase-conflict pattern:
 *
 *   chain(
 *     addCommit({ message: 'base', files: { 'x.ts': 'base\n' } }),
 *     switchToBranch('feat/theirs'),
 *     addCommit({ message: 'theirs', files: { 'x.ts': 'theirs\n' } }),
 *     checkoutBranch('main'),
 *     addCommit({ message: 'ours', files: { 'x.ts': 'ours\n' } }),
 *     checkoutBranch('feat/theirs'),
 *     startRebase('main'),
 *     // repo is now mid-rebase with x.ts conflicted
 *   )
 *
 * For interactive rebase scenarios, use `startRebase` with
 * `interactive: true` and provide an `editorScript` that drives the
 * todo list — but note that interactive rebase requires a
 * `GIT_SEQUENCE_EDITOR` override, which is an advanced pattern.
 */
export function startRebase(
  onto: string,
  options: { allowConflict?: boolean } = {},
): Step {
  const allowConflict = options.allowConflict !== false
  return async (repo) => {
    let rebaseError: unknown
    try {
      await repo.git.raw(['rebase', onto])
    } catch (error) {
      rebaseError = error
    }
    const status = await repo.git.status()
    if (status.conflicted.length > 0) {
      if (!allowConflict) {
        throw rebaseError ?? new Error(
          `rebase onto '${onto}' produced conflicts: ${status.conflicted.join(', ')}`,
        )
      }
      return // leave the repo mid-rebase
    }
    if (rebaseError) {
      throw rebaseError
    }
  }
}

/**
 * Abort an in-progress rebase (`git rebase --abort`). Restores the
 * branch and working tree to the pre-rebase state. Useful for testing
 * "user cancelled the rebase" flows.
 */
export function abortRebase(): Step {
  return async (repo) => {
    await repo.git.raw(['rebase', '--abort'])
  }
}

/**
 * Continue a paused rebase after conflicts have been resolved (`git
 * rebase --continue`). The caller is responsible for resolving
 * conflicts and staging the resolution before calling this atom.
 *
 *   chain(
 *     startRebase('main'),
 *     // resolve conflicts manually:
 *     writeFiles({ 'x.ts': 'resolved\n' }),
 *     stageFiles('x.ts'),
 *     continueRebase(),
 *   )
 *
 * `GIT_EDITOR=:` is set for the underlying spawn so git doesn't try
 * to open an editor for the commit message on the conflict-resolution
 * commit — which would hang any non-interactive caller (CI runners,
 * test suites, scripted scenarios). The original commit message is
 * preserved, which is what scripted callers want.
 */
export function continueRebase(): Step {
  return async (repo) => {
    // Shell out via child_process so the GIT_EDITOR override is scoped
    // to this one spawn — no mutation of `process.env` or of the shared
    // simpleGit instance. simple-git's `.env()` mutates the receiver,
    // which would leak into subsequent atoms in the chain.
    await execFileAsync('git', ['rebase', '--continue'], {
      cwd: repo.path,
      env: { ...process.env, GIT_EDITOR: ':', GIT_SEQUENCE_EDITOR: ':' },
    })
  }
}
