/**
 * LogResult mock factory and fluent LogBuilder.
 *
 * Provides two APIs for constructing `LogResult<DefaultLogFields>` objects:
 * - `mockLogResult(options?)` — functional factory for declarative construction
 * - `mockLog()` — returns a chainable `LogBuilder` for incremental construction
 *
 * All generated commit entries use deterministic hashes, dates, and author
 * metadata from `./defaults`, ensuring stable, reproducible test data.
 */

import type { DefaultLogFields, LogResult } from 'simple-git'
import { deterministicHash, deterministicDate, DEFAULT_AUTHOR } from './defaults'

/**
 * Options for the functional `mockLogResult` factory.
 *
 * - `count`: generate N commits with sequential defaults
 * - `commits`: partial overrides for individual entries
 * - `startDate`: ISO string epoch for deterministic date generation
 *
 * When both `count` and `commits` are provided, `commits` takes precedence
 * for the entries it covers; remaining entries (up to `count`) use defaults.
 */
export type MockLogOptions = {
  count?: number
  commits?: Array<Partial<DefaultLogFields>>
  startDate?: string
}

/**
 * Build a single commit entry by merging deterministic defaults with
 * any caller-provided overrides.
 */
function buildCommitEntry(
  index: number,
  overrides?: Partial<DefaultLogFields>,
  startDate?: string
): DefaultLogFields {
  return {
    hash: overrides?.hash ?? deterministicHash(index),
    date: overrides?.date ?? deterministicDate(index, startDate),
    message: overrides?.message ?? `commit ${index + 1}`,
    refs: overrides?.refs ?? '',
    body: overrides?.body ?? '',
    author_name: overrides?.author_name ?? DEFAULT_AUTHOR.name,
    author_email: overrides?.author_email ?? DEFAULT_AUTHOR.email,
  }
}

/**
 * Create a `LogResult<DefaultLogFields>` with deterministic commit entries.
 *
 * - No arguments → empty log: `{ all: [], latest: null, total: 0 }`
 * - `count: N` → N entries with sequential hashes, dates, and `commit 1`..`commit N` messages
 * - `commits: [...]` → partial overrides; unspecified fields filled with deterministic defaults
 * - `latest` always references `all[0]` (most recent commit) or `null` if empty
 * - `total` always equals `all.length`
 */
export function mockLogResult(options?: MockLogOptions): LogResult<DefaultLogFields> {
  if (!options || (options.count === undefined && !options.commits)) {
    return { all: [], latest: null, total: 0 }
  }

  const { count, commits, startDate } = options
  const entryCount = count ?? commits?.length ?? 0

  const all: DefaultLogFields[] = []
  for (let i = 0; i < entryCount; i++) {
    const override = commits?.[i]
    all.push(buildCommitEntry(i, override, startDate))
  }

  return {
    all,
    latest: all.length > 0 ? all[0] : null,
    total: all.length,
  }
}

/**
 * Fluent builder for constructing `LogResult<DefaultLogFields>` incrementally.
 *
 * Usage:
 * ```ts
 * const log = mockLog()
 *   .commit({ message: 'feat: add auth' })
 *   .commit({ message: 'chore: initial commit' })
 *   .build()
 * ```
 *
 * Each `.commit()` call appends an entry. The index is assigned in call order
 * (0 = first commit added = HEAD / most recent).
 */
export class LogBuilder {
  private commits: Array<Partial<DefaultLogFields>> = []
  private startDate?: string

  /**
   * Append a commit entry with optional field overrides.
   * Unspecified fields are filled with deterministic defaults based on the
   * entry's index (call order).
   */
  commit(overrides?: Partial<DefaultLogFields>): this {
    this.commits.push(overrides ?? {})
    return this
  }

  /**
   * Set a custom start date for deterministic date generation.
   */
  from(startDate: string): this {
    this.startDate = startDate
    return this
  }

  /**
   * Build the final `LogResult<DefaultLogFields>` from accumulated state.
   */
  build(): LogResult<DefaultLogFields> {
    return mockLogResult({
      commits: this.commits,
      count: this.commits.length,
      startDate: this.startDate,
    })
  }
}

/**
 * Create a new `LogBuilder` for fluent construction of `LogResult` objects.
 *
 * @returns A fresh `LogBuilder` instance
 */
export function mockLog(): LogBuilder {
  return new LogBuilder()
}
