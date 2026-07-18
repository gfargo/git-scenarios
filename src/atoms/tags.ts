import { nextCommitDate } from '../commitClock'
import type { Step } from './types'

/**
 * Create a tag. With no `message`, produces a **lightweight** tag (a
 * named pointer to a commit). With a `message`, produces an
 * **annotated** tag (a real tag object that stores the message,
 * tagger, date — what `git describe` cares about).
 *
 *   createTag('v1.0.0')                            // lightweight, points at HEAD
 *   createTag('v1.0.0', { message: 'first release' })  // annotated
 *   createTag('v0.9.0', { sha: 'abc1234' })        // lightweight, on a specific commit
 *
 * `sha` can be any ref git understands (`HEAD~3`, `feat/x`, full sha,
 * short sha). Defaults to current HEAD.
 *
 * Annotated tags embed a tagger date; pass `date` to pin it (same
 * mechanism as the commit-creating atoms). Left unset, it's pulled
 * from the shared commit clock so the tag object's SHA stays stable
 * across replays. Lightweight tags don't create a tag object, so
 * they don't consume the clock.
 */
export function createTag(
  name: string,
  options: { message?: string; sha?: string; date?: string } = {},
): Step {
  return async (repo) => {
    const args = ['tag']
    if (options.message) {
      args.push('-a', name, '-m', options.message)
    } else {
      args.push(name)
    }
    if (options.sha) {
      args.push(options.sha)
    }
    if (options.message) {
      // Annotated tags embed a tagger date from GIT_COMMITTER_DATE.
      // Pin it so the tag object SHA is stable across replays. Use
      // the merge form of `env()` (not the object form) so a
      // surrounding `withAuthor` scope's committer identity survives.
      const date = options.date ?? nextCommitDate(repo.path)
      await repo.git.env('GIT_COMMITTER_DATE', date).raw(args)
    } else {
      await repo.git.raw(args)
    }
  }
}

/**
 * Delete a tag (`git tag -d <name>`). Useful when a scenario needs to
 * test "tag missing" states or the user-visible behavior of
 * tag-deletion workflows.
 */
export function deleteTag(name: string): Step {
  return async (repo) => {
    await repo.git.raw(['tag', '-d', name])
  }
}
