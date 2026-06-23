/**
 * Deterministic commit clock.
 *
 * Git stamps every commit with author + committer dates. Left to
 * default, those come from the wall clock — so the same scenario
 * produces different commit *hashes* on every run, and `git log --all`
 * ordering between same-second branch tips becomes unstable. That
 * undermines the library's core promise: byte-identical, reproducible
 * repos.
 *
 * This module hands out a deterministic, strictly-increasing sequence
 * of ISO-8601 dates per repo. The Nth commit in a scenario's setup
 * always gets `BASE + (N-1) * STEP`, regardless of when the test runs.
 * Distinct, monotonic dates give two things at once:
 *
 *   1. stable commit hashes (date is an input to the hash)
 *   2. stable `git log` ordering (no same-timestamp ties to break)
 *
 * Every commit-creating atom (`addCommit`, `commit`, `emptyCommit`,
 * `amendCommit`, `bulkCommits`, `startMerge`, `cherryPick`, `revert`)
 * and `TempGitRepo.commitAll` pull from here when the caller doesn't
 * pin an explicit `date`. An explicit `date` always wins and does not
 * touch the clock.
 *
 * Keyed by repo path (unique per `mkdtemp`). `resetCommitClock` is
 * called on cleanup so the map doesn't grow unbounded across a test
 * run.
 */

/** 2020-01-01T00:00:00Z — a fixed, recognizable epoch for fixtures. */
const BASE_MS = Date.UTC(2020, 0, 1, 0, 0, 0)

/** One minute between commits — readable in `git log --date=iso`. */
const STEP_MS = 60_000

const counters = new Map<string, number>()

/**
 * Return the next deterministic commit date for `key` (a repo path)
 * and advance the clock. Safe to call from any commit-creating path.
 */
export function nextCommitDate(key: string): string {
  const n = counters.get(key) ?? 0
  counters.set(key, n + 1)
  return new Date(BASE_MS + n * STEP_MS).toISOString()
}

/** Forget a repo's clock. Called from `TempGitRepo.cleanup`. */
export function resetCommitClock(key: string): void {
  counters.delete(key)
}
