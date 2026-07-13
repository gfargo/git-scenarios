/**
 * XY → bucket derivation logic.
 *
 * Maps git porcelain XY status codes to the bucket arrays that
 * simple-git uses in its StatusResult. This is the single source
 * of truth for how files get categorized in mock StatusResults.
 *
 * @module
 */

import type { XCode, YCode, BucketPlacement } from './types'

export type { XCode, YCode, BucketPlacement } from './types'

/**
 * Map an XY porcelain code pair to the simple-git bucket arrays the
 * file should appear in. This replicates simple-git's internal
 * StatusSummary.parse() logic.
 *
 * @param x - Index (staged) status character
 * @param y - Working tree status character
 * @returns Which bucket arrays the file belongs to
 */
export function mapXYToBuckets(x: XCode, y: YCode): BucketPlacement {
  // Conflicts: UU, AA, DD, AU, UA, DU, UD
  if (x === 'U' || y === 'U' || (x === 'A' && y === 'A') || (x === 'D' && y === 'D')) {
    return {
      staged: false,
      modified: false,
      not_added: false,
      conflicted: true,
      created: false,
      deleted: false,
      renamed: false,
    }
  }

  // Untracked
  if (x === '?' && y === '?') {
    return {
      staged: false,
      modified: false,
      not_added: true,
      conflicted: false,
      created: false,
      deleted: false,
      renamed: false,
    }
  }

  const placement: BucketPlacement = {
    staged: false,
    modified: false,
    not_added: false,
    conflicted: false,
    created: false,
    deleted: false,
    renamed: false,
  }

  // Index (X) analysis — staged changes
  if (x === 'M') placement.staged = true
  if (x === 'A') { placement.staged = true; placement.created = true }
  if (x === 'D') { placement.staged = true; placement.deleted = true }
  if (x === 'R') { placement.staged = true; placement.renamed = true }
  if (x === 'C') { placement.staged = true; placement.created = true }

  // Working tree (Y) analysis — unstaged changes.
  // A pure worktree delete (` D`, no staged change) lands in `deleted`,
  // matching simple-git's StatusSummary parser. Combined with a staged
  // change (e.g. `AD`/`MD`) it's still reported as a worktree modification.
  if (y === 'M') placement.modified = true
  if (y === 'D') {
    if (x === ' ') {
      placement.deleted = true
    } else {
      placement.modified = true
    }
  }

  return placement
}

/**
 * Derive the correct X and Y codes from a BucketPlacement.
 * Inverse of mapXYToBuckets — used by builders and the pretty-printer.
 *
 * @param placement - The bucket membership flags
 * @returns The corresponding X and Y porcelain codes
 */
export function bucketsToXY(placement: BucketPlacement): { x: XCode; y: YCode } {
  // Conflicted — map to UU (canonical conflict representation)
  if (placement.conflicted) {
    return { x: 'U', y: 'U' }
  }

  // Untracked
  if (placement.not_added) {
    return { x: '?', y: '?' }
  }

  // Derive X code from staged/created/deleted/renamed. A `deleted` flag
  // only belongs in the index column when the delete is staged — an
  // unstaged-only delete (`deleted` without `staged`) belongs in Y instead.
  let x: XCode = ' '
  if (placement.renamed) {
    x = 'R'
  } else if (placement.staged && placement.deleted) {
    x = 'D'
  } else if (placement.created) {
    x = 'A'
  } else if (placement.staged) {
    x = 'M'
  }

  // Derive Y code from modified/deleted
  let y: YCode = ' '
  if (placement.modified) {
    // If there's no staged change, use 'M' for worktree modification.
    // If the file is staged+deleted (AD case), use 'D' for worktree delete.
    // Otherwise use 'M' for worktree modification.
    y = 'M'
  } else if (placement.deleted && !placement.staged) {
    y = 'D'
  }

  return { x, y }
}
