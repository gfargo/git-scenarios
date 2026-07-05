/**
 * Pretty-printers for mock objects.
 *
 * Formats StatusResult and LogResult as human-readable porcelain-style
 * output, useful for debugging test failures — "what does this mock
 * actually represent?"
 *
 * @module
 */

import type { StatusResult, LogResult, DefaultLogFields } from 'simple-git'

/**
 * Format a StatusResult as `git status --porcelain=v1` output.
 *
 * Output format:
 * ```
 * ## main...origin/main
 * M  src/auth.ts
 *  M src/utils.ts
 * ?? scratch.md
 * ```
 *
 * - First line: `## {current}` + `...{tracking}` if tracking exists
 * - If detached: `## HEAD (no branch)`
 * - File lines: `{index}{working_dir} {path}` (2 chars for XY + space + path)
 *
 * @param status - A StatusResult object (from mockStatusResult or mockStatus().build())
 * @returns Multi-line string matching git porcelain v1 format
 */
export function printMockStatus(status: StatusResult): string {
  const lines: string[] = []

  // Branch header line
  if (status.detached) {
    lines.push('## HEAD (no branch)')
  } else if (status.tracking) {
    lines.push(`## ${status.current}...${status.tracking}`)
  } else {
    lines.push(`## ${status.current}`)
  }

  // File status lines: XY + space + path
  for (const file of status.files) {
    lines.push(`${file.index}${file.working_dir} ${file.path}`)
  }

  return lines.join('\n')
}

/**
 * Format a LogResult as `git log --oneline` output.
 *
 * Output format:
 * ```
 * abc1234 feat: add auth
 * def5678 chore: initial commit
 * ```
 *
 * Each line: first 7 characters of hash + space + message.
 * One line per entry in `all`.
 *
 * @param log - A LogResult object (from mockLogResult or mockLog().build())
 * @returns Multi-line string matching git log --oneline format
 */
export function printMockLog(log: LogResult<DefaultLogFields>): string {
  return log.all
    .map((entry) => `${entry.hash.slice(0, 7)} ${entry.message}`)
    .join('\n')
}
