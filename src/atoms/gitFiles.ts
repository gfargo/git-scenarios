import type { Step } from './types'
import { writeFiles } from './writeFiles'

/**
 * Atoms for the small handful of git-meta files that appear in
 * almost every real-world repo. Each is a thin wrapper over
 * `writeFiles` with a single canonical path — having a named atom
 * makes the intent legible at a glance and prevents typos in the
 * filename.
 */

/**
 * Write `.gitignore` at the repo root with the given patterns. Each
 * pattern is a separate line; a trailing newline is added.
 *
 *   writeGitignore(['node_modules', 'dist', '*.log'])
 *
 * The atom does NOT stage or commit — pair with `addCommit` if you
 * want the gitignore to land in history:
 *
 *   chain(
 *     writeGitignore(['node_modules', 'dist']),
 *     addCommit({ message: 'chore: add gitignore' }),
 *   )
 *
 * Pass an existing gitignore-style string for finer control:
 *
 *   writeGitignore('# build outputs\nnode_modules/\ndist/\n')
 */
export function writeGitignore(patterns: string[] | string): Step {
  const content = Array.isArray(patterns)
    ? patterns.join('\n') + '\n'
    : patterns.endsWith('\n') ? patterns : patterns + '\n'
  return writeFiles({ '.gitignore': content })
}

/**
 * Write `.gitattributes` at the repo root with the given rules. Each
 * rule is a `<pattern> <attribute>=<value>` line.
 *
 *   writeGitattributes(['*.png binary', '*.md text=auto'])
 *
 * The atom does NOT stage or commit. Pair with `addCommit` to
 * include in history:
 *
 *   chain(
 *     writeGitattributes(['*.png binary']),
 *     addCommit({ message: 'chore: mark png as binary' }),
 *   )
 *
 * Pass an existing gitattributes-style string for finer control.
 */
export function writeGitattributes(rules: string[] | string): Step {
  const content = Array.isArray(rules)
    ? rules.join('\n') + '\n'
    : rules.endsWith('\n') ? rules : rules + '\n'
  return writeFiles({ '.gitattributes': content })
}
