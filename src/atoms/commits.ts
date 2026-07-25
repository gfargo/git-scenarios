import { datePin, gitForRepo } from './gitEnv'
import { nextCommitDate } from '../commitClock'
import type { Step } from './types'

/**
 * Commit-shape atoms that aren't write-stage-commit (`addCommit`) or
 * the commit-only primitive (`commit`). These produce commits via
 * `--allow-empty` or `--amend` paths — distinct enough from the
 * regular flow to live in their own file.
 */

/**
 * Commit with `--allow-empty` so an absent diff doesn't error
 * (`git commit --allow-empty -m <message>`). Useful for setting up
 * "history with N entries" scenarios where the diff content doesn't
 * matter — saves the overhead of generating throwaway content for
 * each step.
 *
 * Pass `date` to pin author + committer dates (see `addCommit`).
 */
export function emptyCommit(message: string, options: { date?: string } = {}): Step {
  return async (repo) => {
    const date = options.date ?? nextCommitDate(repo.path)
    await gitForRepo(repo, datePin(date)).raw(['commit', '--allow-empty', '-m', message])
  }
}

/**
 * Amend the current commit (`git commit --amend`). With `message`,
 * rewrites the commit subject + body; without, keeps the existing
 * message (`--no-edit`).
 *
 * Uses `--all` so modifications to **already-tracked** files fold
 * into the amended commit automatically. New untracked files do
 * NOT get picked up by `--all` — stage them explicitly first if you
 * want them included:
 *
 *   chain(
 *     writeFiles({ 'src/new.ts': '…' }),
 *     stageFiles('src/new.ts'),
 *     amendCommit({ message: 'feat: with new file' }),
 *   )
 */
export function amendCommit(options: { message?: string; date?: string } = {}): Step {
  return async (repo) => {
    const args = ['commit', '--amend', '--all']
    if (options.message) {
      args.push('-m', options.message)
    } else {
      args.push('--no-edit')
    }
    // Amending rewrites the commit, so its committer date (and thus
    // hash) would otherwise drift to wall-clock time. Pin it.
    const date = options.date ?? nextCommitDate(repo.path)
    await gitForRepo(repo, datePin(date)).raw(args)
  }
}
