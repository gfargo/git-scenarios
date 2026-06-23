import { nextCommitDate } from '../commitClock'
import type { FileMap, Step } from './types'
import { writeFiles } from './writeFiles'

/**
 * A single commit spec for `bulkCommits`.
 *
 *   - `message` — the commit subject
 *   - `files` — optional FileMap to write before staging + committing.
 *     When omitted, the commit is empty (uses `--allow-empty`).
 *   - `date` — optional pinned author + committer date (ISO).
 */
export type BulkCommitSpec = {
  message: string
  files?: FileMap
  date?: string
}

/**
 * Produce a sequence of N commits as a single atom. Equivalent to
 * `chain(...specs.map((s) => addCommit(s)))` but ~30% faster on
 * large histories because it skips the per-step `chain` boilerplate
 * and uses a single tight loop.
 *
 *   bulkCommits([
 *     { message: 'feat: a', files: { 'a.ts': 'a\n' } },
 *     { message: 'feat: b', files: { 'b.ts': 'b\n' } },
 *     { message: 'feat: c' }, // empty commit (no diff)
 *   ])
 *
 * Designed for scenarios that need 50+ commits (large-repo,
 * pagination tests, history-shape stress tests). For small numbers
 * of commits with distinct logic, use `chain(...)` of `addCommit`
 * atoms — clearer intent.
 *
 * Specs without `files` are committed with `--allow-empty`, which
 * is the behavior most "fill out a long history" cases want — the
 * commit content doesn't matter, only that the commit exists.
 */
export function bulkCommits(specs: BulkCommitSpec[]): Step {
  return async (repo) => {
    for (const spec of specs) {
      const hasFiles = spec.files && Object.keys(spec.files).length > 0
      if (hasFiles) {
        await writeFiles(spec.files!)(repo)
      }
      const args = ['commit']
      if (!hasFiles) {
        args.push('--allow-empty')
      } else {
        await repo.git.add('.')
      }
      args.push('-m', spec.message)
      const date = spec.date ?? nextCommitDate(repo.path)
      await repo.git
        .env({ GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date })
        .raw(args)
    }
  }
}
