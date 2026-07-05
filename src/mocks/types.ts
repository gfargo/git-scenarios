/**
 * Internal type helpers for the mock factory layer.
 *
 * These types model the two-character XY status codes from
 * `git status --porcelain=v1` and the bucket arrays that
 * simple-git's StatusResult uses internally.
 */

/**
 * The X (index/staged) status character from git porcelain output.
 * Represents changes that have been staged for commit.
 */
export type XCode = ' ' | 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '?'

/**
 * The Y (working tree) status character from git porcelain output.
 * Represents changes in the working directory that have not been staged.
 * Includes 'A' for conflict cases (e.g., AA, UA).
 */
export type YCode = ' ' | 'M' | 'A' | 'D' | 'U' | '?'

/**
 * Describes which StatusResult bucket arrays a file should appear in.
 * Each boolean indicates membership in the corresponding array on
 * simple-git's StatusResult.
 */
export type BucketPlacement = {
  staged: boolean
  modified: boolean
  not_added: boolean
  conflicted: boolean
  created: boolean
  deleted: boolean
  renamed: boolean
}
