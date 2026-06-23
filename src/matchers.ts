/**
 * Custom `expect(...)` matchers for asserting git repo state, built on
 * top of the runner-agnostic {@link assertRepo} fluent API.
 *
 * Works with both Jest and Vitest — register once in your setup file:
 *
 *   // jest.setup.ts / vitest.setup.ts
 *   import { expect } from 'vitest'          // (Jest provides expect globally)
 *   import { matchers } from '@gfargo/git-scenarios/matchers'
 *   expect.extend(matchers)
 *
 * Then assert directly against a `TempGitRepo` (or a `simple-git`
 * instance):
 *
 *   const repo = await spinUpScenario('mid-merge-conflict')
 *   await expect(repo).toBeMidMerge()
 *   await expect(repo).toHaveConflictIn('src/x.ts')
 *
 * Every matcher is async — always `await` (or `return`) the
 * expectation. `.not` works as usual.
 *
 * The other three adapters (node:test, Mocha, AVA) have no
 * `expect.extend`; use {@link assertRepo} directly there — same checks,
 * same messages.
 */

import { assertRepo, type RepoAssertion, type SnapshotSource } from './assert'
import { RepoAssertionError } from './errors'
import type { InProgressOperation } from './snapshot'

/** The minimal matcher-result shape Jest and Vitest both accept. */
type MatcherResult = { pass: boolean; message: () => string }

/**
 * Run a fluent assertion and translate it into a matcher result.
 * A passing assertion → `pass: true` (with a message for the `.not`
 * case); a `RepoAssertionError` → `pass: false` carrying its message.
 */
async function evaluate(
  received: unknown,
  apply: (a: RepoAssertion) => RepoAssertion,
  negatedDescription: string,
): Promise<MatcherResult> {
  try {
    await apply(assertRepo(received as SnapshotSource))
    return { pass: true, message: () => `Expected repo not ${negatedDescription}.` }
  } catch (error) {
    if (error instanceof RepoAssertionError) {
      return { pass: false, message: () => error.message }
    }
    throw error
  }
}

/**
 * The matcher set. Pass to `expect.extend(matchers)` in a Jest or
 * Vitest setup file.
 */
export const matchers = {
  toBeOnBranch(received: unknown, name: string) {
    return evaluate(received, (a) => a.onBranch(name), `to be on branch "${name}"`)
  },
  toBeDetached(received: unknown) {
    return evaluate(received, (a) => a.detached(), 'to have a detached HEAD')
  },
  toHaveBranch(received: unknown, name: string) {
    return evaluate(received, (a) => a.hasBranch(name), `to have branch "${name}"`)
  },
  toHaveCleanWorktree(received: unknown) {
    return evaluate(received, (a) => a.cleanWorktree(), 'to have a clean worktree')
  },
  toHaveDirtyWorktree(received: unknown) {
    return evaluate(received, (a) => a.dirtyWorktree(), 'to have a dirty worktree')
  },
  toHaveStagedFile(received: unknown, path?: string) {
    return evaluate(received, (a) => a.hasStaged(path), path ? `to have "${path}" staged` : 'to have staged changes')
  },
  toHaveModifiedFile(received: unknown, path?: string) {
    return evaluate(received, (a) => a.hasModified(path), path ? `to have "${path}" modified` : 'to have unstaged modifications')
  },
  toHaveUntrackedFile(received: unknown, path?: string) {
    return evaluate(received, (a) => a.hasUntracked(path), path ? `to have "${path}" untracked` : 'to have untracked files')
  },
  toBeAheadBy(received: unknown, n: number) {
    return evaluate(received, (a) => a.ahead(n), `to be ${n} ahead of upstream`)
  },
  toBeBehindBy(received: unknown, n: number) {
    return evaluate(received, (a) => a.behind(n), `to be ${n} behind upstream`)
  },
  toBeInSyncWithUpstream(received: unknown) {
    return evaluate(received, (a) => a.inSyncWithUpstream(), 'to be in sync with upstream')
  },
  toHaveCommitCount(received: unknown, n: number) {
    return evaluate(received, (a) => a.commitCount(n), `to have ${n} commits`)
  },
  toBeMidOperation(received: unknown, op: InProgressOperation) {
    return evaluate(received, (a) => a.inOperation(op), `to be mid-${op ?? 'operation'}`)
  },
  toBeMidMerge(received: unknown) {
    return evaluate(received, (a) => a.inOperation('merge'), 'to be mid-merge')
  },
  toBeMidRebase(received: unknown) {
    return evaluate(received, (a) => a.inOperation('rebase'), 'to be mid-rebase')
  },
  toBeMidCherryPick(received: unknown) {
    return evaluate(received, (a) => a.inOperation('cherry-pick'), 'to be mid-cherry-pick')
  },
  toBeMidRevert(received: unknown) {
    return evaluate(received, (a) => a.inOperation('revert'), 'to be mid-revert')
  },
  toBeMidBisect(received: unknown) {
    return evaluate(received, (a) => a.inOperation('bisect'), 'to be mid-bisect')
  },
  toHaveConflictIn(received: unknown, path?: string) {
    return evaluate(received, (a) => a.hasConflict(path), path ? `to have a conflict in "${path}"` : 'to have conflicts')
  },
  toHaveNoConflicts(received: unknown) {
    return evaluate(received, (a) => a.noConflicts(), 'to have no conflicts')
  },
  toHaveStash(received: unknown, n?: number) {
    return evaluate(received, (a) => a.hasStash(n), n === undefined ? 'to have a stash' : `to have ${n} stash entries`)
  },
}

/**
 * Shared matcher signatures. Used to augment Jest's `jest.Matchers`
 * below, and **exported** so Vitest users can augment their own
 * `Assertion` interface in a setup/`.d.ts` file without this package
 * taking a dependency on `vitest`:
 *
 *   import type { GitScenariosMatchers } from '@gfargo/git-scenarios/matchers'
 *   declare module 'vitest' {
 *     interface Assertion<T = unknown> extends GitScenariosMatchers<Promise<void>> {}
 *   }
 *
 * `R` is the per-runner return type (`Promise<void>` for the async
 * matchers under Vitest; Jest infers it).
 */
export interface GitScenariosMatchers<R> {
  toBeOnBranch(name: string): R
  toBeDetached(): R
  toHaveBranch(name: string): R
  toHaveCleanWorktree(): R
  toHaveDirtyWorktree(): R
  toHaveStagedFile(path?: string): R
  toHaveModifiedFile(path?: string): R
  toHaveUntrackedFile(path?: string): R
  toBeAheadBy(n: number): R
  toBeBehindBy(n: number): R
  toBeInSyncWithUpstream(): R
  toHaveCommitCount(n: number): R
  toBeMidOperation(op: InProgressOperation): R
  toBeMidMerge(): R
  toBeMidRebase(): R
  toBeMidCherryPick(): R
  toBeMidRevert(): R
  toBeMidBisect(): R
  toHaveConflictIn(path?: string): R
  toHaveNoConflicts(): R
  toHaveStash(n?: number): R
}

// Jest: augment the global `jest.Matchers` interface. Safe ambient
// declaration — present whenever @types/jest is installed. Vitest users
// augment `vitest`'s `Assertion` themselves using the exported
// `GitScenariosMatchers` interface (see its docblock) — that keeps this
// package free of a `vitest` dependency.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> extends GitScenariosMatchers<R> {}
  }
}
