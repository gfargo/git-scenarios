/**
 * Property-based tests for mock factory invariants.
 *
 * Uses fast-check to verify correctness properties hold across
 * randomly generated inputs for the mock factory layer.
 */

import * as fc from 'fast-check'
import { mapXYToBuckets, bucketsToXY } from '../mocks/bucketMapping'
import { mockStatus, mockStatusResult } from '../mocks/statusFactory'
import { mockLogResult } from '../mocks/logFactory'
import { mockBranchSummary } from '../mocks/branchFactory'
import type { XCode, YCode } from '../mocks/types'

/**
 * Canonical XY pairs that round-trip exactly through
 * mapXYToBuckets → bucketsToXY. Aliases (C_, _D, MD, AD, non-UU
 * conflicts) canonicalize to a different representative, so they
 * are excluded from strict round-trip equality.
 */
const CANONICAL_XY_PAIRS: Array<[XCode, YCode]> = [
  ['?', '?'],   // untracked
  ['M', ' '],   // staged modification
  ['A', ' '],   // staged add
  ['D', ' '],   // staged delete
  ['R', ' '],   // staged rename
  [' ', 'M'],   // worktree modification
  ['M', 'M'],   // staged + worktree modified
  ['A', 'M'],   // staged add + worktree modified
  ['U', 'U'],   // canonical conflict
  [' ', ' '],   // no changes
]

/**
 * Arbitrary for safe file path strings — alphanumeric with slashes,
 * representing realistic file paths in a git repository.
 */
const safePathArb = fc
  .array(
    fc.array(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
      { minLength: 1, maxLength: 8 },
    ).map((chars) => chars.join('')),
    { minLength: 1, maxLength: 3 },
  )
  .map((segments) => segments.join('/') + '.ts')

/**
 * Property 1: Bucket mapping round-trip
 *
 * For any canonical XY pair, `bucketsToXY(mapXYToBuckets(x, y))`
 * produces the original `(x, y)`.
 *
 * **Validates: Requirements 3**
 */
describe('Property 1: Bucket mapping round-trip', () => {
  it('bucketsToXY(mapXYToBuckets(x, y)) === (x, y) for canonical pairs', () => {
    const xyPairArb = fc.constantFrom(...CANONICAL_XY_PAIRS)

    fc.assert(
      fc.property(xyPairArb, ([x, y]) => {
        const placement = mapXYToBuckets(x, y)
        const result = bucketsToXY(placement)
        return result.x === x && result.y === y
      }),
      { numRuns: 500 },
    )
  }, 60_000)
})

/**
 * Property 2: Builder/functional equivalence
 *
 * For any array of path strings, `mockStatus().staged(...paths).build()`
 * is structurally identical to `mockStatusResult({ staged: paths })`.
 *
 * **Validates: Requirements 7, 2**
 */
describe('Property 2: Builder/functional equivalence', () => {
  it('builder and functional factory produce identical results for staged paths', () => {
    const pathsArb = fc.uniqueArray(safePathArb, { minLength: 0, maxLength: 10 })

    fc.assert(
      fc.property(pathsArb, (paths) => {
        const fromBuilder = mockStatus().staged(...paths).build()
        const fromFactory = mockStatusResult({ staged: paths })

        // Compare bucket arrays
        expect(fromBuilder.staged.sort()).toEqual(fromFactory.staged.sort())
        expect(fromBuilder.modified).toEqual(fromFactory.modified)
        expect(fromBuilder.not_added).toEqual(fromFactory.not_added)
        expect(fromBuilder.conflicted).toEqual(fromFactory.conflicted)
        expect(fromBuilder.created).toEqual(fromFactory.created)
        expect(fromBuilder.deleted).toEqual(fromFactory.deleted)
        expect(fromBuilder.renamed).toEqual(fromFactory.renamed)

        // Compare files array (sorted by path for stable comparison)
        const builderFiles = [...fromBuilder.files].sort((a, b) => a.path.localeCompare(b.path))
        const factoryFiles = [...fromFactory.files].sort((a, b) => a.path.localeCompare(b.path))
        expect(builderFiles).toEqual(factoryFiles)

        // Compare metadata
        expect(fromBuilder.current).toEqual(fromFactory.current)
        expect(fromBuilder.ahead).toEqual(fromFactory.ahead)
        expect(fromBuilder.behind).toEqual(fromFactory.behind)
      }),
      { numRuns: 100 },
    )
  }, 60_000)
})

/**
 * Property 3: isClean() invariant
 *
 * `isClean()` returns `true` if and only if all change arrays
 * (staged, modified, not_added, conflicted, created, deleted, renamed)
 * are empty.
 *
 * **Validates: Requirements 2**
 */
describe('Property 3: isClean() invariant', () => {
  it('isClean() is true iff all change arrays are empty', () => {
    // Generate random combinations of empty/non-empty arrays
    const optionalPaths = fc.option(
      fc.uniqueArray(safePathArb, { minLength: 1, maxLength: 3 }),
      { nil: undefined },
    )

    fc.assert(
      fc.property(
        optionalPaths,
        optionalPaths,
        optionalPaths,
        optionalPaths,
        optionalPaths,
        optionalPaths,
        (staged, modified, not_added, conflicted, created, deleted) => {
          const result = mockStatusResult({
            staged: staged ?? [],
            modified: modified ?? [],
            not_added: not_added ?? [],
            conflicted: conflicted ?? [],
            created: created ?? [],
            deleted: deleted ?? [],
          })

          const allEmpty =
            (staged ?? []).length === 0 &&
            (modified ?? []).length === 0 &&
            (not_added ?? []).length === 0 &&
            (conflicted ?? []).length === 0 &&
            (created ?? []).length === 0 &&
            (deleted ?? []).length === 0

          expect(result.isClean()).toBe(allEmpty)
        },
      ),
      { numRuns: 200 },
    )
  }, 60_000)
})

/**
 * Property 4: LogResult.total === LogResult.all.length
 *
 * For any mockLogResult, the `total` field always equals the
 * length of the `all` array.
 *
 * **Validates: Requirements 4**
 */
describe('Property 4: LogResult.total === LogResult.all.length', () => {
  it('total always equals all.length for count-based generation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (count) => {
          const log = mockLogResult({ count })
          expect(log.total).toBe(log.all.length)
          expect(log.total).toBe(count)
        },
      ),
      { numRuns: 200 },
    )
  }, 60_000)

  it('total always equals all.length for commits-based generation', () => {
    const commitsArb = fc.array(
      fc.record({
        message: fc.string({ minLength: 1, maxLength: 50 }),
      }),
      { minLength: 0, maxLength: 20 },
    )

    fc.assert(
      fc.property(commitsArb, (commits) => {
        const log = mockLogResult({ commits })
        expect(log.total).toBe(log.all.length)
        expect(log.total).toBe(commits.length)
      }),
      { numRuns: 100 },
    )
  }, 60_000)
})

/**
 * Property 5: BranchSummary.all contains exactly the keys of BranchSummary.branches
 *
 * For any mockBranchSummary, the `all` array contains exactly the
 * same set of names as the keys of the `branches` record.
 *
 * **Validates: Requirements 5**
 */
describe('Property 5: BranchSummary.all === Object.keys(branches)', () => {
  it('all contains exactly the keys of branches for arbitrary branch lists', () => {
    const branchNameArb = fc
      .array(
        fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
        { minLength: 1, maxLength: 12 },
      )
      .map((chars) => chars.join(''))

    const branchListArb = fc.uniqueArray(branchNameArb, { minLength: 1, maxLength: 10 })

    fc.assert(
      fc.property(branchListArb, (branchNames) => {
        const summary = mockBranchSummary({
          branches: branchNames,
          current: branchNames[0],
        })

        const allSorted = [...summary.all].sort()
        const keysSorted = Object.keys(summary.branches).sort()
        expect(allSorted).toEqual(keysSorted)
      }),
      { numRuns: 200 },
    )
  }, 60_000)
})
