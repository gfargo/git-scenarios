import {
    mockBranchSummary,
    mockBranches
} from '../branchFactory'
import { deterministicHash } from '../defaults'

describe('mockBranchSummary', () => {
  describe('defaults', () => {
    it('returns a BranchSummary with main as current branch', () => {
      const result = mockBranchSummary()
      expect(result.current).toBe('main')
    })

    it('has detached set to false by default', () => {
      const result = mockBranchSummary()
      expect(result.detached).toBe(false)
    })

    it('includes main in all array', () => {
      const result = mockBranchSummary()
      expect(result.all).toEqual(['main'])
    })

    it('includes main in branches record with current: true', () => {
      const result = mockBranchSummary()
      expect(result.branches['main']).toBeDefined()
      expect(result.branches['main'].current).toBe(true)
      expect(result.branches['main'].name).toBe('main')
    })

    it('uses deterministicHash(0) for main commit', () => {
      const result = mockBranchSummary()
      expect(result.branches['main'].commit).toBe(deterministicHash(0))
    })
  })

  describe('branch list population', () => {
    it('populates branches from string array', () => {
      const result = mockBranchSummary({
        branches: ['main', 'develop', 'feature/login'],
      })
      expect(result.all).toEqual(['main', 'develop', 'feature/login'])
      expect(Object.keys(result.branches)).toEqual(['main', 'develop', 'feature/login'])
    })

    it('populates branches from object array with custom commits', () => {
      const result = mockBranchSummary({
        branches: [
          { name: 'main', commit: 'abc1234' },
          { name: 'develop', commit: 'def5678' },
        ],
      })
      expect(result.branches['main'].commit).toBe('abc1234')
      expect(result.branches['develop'].commit).toBe('def5678')
    })

    it('assigns sequential deterministic hashes by index', () => {
      const result = mockBranchSummary({
        branches: ['main', 'develop', 'feature'],
      })
      expect(result.branches['main'].commit).toBe(deterministicHash(0))
      expect(result.branches['develop'].commit).toBe(deterministicHash(1))
      expect(result.branches['feature'].commit).toBe(deterministicHash(2))
    })

    it('marks only the current branch as current: true', () => {
      const result = mockBranchSummary({
        current: 'develop',
        branches: ['main', 'develop', 'feature'],
      })
      expect(result.branches['main'].current).toBe(false)
      expect(result.branches['develop'].current).toBe(true)
      expect(result.branches['feature'].current).toBe(false)
    })

    it('populates label from object entries', () => {
      const result = mockBranchSummary({
        branches: [{ name: 'main', label: 'origin/main' }],
      })
      expect(result.branches['main'].label).toBe('origin/main')
    })

    it('defaults label to empty string', () => {
      const result = mockBranchSummary({ branches: ['main'] })
      expect(result.branches['main'].label).toBe('')
    })

    it('sets linkedWorkTree to false', () => {
      const result = mockBranchSummary({ branches: ['main'] })
      expect(result.branches['main'].linkedWorkTree).toBe(false)
    })
  })

  describe('all/branches invariant', () => {
    it('all array contains exactly the keys in branches record', () => {
      const result = mockBranchSummary({
        branches: ['main', 'develop', 'feature/x', 'hotfix/y'],
      })
      const branchKeys = Object.keys(result.branches)
      expect(result.all).toEqual(branchKeys)
      expect(result.all.length).toBe(branchKeys.length)
    })

    it('invariant holds with default options', () => {
      const result = mockBranchSummary()
      expect(result.all).toEqual(Object.keys(result.branches))
    })

    it('invariant holds in detached mode', () => {
      const result = mockBranchSummary({
        detached: true,
        current: 'abc123',
        branches: ['main', 'develop'],
      })
      expect(result.all).toEqual(Object.keys(result.branches))
    })
  })

  describe('detached mode', () => {
    it('sets detached to true', () => {
      const result = mockBranchSummary({
        detached: true,
        current: 'abc1234',
      })
      expect(result.detached).toBe(true)
    })

    it('sets current to the provided HEAD ref', () => {
      const result = mockBranchSummary({
        detached: true,
        current: 'abc1234567890',
      })
      expect(result.current).toBe('abc1234567890')
    })

    it('does not mark any branch as current when detached', () => {
      const result = mockBranchSummary({
        detached: true,
        current: 'abc1234',
        branches: ['main', 'develop'],
      })
      expect(result.branches['main'].current).toBe(false)
      expect(result.branches['develop'].current).toBe(false)
    })
  })
})

describe('BranchBuilder', () => {
  describe('builder equivalence', () => {
    it('produces same default as mockBranchSummary() with no options', () => {
      const fromFactory = mockBranchSummary()
      const fromBuilder = mockBranches().build()
      expect(fromBuilder).toEqual(fromFactory)
    })

    it('produces same result as mockBranchSummary with branches', () => {
      const fromFactory = mockBranchSummary({
        current: 'develop',
        branches: ['main', 'develop'],
      })
      const fromBuilder = mockBranches()
        .branch('main')
        .branch('develop')
        .current('develop')
        .build()
      expect(fromBuilder).toEqual(fromFactory)
    })

    it('produces same detached result as mockBranchSummary', () => {
      const ref = 'deadbeef1234567890abcdef1234567890abcdef'
      const fromFactory = mockBranchSummary({
        detached: true,
        current: ref,
        branches: ['main'],
      })
      const fromBuilder = mockBranches()
        .branch('main')
        .detached(ref)
        .build()
      expect(fromBuilder).toEqual(fromFactory)
    })
  })

  describe('branch method', () => {
    it('adds branches in order', () => {
      const result = mockBranches()
        .branch('main')
        .branch('develop')
        .branch('feature')
        .build()
      expect(result.all).toEqual(['main', 'develop', 'feature'])
    })

    it('accepts commit override', () => {
      const result = mockBranches()
        .branch('main', { commit: 'custom-hash' })
        .build()
      expect(result.branches['main'].commit).toBe('custom-hash')
    })

    it('accepts label override', () => {
      const result = mockBranches()
        .branch('main', { label: 'origin/main' })
        .build()
      expect(result.branches['main'].label).toBe('origin/main')
    })

    it('accepts current option on branch', () => {
      const result = mockBranches()
        .branch('main')
        .branch('develop', { current: true })
        .build()
      expect(result.current).toBe('develop')
      expect(result.branches['develop'].current).toBe(true)
      expect(result.branches['main'].current).toBe(false)
    })
  })

  describe('current method', () => {
    it('sets the current branch', () => {
      const result = mockBranches()
        .branch('main')
        .branch('develop')
        .current('develop')
        .build()
      expect(result.current).toBe('develop')
      expect(result.branches['develop'].current).toBe(true)
    })

    it('defaults to main when no current is set', () => {
      const result = mockBranches()
        .branch('main')
        .branch('develop')
        .build()
      expect(result.current).toBe('main')
      expect(result.branches['main'].current).toBe(true)
    })
  })

  describe('detached method', () => {
    it('sets detached to true with the given ref', () => {
      const result = mockBranches()
        .branch('main')
        .detached('abc123')
        .build()
      expect(result.detached).toBe(true)
      expect(result.current).toBe('abc123')
    })

    it('marks no branch as current when detached', () => {
      const result = mockBranches()
        .branch('main')
        .branch('develop')
        .detached('abc123')
        .build()
      expect(result.branches['main'].current).toBe(false)
      expect(result.branches['develop'].current).toBe(false)
    })
  })

  describe('all/branches invariant via builder', () => {
    it('all array matches branches record keys', () => {
      const result = mockBranches()
        .branch('main')
        .branch('develop')
        .branch('feature/auth')
        .build()
      expect(result.all).toEqual(Object.keys(result.branches))
    })
  })
})
