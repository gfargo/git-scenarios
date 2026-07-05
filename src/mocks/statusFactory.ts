/**
 * StatusResult mock factory.
 *
 * Provides two APIs for constructing properly-typed StatusResult objects
 * matching simple-git's shape without touching disk:
 *
 * 1. `mockStatusResult(options?)` — functional factory for simple cases
 * 2. `mockStatus()` — fluent builder for incremental construction
 *
 * @module
 */

import type { StatusResult, FileStatusResult } from 'simple-git'
import { bucketsToXY } from './bucketMapping'
import type { BucketPlacement } from './types'
import { DEFAULT_BRANCH } from './defaults'

/**
 * Options for the functional `mockStatusResult` factory.
 *
 * All fields are optional. When omitted, the factory returns a
 * clean status on the default branch with no file changes.
 */
export type MockStatusOptions = {
  current?: string
  tracking?: string | null
  ahead?: number
  behind?: number
  staged?: string[]
  modified?: string[]
  not_added?: string[]
  conflicted?: string[]
  created?: string[]
  deleted?: string[]
  renamed?: Array<{ from: string; to: string }>
  files?: FileStatusResult[]
  detached?: boolean
}

/**
 * Build a FileStatusResult entry from a path and its bucket placement.
 */
function buildFileEntry(path: string, placement: BucketPlacement): FileStatusResult {
  const { x, y } = bucketsToXY(placement)
  return {
    path,
    index: x,
    working_dir: y,
  } as FileStatusResult
}

/**
 * Build the files[] array by merging all bucket arrays. Files appearing
 * in multiple buckets produce a single FileStatusResult with the correct
 * X and Y codes derived via `bucketsToXY`.
 */
function deriveFiles(opts: {
  staged: string[]
  modified: string[]
  not_added: string[]
  conflicted: string[]
  created: string[]
  deleted: string[]
  renamed: Array<{ from: string; to: string }>
}): FileStatusResult[] {
  const pathMap = new Map<string, BucketPlacement>()

  const ensurePath = (path: string): BucketPlacement => {
    if (!pathMap.has(path)) {
      pathMap.set(path, {
        staged: false,
        modified: false,
        not_added: false,
        conflicted: false,
        created: false,
        deleted: false,
        renamed: false,
      })
    }
    return pathMap.get(path)!
  }

  for (const p of opts.staged) {
    ensurePath(p).staged = true
  }
  for (const p of opts.modified) {
    ensurePath(p).modified = true
  }
  for (const p of opts.not_added) {
    ensurePath(p).not_added = true
  }
  for (const p of opts.conflicted) {
    ensurePath(p).conflicted = true
  }
  for (const p of opts.created) {
    const placement = ensurePath(p)
    placement.staged = true
    placement.created = true
  }
  for (const p of opts.deleted) {
    const placement = ensurePath(p)
    placement.staged = true
    placement.deleted = true
  }
  for (const r of opts.renamed) {
    const placement = ensurePath(r.to)
    placement.staged = true
    placement.renamed = true
  }

  return Array.from(pathMap.entries()).map(([path, placement]) =>
    buildFileEntry(path, placement)
  )
}

/**
 * Create a complete StatusResult matching simple-git's shape.
 *
 * When called with no arguments, returns a clean status on the default
 * branch (`main`). Pass partial overrides to specify only the fields
 * you care about — the rest default to clean/empty.
 *
 * The `isClean()` method is a real function (not a boolean property)
 * that returns `true` only when all change arrays are empty.
 *
 * @param options - Partial overrides for the status result
 * @returns A fully populated StatusResult object
 */
export function mockStatusResult(options?: MockStatusOptions): StatusResult {
  const opts = options ?? {}

  const staged = opts.staged ?? []
  const modified = opts.modified ?? []
  const not_added = opts.not_added ?? []
  const conflicted = opts.conflicted ?? []
  const created = opts.created ?? []
  const deleted = opts.deleted ?? []
  const renamed = opts.renamed ?? []

  // Build files array from bucket arrays if not explicitly provided
  const files: FileStatusResult[] = opts.files
    ? opts.files
    : deriveFiles({ staged, modified, not_added, conflicted, created, deleted, renamed })

  const result: StatusResult = {
    not_added,
    conflicted,
    created,
    deleted,
    renamed,
    modified,
    staged,
    files,
    ahead: opts.ahead ?? 0,
    behind: opts.behind ?? 0,
    current: opts.current ?? DEFAULT_BRANCH,
    tracking: opts.tracking !== undefined ? opts.tracking : null,
    detached: opts.detached ?? false,
    isClean() {
      return (
        this.staged.length === 0 &&
        this.modified.length === 0 &&
        this.not_added.length === 0 &&
        this.conflicted.length === 0 &&
        this.created.length === 0 &&
        this.deleted.length === 0 &&
        this.renamed.length === 0
      )
    },
  }

  return result
}

/**
 * Internal state for a path being tracked by the StatusBuilder.
 * Accumulates bucket membership as chained calls add the path
 * to different categories.
 */
interface PathState {
  placement: BucketPlacement
  /** For renamed files, the original path before rename */
  from?: string
}

/**
 * Fluent builder for StatusResult.
 *
 * Allows incremental construction of a StatusResult via chainable
 * method calls. Paths that appear in multiple bucket calls are merged
 * into a single `FileStatusResult` with the correct XY codes.
 *
 * Usage:
 * ```ts
 * const result = mockStatus()
 *   .onBranch('feature/auth')
 *   .staged('src/auth.ts', 'src/login.ts')
 *   .modified('src/utils.ts')
 *   .untracked('scratch.md')
 *   .ahead(2)
 *   .build()
 * ```
 */
export class StatusBuilder {
  private _current: string = DEFAULT_BRANCH
  private _tracking: string | null = null
  private _detached = false
  private _ahead = 0
  private _behind = 0
  private _paths = new Map<string, PathState>()

  private ensurePath(path: string): PathState {
    if (!this._paths.has(path)) {
      this._paths.set(path, {
        placement: {
          staged: false,
          modified: false,
          not_added: false,
          conflicted: false,
          created: false,
          deleted: false,
          renamed: false,
        },
      })
    }
    return this._paths.get(path)!
  }

  /** Set the current branch name */
  onBranch(name: string): this {
    this._current = name
    this._tracking = `origin/${name}`
    this._detached = false
    return this
  }

  /** Set the upstream tracking reference */
  tracking(upstream: string): this {
    this._tracking = upstream
    return this
  }

  /** Mark HEAD as detached at the given SHA */
  detached(sha: string): this {
    this._current = sha
    this._detached = true
    this._tracking = null
    return this
  }

  /** Set how many commits HEAD is ahead of upstream */
  ahead(count: number): this {
    this._ahead = count
    return this
  }

  /** Set how many commits HEAD is behind upstream */
  behind(count: number): this {
    this._behind = count
    return this
  }

  /** Add paths to the staged (index modified) bucket */
  staged(...paths: string[]): this {
    for (const p of paths) {
      this.ensurePath(p).placement.staged = true
    }
    return this
  }

  /** Add paths to the modified (working tree) bucket */
  modified(...paths: string[]): this {
    for (const p of paths) {
      this.ensurePath(p).placement.modified = true
    }
    return this
  }

  /** Add paths to the untracked (not_added) bucket */
  untracked(...paths: string[]): this {
    for (const p of paths) {
      this.ensurePath(p).placement.not_added = true
    }
    return this
  }

  /** Add paths to the conflicted bucket */
  conflicted(...paths: string[]): this {
    for (const p of paths) {
      this.ensurePath(p).placement.conflicted = true
    }
    return this
  }

  /** Add paths to the created (staged + new file) bucket */
  created(...paths: string[]): this {
    for (const p of paths) {
      const state = this.ensurePath(p)
      state.placement.staged = true
      state.placement.created = true
    }
    return this
  }

  /** Add paths to the deleted (staged + removed) bucket */
  deleted(...paths: string[]): this {
    for (const p of paths) {
      const state = this.ensurePath(p)
      state.placement.staged = true
      state.placement.deleted = true
    }
    return this
  }

  /** Add a renamed file entry (staged + renamed) */
  renamed(from: string, to: string): this {
    const state = this.ensurePath(to)
    state.placement.staged = true
    state.placement.renamed = true
    state.from = from
    return this
  }

  /**
   * Produce the final StatusResult with correct files[], bucket arrays,
   * and a working isClean() method.
   */
  build(): StatusResult {
    const staged: string[] = []
    const modified: string[] = []
    const not_added: string[] = []
    const conflicted: string[] = []
    const created: string[] = []
    const deleted: string[] = []
    const renamed: Array<{ from: string; to: string }> = []
    const files: FileStatusResult[] = []

    this._paths.forEach((state, path) => {
      const { placement } = state
      const { x, y } = bucketsToXY(placement)

      files.push({
        path,
        index: x,
        working_dir: y,
      } as FileStatusResult)

      // Populate bucket arrays based on placement flags
      if (placement.conflicted) {
        conflicted.push(path)
      } else if (placement.not_added) {
        not_added.push(path)
      } else {
        if (placement.staged) staged.push(path)
        if (placement.modified) modified.push(path)
        if (placement.created) created.push(path)
        if (placement.deleted) deleted.push(path)
        if (placement.renamed && state.from) {
          renamed.push({ from: state.from, to: path })
        }
      }
    })

    const result: StatusResult = {
      not_added,
      conflicted,
      created,
      deleted,
      renamed,
      modified,
      staged,
      files,
      ahead: this._ahead,
      behind: this._behind,
      current: this._current,
      tracking: this._tracking,
      detached: this._detached,
      isClean() {
        return (
          this.staged.length === 0 &&
          this.modified.length === 0 &&
          this.not_added.length === 0 &&
          this.conflicted.length === 0 &&
          this.created.length === 0 &&
          this.deleted.length === 0 &&
          this.renamed.length === 0
        )
      },
    }

    return result
  }
}

/**
 * Create a new StatusBuilder for fluent StatusResult construction.
 *
 * @returns A fresh StatusBuilder instance
 */
export function mockStatus(): StatusBuilder {
  return new StatusBuilder()
}
