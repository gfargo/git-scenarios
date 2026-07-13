/**
 * Exhaustive tests for the XY → bucket mapping logic and its inverse.
 *
 * Covers every valid XY combination from the design doc's mapping table,
 * plus a round-trip property test using fast-check.
 */

import * as fc from 'fast-check'
import { mapXYToBuckets, bucketsToXY } from '../bucketMapping'
import type { XCode, YCode, BucketPlacement } from '../types'

/** Helper to create a "clean" placement (all false) */
function emptyPlacement(): BucketPlacement {
  return {
    staged: false,
    modified: false,
    not_added: false,
    conflicted: false,
    created: false,
    deleted: false,
    renamed: false,
  }
}

describe('mapXYToBuckets', () => {
  describe('untracked', () => {
    it('?? → not_added only', () => {
      const result = mapXYToBuckets('?', '?')
      expect(result).toEqual({
        ...emptyPlacement(),
        not_added: true,
      })
    })
  })

  describe('staged-only (Y is space)', () => {
    it('M_ → staged only', () => {
      const result = mapXYToBuckets('M', ' ')
      expect(result).toEqual({
        ...emptyPlacement(),
        staged: true,
      })
    })

    it('A_ → staged + created', () => {
      const result = mapXYToBuckets('A', ' ')
      expect(result).toEqual({
        ...emptyPlacement(),
        staged: true,
        created: true,
      })
    })

    it('D_ → staged + deleted', () => {
      const result = mapXYToBuckets('D', ' ')
      expect(result).toEqual({
        ...emptyPlacement(),
        staged: true,
        deleted: true,
      })
    })

    it('R_ → staged + renamed', () => {
      const result = mapXYToBuckets('R', ' ')
      expect(result).toEqual({
        ...emptyPlacement(),
        staged: true,
        renamed: true,
      })
    })

    it('C_ → staged + created', () => {
      const result = mapXYToBuckets('C', ' ')
      expect(result).toEqual({
        ...emptyPlacement(),
        staged: true,
        created: true,
      })
    })
  })

  describe('worktree-only (X is space)', () => {
    it('_M → modified only', () => {
      const result = mapXYToBuckets(' ', 'M')
      expect(result).toEqual({
        ...emptyPlacement(),
        modified: true,
      })
    })

    it('_D → deleted only (worktree delete, matches simple-git StatusSummary)', () => {
      const result = mapXYToBuckets(' ', 'D')
      expect(result).toEqual({
        ...emptyPlacement(),
        deleted: true,
      })
    })
  })

  describe('mixed (both X and Y indicate changes)', () => {
    it('MM → staged + modified', () => {
      const result = mapXYToBuckets('M', 'M')
      expect(result).toEqual({
        ...emptyPlacement(),
        staged: true,
        modified: true,
      })
    })

    it('AM → staged + modified + created', () => {
      const result = mapXYToBuckets('A', 'M')
      expect(result).toEqual({
        ...emptyPlacement(),
        staged: true,
        modified: true,
        created: true,
      })
    })

    it('AD → staged + modified + created (staged add, worktree delete)', () => {
      const result = mapXYToBuckets('A', 'D')
      expect(result).toEqual({
        ...emptyPlacement(),
        staged: true,
        modified: true,
        created: true,
      })
    })
  })

  describe('conflicts', () => {
    it('UU → conflicted only', () => {
      const result = mapXYToBuckets('U', 'U')
      expect(result).toEqual({
        ...emptyPlacement(),
        conflicted: true,
      })
    })

    it('AA → conflicted only', () => {
      const result = mapXYToBuckets('A', 'A')
      expect(result).toEqual({
        ...emptyPlacement(),
        conflicted: true,
      })
    })

    it('DD → conflicted only', () => {
      const result = mapXYToBuckets('D', 'D')
      expect(result).toEqual({
        ...emptyPlacement(),
        conflicted: true,
      })
    })

    it('AU → conflicted only', () => {
      const result = mapXYToBuckets('A', 'U')
      expect(result).toEqual({
        ...emptyPlacement(),
        conflicted: true,
      })
    })

    it('UA → conflicted only', () => {
      const result = mapXYToBuckets('U', 'A')
      expect(result).toEqual({
        ...emptyPlacement(),
        conflicted: true,
      })
    })

    it('DU → conflicted only', () => {
      const result = mapXYToBuckets('D', 'U')
      expect(result).toEqual({
        ...emptyPlacement(),
        conflicted: true,
      })
    })

    it('UD → conflicted only', () => {
      const result = mapXYToBuckets('U', 'D')
      expect(result).toEqual({
        ...emptyPlacement(),
        conflicted: true,
      })
    })
  })

  describe('edge cases', () => {
    it('space-space → all false (no changes)', () => {
      const result = mapXYToBuckets(' ', ' ')
      expect(result).toEqual(emptyPlacement())
    })

    it('MD → staged + modified (staged modification, worktree delete)', () => {
      const result = mapXYToBuckets('M', 'D')
      expect(result).toEqual({
        ...emptyPlacement(),
        staged: true,
        modified: true,
      })
    })
  })
})

describe('bucketsToXY', () => {
  it('conflicted → UU', () => {
    expect(bucketsToXY({ ...emptyPlacement(), conflicted: true })).toEqual({ x: 'U', y: 'U' })
  })

  it('not_added → ??', () => {
    expect(bucketsToXY({ ...emptyPlacement(), not_added: true })).toEqual({ x: '?', y: '?' })
  })

  it('staged only → M_', () => {
    expect(bucketsToXY({ ...emptyPlacement(), staged: true })).toEqual({ x: 'M', y: ' ' })
  })

  it('staged + created → A_', () => {
    expect(bucketsToXY({ ...emptyPlacement(), staged: true, created: true })).toEqual({ x: 'A', y: ' ' })
  })

  it('staged + deleted → D_', () => {
    expect(bucketsToXY({ ...emptyPlacement(), staged: true, deleted: true })).toEqual({ x: 'D', y: ' ' })
  })

  it('staged + renamed → R_', () => {
    expect(bucketsToXY({ ...emptyPlacement(), staged: true, renamed: true })).toEqual({ x: 'R', y: ' ' })
  })

  it('modified only → _M', () => {
    expect(bucketsToXY({ ...emptyPlacement(), modified: true })).toEqual({ x: ' ', y: 'M' })
  })

  it('staged + modified → MM', () => {
    expect(bucketsToXY({ ...emptyPlacement(), staged: true, modified: true })).toEqual({ x: 'M', y: 'M' })
  })

  it('staged + created + modified → AM', () => {
    expect(bucketsToXY({ ...emptyPlacement(), staged: true, created: true, modified: true })).toEqual({ x: 'A', y: 'M' })
  })

  it('all false → space-space', () => {
    expect(bucketsToXY(emptyPlacement())).toEqual({ x: ' ', y: ' ' })
  })
})

describe('Round-trip property: bucketsToXY(mapXYToBuckets(x, y)) === (x, y)', () => {
  /**
   * Valid XY pairs that have a unique round-trip mapping.
   * Some conflict codes (AA, DD, AU, UA, DU, UD) all collapse to
   * conflicted=true and round-trip back as UU (the canonical form).
   * We test round-trip on the canonical subset.
   *
   * **Validates: Requirements 3**
   */

  /**
   * Pairs that round-trip exactly (bijective mapping).
   * Some codes are aliases — they produce the same BucketPlacement
   * as another code, so the inverse canonicalizes to one representative.
   *
   * Aliases:
   * - C_ → same placement as A_ (both: staged + created)
   * - MD → same placement as MM (both: staged + modified)
   * - AD → same placement as AM (both: staged + created + modified)
   * - All conflict forms → same placement (conflicted: true), canonicalize to UU
   */
  const exactRoundTripPairs: Array<[XCode, YCode]> = [
    ['?', '?'],   // untracked
    ['M', ' '],   // staged modification
    ['A', ' '],   // staged add
    ['D', ' '],   // staged delete
    ['R', ' '],   // staged rename
    [' ', 'M'],   // worktree modification
    [' ', 'D'],   // worktree delete
    ['M', 'M'],   // staged + worktree modified
    ['A', 'M'],   // staged add + worktree modified
    ['U', 'U'],   // canonical conflict
    [' ', ' '],   // no changes
  ]

  it('round-trips exactly for canonical pairs', () => {
    for (const [x, y] of exactRoundTripPairs) {
      const placement = mapXYToBuckets(x, y)
      const result = bucketsToXY(placement)
      expect(result).toEqual({ x, y })
    }
  })

  it('C_ round-trips to A_ (same bucket placement — staged + created)', () => {
    const placement = mapXYToBuckets('C', ' ')
    const result = bucketsToXY(placement)
    expect(result).toEqual({ x: 'A', y: ' ' })
  })

  it('_D round-trips to _D exactly (worktree delete, distinct from _M)', () => {
    const placement = mapXYToBuckets(' ', 'D')
    expect(placement.deleted).toBe(true)
    expect(placement.modified).toBe(false)
    const result = bucketsToXY(placement)
    expect(result).toEqual({ x: ' ', y: 'D' })
  })

  it('MD round-trips to MM (both produce staged + modified)', () => {
    const placement = mapXYToBuckets('M', 'D')
    const result = bucketsToXY(placement)
    expect(result).toEqual({ x: 'M', y: 'M' })
  })

  it('AD round-trips to AM (both produce staged + created + modified)', () => {
    const placement = mapXYToBuckets('A', 'D')
    const result = bucketsToXY(placement)
    expect(result).toEqual({ x: 'A', y: 'M' })
  })

  it('all conflict variants map to conflicted and round-trip to UU', () => {
    const conflictPairs: Array<[XCode, YCode]> = [
      ['U', 'U'],
      ['A', 'A'],
      ['D', 'D'],
      ['A', 'U'],
      ['U', 'A'],
      ['D', 'U'],
      ['U', 'D'],
    ]

    for (const [x, y] of conflictPairs) {
      const placement = mapXYToBuckets(x, y)
      expect(placement.conflicted).toBe(true)
      const result = bucketsToXY(placement)
      // All conflicts canonicalize to UU
      expect(result).toEqual({ x: 'U', y: 'U' })
    }
  })

  /**
   * Property test: for any valid XY pair from the canonical set,
   * the round-trip through mapXYToBuckets → bucketsToXY produces
   * the original pair.
   *
   * **Validates: Requirements 3**
   */
  it('property: round-trip holds for all canonical XY pairs', () => {
    const xyPairArb = fc.constantFrom(...exactRoundTripPairs)

    fc.assert(
      fc.property(xyPairArb, ([x, y]) => {
        const placement = mapXYToBuckets(x, y)
        const result = bucketsToXY(placement)
        return result.x === x && result.y === y
      }),
      { numRuns: 200 },
    )
  })

  /**
   * Weaker round-trip property for ALL valid XY pairs (including aliases):
   * mapXYToBuckets(bucketsToXY(mapXYToBuckets(x, y))) === mapXYToBuckets(x, y)
   *
   * This ensures that even for aliased pairs, going through the inverse
   * and back produces the same bucket placement.
   *
   * **Validates: Requirements 3**
   */
  it('property: placement is stable through double round-trip for all valid pairs', () => {
    const allValidPairs: Array<[XCode, YCode]> = [
      ['?', '?'],
      ['M', ' '], ['A', ' '], ['D', ' '], ['R', ' '], ['C', ' '],
      [' ', 'M'], [' ', 'D'],
      ['M', 'M'], ['M', 'D'], ['A', 'M'], ['A', 'D'],
      ['U', 'U'], ['A', 'A'], ['D', 'D'], ['A', 'U'], ['U', 'A'], ['D', 'U'], ['U', 'D'],
      [' ', ' '],
    ]

    const xyPairArb = fc.constantFrom(...allValidPairs)

    fc.assert(
      fc.property(xyPairArb, ([x, y]) => {
        const placement = mapXYToBuckets(x, y)
        const { x: rx, y: ry } = bucketsToXY(placement)
        const roundTripPlacement = mapXYToBuckets(rx, ry)
        // The placements must be identical (stability property)
        return JSON.stringify(placement) === JSON.stringify(roundTripPlacement)
      }),
      { numRuns: 500 },
    )
  })
})
