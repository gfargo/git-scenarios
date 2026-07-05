/**
 * Shared default values and deterministic generators for mock factories.
 *
 * These utilities produce predictable, reproducible values for commit
 * hashes, dates, and author metadata — ensuring mock objects are stable
 * across test runs without depending on wall-clock time or randomness.
 */

/**
 * Fixed epoch used as the starting point for deterministic date generation.
 * Chosen to be recognizable in test output: 2024-01-01T12:00:00.000Z.
 */
const DEFAULT_EPOCH_MS = Date.UTC(2024, 0, 1, 12, 0, 0)

/**
 * One hour in milliseconds — the decrement between consecutive log entries.
 */
const HOUR_MS = 3_600_000

/**
 * Generate a deterministic 40-character hex hash from an index.
 *
 * Produces sequential hashes padded with leading zeros:
 * - index 0 → `"0000000000000000000000000000000000000000"`
 * - index 1 → `"0000000000000000000000000000000000000001"`
 * - index 255 → `"00000000000000000000000000000000000000ff"`
 *
 * @param index - A non-negative integer used to derive the hash
 * @returns A 40-character lowercase hex string
 */
export function deterministicHash(index: number): string {
  return index.toString(16).padStart(40, '0')
}

/**
 * Generate a deterministic ISO 8601 date string from an index.
 *
 * Dates decrement by 1 hour per index step from a fixed epoch,
 * modeling a git log where index 0 is the most recent commit (HEAD)
 * and higher indices are progressively older.
 *
 * - index 0 → `"2024-01-01T12:00:00.000Z"` (or startDate if provided)
 * - index 1 → one hour earlier
 * - index 2 → two hours earlier
 *
 * @param index - A non-negative integer representing position in the log (0 = HEAD)
 * @param startDate - Optional ISO date string to use as the epoch instead of the default
 * @returns An ISO 8601 date string
 */
export function deterministicDate(index: number, startDate?: string): string {
  const epochMs = startDate ? new Date(startDate).getTime() : DEFAULT_EPOCH_MS
  return new Date(epochMs - index * HOUR_MS).toISOString()
}

/**
 * Default author identity used by log and commit mock factories
 * when no explicit author is specified.
 */
export const DEFAULT_AUTHOR = {
  name: 'Test Author',
  email: 'test@example.com',
} as const

/**
 * Default branch name used by status and branch mock factories
 * when no explicit branch is specified.
 */
export const DEFAULT_BRANCH = 'main' as const
