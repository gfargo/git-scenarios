import { execFile } from 'child_process'
import { existsSync } from 'fs'
import { chmod, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'
import { requireCommits } from './preconditions'
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
    await requireCommits(repo, 'startRebase')
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
/**
 * Start an interactive rebase (`git rebase -i <onto>`) and pause it at
 * the first `edit` action. A temporary `GIT_SEQUENCE_EDITOR` script
 * rewrites the first `pick` line to `edit` before git processes the
 * todo, so the rebase applies the first commit in the range and then
 * stops for user intervention — without any conflict.
 *
 * State after this step:
 *   - `.git/rebase-merge/` exists (rebase in progress)
 *   - `.git/rebase-merge/interactive` exists (interactive-rebase marker)
 *   - HEAD is detached at the first replayed commit
 *   - `.git/rebase-merge/git-rebase-todo` has the remaining picks
 *
 * Use `abortRebase()` (or `git rebase --abort`) to exit this state.
 * Use `git rebase --continue` to proceed through the remaining picks.
 *
 * The repo must have enough commits for `onto` to be resolvable — at
 * least 2 commits for `HEAD~1`, 4 commits for `HEAD~3`, etc.
 */
export function startInteractiveRebase(onto: string): Step {
  return async (repo) => {
    await requireCommits(repo, 'startInteractiveRebase')

    // Write a temp GIT_SEQUENCE_EDITOR that changes the first 'pick' to
    // 'edit'. Shells out via child_process so the env override is scoped
    // to this one invocation (same rationale as continueRebase).
    const scriptDir = await mkdtemp(join(tmpdir(), 'gsed-'))
    const scriptPath = join(scriptDir, 'seq.cjs')
    try {
      await writeFile(
        scriptPath,
        [
          '#!/usr/bin/env node',
          "const {readFileSync,writeFileSync}=require('fs')",
          'const f=process.argv[2]',
          "const lines=readFileSync(f,'utf8').split('\\n')",
          'let done=false',
          'const out=lines.map(l=>{',
          "  if(!done&&l.startsWith('pick ')){done=true;return'edit'+l.slice(4)}",
          '  return l',
          '})',
          "writeFileSync(f,out.join('\\n'))",
        ].join('\n'),
      )
      await chmod(scriptPath, 0o755)

      try {
        await execFileAsync('git', ['rebase', '-i', onto], {
          cwd: repo.path,
          env: {
            ...process.env,
            GIT_SEQUENCE_EDITOR: scriptPath,
            GIT_EDITOR: ':',
          },
        })
        // git ≥ 2.26 exits 0 when pausing at an 'edit' action.
      } catch {
        // Older git versions exit non-zero when pausing at 'edit'. Fall
        // through to the check below to distinguish this from a real error.
      }

      if (!existsSync(join(repo.path, '.git', 'rebase-merge'))) {
        throw new Error(
          'startInteractiveRebase: .git/rebase-merge/ is absent — the ' +
            'interactive rebase did not pause at the edit step. ' +
            `Verify '${onto}' is a valid ref with enough commits in the range.`,
        )
      }
    } finally {
      await rm(scriptDir, { recursive: true, force: true })
    }
  }
}

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
