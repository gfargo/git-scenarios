import { nextCommitDate } from '../commitClock'
import { datePin, gitForRepo } from './gitEnv'
/**
 * Git notes atom — add, remove, or append notes to commits. Useful
 * for testing tools that display or process git notes (code review
 * metadata, CI annotations, etc.).
 *
 *   chain(
 *     addCommit({ message: 'feat: widget', files: { 'widget.ts': '…' } }),
 *     addNote('Reviewed-by: Alice <alice@example.com>'),
 *     // The latest commit now has a note attached
 *   )
 */

import type { Step } from './types';

/**
 * Add a note to a commit. If the commit already has a note, this
 * overwrites it (use `appendNote` to append instead).
 *
 * @param message - The note content
 * @param options.ref - The commit ref to annotate (default: HEAD)
 * @param options.namespace - Notes ref namespace (default: refs/notes/commits)
 */
export function addNote(
  message: string,
  options: { ref?: string; namespace?: string } = {},
): Step {
  return async (repo) => {
    const args = ['notes']
    if (options.namespace) {
      args.push('--ref', options.namespace)
    }
    args.push('add', '-f', '-m', message)
    if (options.ref) {
      args.push(options.ref)
    }
    // A note lives in a commit under `refs/notes/*`, so it needs a
    // pinned date to stay reproducible.
    await gitForRepo(repo, datePin(nextCommitDate(repo.path))).raw(args)
  }
}

/**
 * Append to an existing note on a commit. Creates the note if it
 * doesn't exist yet.
 *
 * @param message - Content to append
 * @param options.ref - The commit ref to annotate (default: HEAD)
 * @param options.namespace - Notes ref namespace (default: refs/notes/commits)
 */
export function appendNote(
  message: string,
  options: { ref?: string; namespace?: string } = {},
): Step {
  return async (repo) => {
    const args = ['notes']
    if (options.namespace) {
      args.push('--ref', options.namespace)
    }
    args.push('append', '-m', message)
    if (options.ref) {
      args.push(options.ref)
    }
    await gitForRepo(repo, datePin(nextCommitDate(repo.path))).raw(args)
  }
}

/**
 * Remove a note from a commit.
 *
 * @param options.ref - The commit ref (default: HEAD)
 * @param options.namespace - Notes ref namespace (default: refs/notes/commits)
 */
export function removeNote(
  options: { ref?: string; namespace?: string } = {},
): Step {
  return async (repo) => {
    const args = ['notes']
    if (options.namespace) {
      args.push('--ref', options.namespace)
    }
    args.push('remove')
    if (options.ref) {
      args.push(options.ref)
    }
    await repo.git.raw(args)
  }
}
