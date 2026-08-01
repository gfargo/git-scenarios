/**
 * `assertRepo(...)` — a fluent, runner-agnostic assertion API over a
 * repo's {@link RepoSnapshot}.
 *
 * It works in any test runner (or outside tests entirely) because it
 * throws a plain {@link RepoAssertionError} on mismatch rather than
 * hooking into a framework. The per-runner `expect(...)` matchers
 * (`@gfargo/git-scenarios/matchers`) are a thin layer over this same
 * core.
 *
 *   import { assertRepo } from '@gfargo/git-scenarios'
 *
 *   const repo = await spinUpScenario('feature-pr-ready')
 *   await assertRepo(repo)
 *     .onBranch('feat/widget-v2')
 *     .cleanWorktree()
 *     .commitCount(7)
 *
 * Assertions are queued synchronously as you chain, then evaluated once
 * against a single snapshot when the chain is awaited — so one chain
 * costs exactly one snapshot, and `await` is the trigger:
 *
 *   const snap = await assertRepo(repo).onBranch('main')
 *   //    ^ resolves to the RepoSnapshot, handy for follow-up checks
 */

import type { SimpleGit } from 'simple-git'

import { InvalidArgumentError, RepoAssertionError } from './errors'
import { snapshotRepo, type InProgressOperation, type RepoSnapshot } from './snapshot'

/** Anything `assertRepo` can read a snapshot from. */
export type SnapshotSource =
  | { snapshot: () => Promise<RepoSnapshot> }
  | SimpleGit

function isSnapshottable(
  source: SnapshotSource,
): source is { snapshot: () => Promise<RepoSnapshot> } {
  return typeof (source as { snapshot?: unknown }).snapshot === 'function'
}

async function readSnapshot(source: SnapshotSource): Promise<RepoSnapshot> {
  return isSnapshottable(source) ? source.snapshot() : snapshotRepo(source as SimpleGit)
}

function isSimpleGit(val: unknown): val is SimpleGit {
  return typeof val === 'object' && val !== null && typeof (val as { raw?: unknown }).raw === 'function'
}

/**
 * Extract a SimpleGit handle from any SnapshotSource. Returns `null`
 * when the source is a plain `{ snapshot() }` object with no `.git`
 * property — `aheadOf`/`behindOf` require a git-bearing source.
 */
function resolveGit(source: SnapshotSource): SimpleGit | null {
  if (!isSnapshottable(source)) return source as SimpleGit
  const g = (source as Record<string, unknown>).git
  return isSimpleGit(g) ? g : null
}

type Check = (snap: RepoSnapshot) => void | Promise<void>

function fail(assertion: string, expected: unknown, actual: unknown, message: string): never {
  throw new RepoAssertionError({ assertion, expected, actual, message })
}

/**
 * A chainable, awaitable assertion over a repo snapshot. Each method
 * queues a check and returns `this`; awaiting the chain takes one
 * snapshot and runs every queued check, resolving to that snapshot.
 */
export class RepoAssertion implements PromiseLike<RepoSnapshot> {
  private readonly checks: Check[] = []

  constructor(private readonly source: SnapshotSource) {}

  /** Assert HEAD is on the named branch. */
  onBranch(name: string): this {
    this.checks.push((s) => {
      if (s.head.branch !== name) {
        fail(
          'onBranch',
          name,
          s.head.branch,
          `Expected HEAD on branch "${name}", but ${
            s.head.branch === null
              ? s.head.detached
                ? 'HEAD is detached'
                : 'the repo has no branch'
              : `it is on "${s.head.branch}"`
          }.`,
        )
      }
    })
    return this
  }

  /** Assert HEAD is detached (points at a commit, not a branch). */
  detached(): this {
    this.checks.push((s) => {
      if (!s.head.detached) {
        fail('detached', true, s.head.detached, `Expected detached HEAD, but it is on "${s.head.branch}".`)
      }
    })
    return this
  }

  /** Assert the named local branch exists. */
  hasBranch(name: string): this {
    this.checks.push((s) => {
      if (!s.branches.includes(name)) {
        fail('hasBranch', name, s.branches, `Expected local branch "${name}" to exist; have [${s.branches.join(', ')}].`)
      }
    })
    return this
  }

  /** Assert the working tree is clean (no staged, unstaged, untracked, or conflicted changes). */
  cleanWorktree(): this {
    this.checks.push((s) => {
      if (!s.status.clean) {
        fail(
          'cleanWorktree',
          true,
          s.status,
          `Expected a clean worktree, but found ${s.status.staged.length} staged, ` +
            `${s.status.modified.length} modified, ${s.status.untracked.length} untracked, ` +
            `${s.conflicts.length} conflicted.`,
        )
      }
    })
    return this
  }

  /** Assert the working tree is dirty (has at least one change). */
  dirtyWorktree(): this {
    this.checks.push((s) => {
      if (s.status.clean) {
        fail('dirtyWorktree', false, true, 'Expected a dirty worktree, but it is clean.')
      }
    })
    return this
  }

  /** Assert a path is staged — or, with no argument, that something is staged. */
  hasStaged(path?: string): this {
    this.checks.push((s) => {
      if (path === undefined) {
        if (s.status.staged.length === 0) fail('hasStaged', 'any staged path', s.status.staged, 'Expected staged changes, but found none.')
      } else if (!s.status.staged.includes(path)) {
        fail('hasStaged', path, s.status.staged, `Expected "${path}" to be staged; staged: [${s.status.staged.join(', ')}].`)
      }
    })
    return this
  }

  /** Assert a path has unstaged modifications — or, with no argument, that something is modified. */
  hasModified(path?: string): this {
    this.checks.push((s) => {
      if (path === undefined) {
        if (s.status.modified.length === 0) fail('hasModified', 'any modified path', s.status.modified, 'Expected unstaged modifications, but found none.')
      } else if (!s.status.modified.includes(path)) {
        fail('hasModified', path, s.status.modified, `Expected "${path}" to be modified; modified: [${s.status.modified.join(', ')}].`)
      }
    })
    return this
  }

  /** Assert a path is untracked — or, with no argument, that something is untracked. */
  hasUntracked(path?: string): this {
    this.checks.push((s) => {
      if (path === undefined) {
        if (s.status.untracked.length === 0) fail('hasUntracked', 'any untracked path', s.status.untracked, 'Expected untracked files, but found none.')
      } else if (!s.status.untracked.includes(path)) {
        fail('hasUntracked', path, s.status.untracked, `Expected "${path}" to be untracked; untracked: [${s.status.untracked.join(', ')}].`)
      }
    })
    return this
  }

  /** Assert the branch is exactly `n` commits ahead of its upstream. */
  ahead(n: number): this {
    this.checks.push((s) => {
      if (s.status.ahead !== n) {
        fail('ahead', n, s.status.ahead, `Expected ${n} commit(s) ahead of upstream, but found ${s.status.ahead}.`)
      }
    })
    return this
  }

  /** Assert the branch is exactly `n` commits behind its upstream. */
  behind(n: number): this {
    this.checks.push((s) => {
      if (s.status.behind !== n) {
        fail('behind', n, s.status.behind, `Expected ${n} commit(s) behind upstream, but found ${s.status.behind}.`)
      }
    })
    return this
  }

  /** Assert the branch is in sync with its upstream (0 ahead, 0 behind). */
  inSyncWithUpstream(): this {
    this.checks.push((s) => {
      if (s.status.upstream === null) {
        fail(
          'inSyncWithUpstream',
          'an upstream branch',
          null,
          'Expected to be in sync with upstream, but no upstream is configured for this branch.',
        )
      }
      if (s.status.ahead !== 0 || s.status.behind !== 0) {
        fail('inSyncWithUpstream', { ahead: 0, behind: 0 }, { ahead: s.status.ahead, behind: s.status.behind }, `Expected to be in sync with upstream, but found ${s.status.ahead} ahead / ${s.status.behind} behind.`)
      }
    })
    return this
  }

  /** Assert the total number of commits reachable from HEAD. */
  commitCount(n: number): this {
    this.checks.push((s) => {
      if (s.commitCount !== n) {
        fail('commitCount', n, s.commitCount, `Expected ${n} commit(s) reachable from HEAD, but found ${s.commitCount}.`)
      }
    })
    return this
  }

  /** Assert the given resumable operation is in progress (or, with `null`, that none is). */
  inOperation(op: InProgressOperation): this {
    this.checks.push((s) => {
      if (s.operation !== op) {
        fail('inOperation', op, s.operation, `Expected operation ${op === null ? 'none' : `"${op}"`}, but found ${s.operation === null ? 'none' : `"${s.operation}"`}.`)
      }
    })
    return this
  }

  /** Assert no resumable operation is in progress. */
  noOperation(): this {
    return this.inOperation(null)
  }

  /** Assert a path is conflicted — or, with no argument, that there is at least one conflict. */
  hasConflict(path?: string): this {
    this.checks.push((s) => {
      if (path === undefined) {
        if (s.conflicts.length === 0) fail('hasConflict', 'any conflicted path', s.conflicts, 'Expected conflicts, but found none.')
      } else if (!s.conflicts.includes(path)) {
        fail('hasConflict', path, s.conflicts, `Expected "${path}" to be conflicted; conflicts: [${s.conflicts.join(', ')}].`)
      }
    })
    return this
  }

  /** Assert there are no conflicted paths. */
  noConflicts(): this {
    this.checks.push((s) => {
      if (s.conflicts.length > 0) {
        fail('noConflicts', [], s.conflicts, `Expected no conflicts, but found [${s.conflicts.join(', ')}].`)
      }
    })
    return this
  }

  /**
   * Assert HEAD is exactly `n` commits ahead of an arbitrary `ref` (e.g.
   * `'origin/main'`, `'main'`). Requires a git-bearing source — pass a
   * `TempGitRepo` or a raw `SimpleGit` instance.
   */
  aheadOf(ref: string, n: number): this {
    const git = resolveGit(this.source)
    if (!git) {
      throw new InvalidArgumentError({
        parameterName: 'source',
        constraint: '`aheadOf()` requires a source that exposes a SimpleGit handle — pass a TempGitRepo or a raw SimpleGit instance',
      })
    }
    this.checks.push(async () => {
      let out: string
      try {
        out = await git.raw(['rev-list', '--count', `${ref}..HEAD`])
      } catch (err) {
        throw new InvalidArgumentError({
          parameterName: 'ref',
          constraint: `"${ref}" is not a valid ref — ${err instanceof Error ? err.message.trim() : String(err)}`,
        })
      }
      const actual = parseInt(out.trim(), 10)
      if (actual !== n) {
        fail('aheadOf', n, actual, `Expected HEAD to be ${n} commit(s) ahead of "${ref}", but found ${actual}.`)
      }
    })
    return this
  }

  /**
   * Assert HEAD is exactly `n` commits behind an arbitrary `ref` (e.g.
   * `'origin/main'`, `'main'`). Requires a git-bearing source — pass a
   * `TempGitRepo` or a raw `SimpleGit` instance.
   */
  behindOf(ref: string, n: number): this {
    const git = resolveGit(this.source)
    if (!git) {
      throw new InvalidArgumentError({
        parameterName: 'source',
        constraint: '`behindOf()` requires a source that exposes a SimpleGit handle — pass a TempGitRepo or a raw SimpleGit instance',
      })
    }
    this.checks.push(async () => {
      let out: string
      try {
        out = await git.raw(['rev-list', '--count', `HEAD..${ref}`])
      } catch (err) {
        throw new InvalidArgumentError({
          parameterName: 'ref',
          constraint: `"${ref}" is not a valid ref — ${err instanceof Error ? err.message.trim() : String(err)}`,
        })
      }
      const actual = parseInt(out.trim(), 10)
      if (actual !== n) {
        fail('behindOf', n, actual, `Expected HEAD to be ${n} commit(s) behind "${ref}", but found ${actual}.`)
      }
    })
    return this
  }

  /** Assert the stash has exactly `n` entries — or, with no argument, at least one. */
  hasStash(n?: number): this {
    this.checks.push((s) => {
      if (n === undefined) {
        if (s.stashes === 0) fail('hasStash', 'at least one stash', s.stashes, 'Expected a stash entry, but found none.')
      } else if (s.stashes !== n) {
        fail('hasStash', n, s.stashes, `Expected ${n} stash entr(ies), but found ${s.stashes}.`)
      }
    })
    return this
  }

  /** Run all queued checks against a fresh snapshot. Resolves to that snapshot. */
  private async run(): Promise<RepoSnapshot> {
    const snap = await readSnapshot(this.source)
    for (const check of this.checks) await check(snap)
    return snap
  }

  then<TResult1 = RepoSnapshot, TResult2 = never>(
    onfulfilled?: ((value: RepoSnapshot) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected)
  }
}

/**
 * Begin a fluent assertion chain over a repo. Accepts a `TempGitRepo`
 * (or anything with a `snapshot()` method) or a raw `simple-git`
 * instance.
 */
export function assertRepo(source: SnapshotSource): RepoAssertion {
  return new RepoAssertion(source)
}
