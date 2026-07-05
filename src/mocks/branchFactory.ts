/**
 * BranchSummary mock factory.
 *
 * Provides `mockBranchSummary()` for constructing properly-typed
 * BranchSummary objects matching simple-git's shape, and a fluent
 * `BranchBuilder` via `mockBranches()`.
 *
 * @module
 */

import type { BranchSummary, BranchSummaryBranch } from 'simple-git'
import { deterministicHash, DEFAULT_BRANCH } from './defaults'

/**
 * Options for the functional `mockBranchSummary` factory.
 *
 * All fields are optional. When omitted, the factory returns a
 * summary with a single branch (`main`) marked as current.
 */
export type MockBranchOptions = {
  /** Name of the current branch (defaults to `'main'`). */
  current?: string
  /** List of branches to include. Strings use defaults; objects allow overrides. */
  branches?: Array<string | { name: string; commit?: string; label?: string }>
  /** Whether HEAD is detached. When true, `current` should be a commit ref. */
  detached?: boolean
}

/**
 * Create a BranchSummaryBranch entry with deterministic defaults.
 */
function createBranchEntry(
  name: string,
  index: number,
  isCurrent: boolean,
  options?: { commit?: string; label?: string }
): BranchSummaryBranch {
  return {
    current: isCurrent,
    name,
    commit: options?.commit ?? deterministicHash(index),
    label: options?.label ?? '',
    linkedWorkTree: false,
  }
}

/**
 * Create a complete BranchSummary matching simple-git's shape.
 *
 * When called with no arguments, returns a summary with a single
 * `main` branch marked as current and `detached: false`.
 *
 * The `all` array and `branches` record are always kept in sync —
 * `all` contains exactly the keys present in `branches`.
 *
 * @param options - Partial overrides for the branch summary
 * @returns A fully populated BranchSummary object
 */
export function mockBranchSummary(options?: MockBranchOptions): BranchSummary {
  const opts = options ?? {}
  const detached = opts.detached ?? false
  const currentName = opts.current ?? DEFAULT_BRANCH

  const branches: Record<string, BranchSummaryBranch> = {}
  const all: string[] = []

  if (opts.branches && opts.branches.length > 0) {
    opts.branches.forEach((entry, index) => {
      const name = typeof entry === 'string' ? entry : entry.name
      const commit = typeof entry === 'string' ? undefined : entry.commit
      const label = typeof entry === 'string' ? undefined : entry.label
      const isCurrent = !detached && name === currentName

      branches[name] = createBranchEntry(name, index, isCurrent, { commit, label })
      all.push(name)
    })
  } else {
    // Default: single 'main' branch
    const name = detached ? DEFAULT_BRANCH : currentName
    branches[name] = createBranchEntry(name, 0, !detached)
    all.push(name)
  }

  return {
    all,
    branches,
    current: currentName,
    detached,
  }
}

/**
 * Fluent builder for BranchSummary objects.
 *
 * Usage:
 *   const summary = mockBranches()
 *     .branch('main')
 *     .branch('feature/login')
 *     .current('feature/login')
 *     .build()
 */
export class BranchBuilder {
  private _branches: Array<{
    name: string
    commit?: string
    label?: string
    current?: boolean
  }> = []
  private _current: string | null = null
  private _detached = false
  private _detachedRef: string | null = null

  /**
   * Add a branch to the summary.
   *
   * @param name - Branch name
   * @param options - Optional commit hash, label, and current flag
   */
  branch(name: string, options?: { commit?: string; label?: string; current?: boolean }): this {
    this._branches.push({ name, ...options })
    if (options?.current) {
      this._current = name
    }
    return this
  }

  /**
   * Set which branch is the current (checked-out) branch.
   *
   * @param name - Branch name to mark as current
   */
  current(name: string): this {
    this._current = name
    this._detached = false
    this._detachedRef = null
    return this
  }

  /**
   * Set HEAD to detached state at the given ref.
   *
   * @param ref - The commit ref that HEAD is detached at
   */
  detached(ref: string): this {
    this._detached = true
    this._detachedRef = ref
    this._current = null
    return this
  }

  /**
   * Build the final BranchSummary object.
   *
   * If no branches have been added, a default `main` branch is created.
   * The `all` array and `branches` record are guaranteed to be in sync.
   */
  build(): BranchSummary {
    const branches: Record<string, BranchSummaryBranch> = {}
    const all: string[] = []

    const currentName = this._detached
      ? (this._detachedRef ?? '')
      : (this._current ?? DEFAULT_BRANCH)

    if (this._branches.length === 0) {
      // Default: single 'main' branch
      branches[DEFAULT_BRANCH] = createBranchEntry(DEFAULT_BRANCH, 0, !this._detached)
      all.push(DEFAULT_BRANCH)
    } else {
      this._branches.forEach((entry, index) => {
        const isCurrent = !this._detached && entry.name === currentName
        branches[entry.name] = createBranchEntry(entry.name, index, isCurrent, {
          commit: entry.commit,
          label: entry.label,
        })
        all.push(entry.name)
      })
    }

    return {
      all,
      branches,
      current: currentName,
      detached: this._detached,
    }
  }
}

/**
 * Create a fluent BranchBuilder for constructing BranchSummary objects.
 *
 * Usage:
 *   const summary = mockBranches()
 *     .branch('main')
 *     .branch('develop', { commit: 'abc123...' })
 *     .current('develop')
 *     .build()
 *
 * @returns A new BranchBuilder instance
 */
export function mockBranches(): BranchBuilder {
  return new BranchBuilder()
}
