/**
 * Tests for the pretty-printer module.
 *
 * Covers format correctness for clean/dirty status, log entries,
 * and a round-trip property test verifying that printing a StatusResult
 * and parsing back through bucket mapping produces equivalent placements.
 *
 * **Validates: Requirements 10**
 */

import * as fc from 'fast-check'
import { printMockStatus, printMockLog } from '../prettyPrint'
import { mockStatusResult, mockStatus } from '../statusFactory'
import { mockLogResult, mockLog } from '../logFactory'
import { mapXYToBuckets } from '../bucketMapping'
import type { XCode, YCode } from '../types'

describe('printMockStatus', () => {
  describe('branch header', () => {
    it('formats branch with tracking as ## branch...tracking', () => {
      const status = mockStatusResult({
        current: 'main',
        tracking: 'origin/main',
      })
      const output = printMockStatus(status)
      const firstLine = output.split('\n')[0]
      expect(firstLine).toBe('## main...origin/main')
    })

    it('formats branch without tracking as ## branch', () => {
      const status = mockStatusResult({
        current: 'feature/auth',
        tracking: null,
      })
      const output = printMockStatus(status)
      const firstLine = output.split('\n')[0]
      expect(firstLine).toBe('## feature/auth')
    })

    it('formats detached HEAD as ## HEAD (no branch)', () => {
      const status = mockStatusResult({
        current: 'abc1234',
        detached: true,
        tracking: null,
      })
      const output = printMockStatus(status)
      const firstLine = output.split('\n')[0]
      expect(firstLine).toBe('## HEAD (no branch)')
    })
  })

  describe('clean status', () => {
    it('outputs only the branch header for a clean status', () => {
      const status = mockStatusResult()
      const output = printMockStatus(status)
      expect(output).toBe('## main')
    })
  })

  describe('dirty status', () => {
    it('formats staged files with M-space XY code', () => {
      const status = mockStatusResult({ staged: ['src/auth.ts'] })
      const output = printMockStatus(status)
      const lines = output.split('\n')
      expect(lines[1]).toBe('M  src/auth.ts')
    })

    it('formats modified (worktree) files with space-M XY code', () => {
      const status = mockStatusResult({ modified: ['src/utils.ts'] })
      const output = printMockStatus(status)
      const lines = output.split('\n')
      expect(lines[1]).toBe(' M src/utils.ts')
    })

    it('formats untracked files with ?? XY code', () => {
      const status = mockStatusResult({ not_added: ['scratch.md'] })
      const output = printMockStatus(status)
      const lines = output.split('\n')
      expect(lines[1]).toBe('?? scratch.md')
    })

    it('formats conflicted files with UU XY code', () => {
      const status = mockStatusResult({ conflicted: ['merge.ts'] })
      const output = printMockStatus(status)
      const lines = output.split('\n')
      expect(lines[1]).toBe('UU merge.ts')
    })

    it('formats created (added) files with A-space XY code', () => {
      const status = mockStatusResult({ created: ['new-file.ts'] })
      const output = printMockStatus(status)
      const lines = output.split('\n')
      expect(lines[1]).toBe('A  new-file.ts')
    })

    it('formats deleted files with D-space XY code', () => {
      const status = mockStatusResult({ deleted: ['old-file.ts'] })
      const output = printMockStatus(status)
      const lines = output.split('\n')
      expect(lines[1]).toBe('D  old-file.ts')
    })

    it('formats multiple files in order', () => {
      const status = mockStatus()
        .onBranch('main')
        .tracking('origin/main')
        .staged('src/auth.ts')
        .modified('src/utils.ts')
        .untracked('scratch.md')
        .build()
      const output = printMockStatus(status)
      const lines = output.split('\n')
      expect(lines[0]).toBe('## main...origin/main')
      expect(lines[1]).toBe('M  src/auth.ts')
      expect(lines[2]).toBe(' M src/utils.ts')
      expect(lines[3]).toBe('?? scratch.md')
    })
  })
})

describe('printMockLog', () => {
  it('returns empty string for an empty log', () => {
    const log = mockLogResult()
    const output = printMockLog(log)
    expect(output).toBe('')
  })

  it('formats a single commit as short-hash + message', () => {
    const log = mockLogResult({
      commits: [{ hash: 'abc1234567890abcdef1234567890abcdef123456', message: 'feat: add auth' }],
      count: 1,
    })
    const output = printMockLog(log)
    expect(output).toBe('abc1234 feat: add auth')
  })

  it('formats multiple commits one per line', () => {
    const log = mockLog()
      .commit({ hash: 'abc1234567890abcdef1234567890abcdef123456', message: 'feat: add auth' })
      .commit({ hash: 'def5678901234567890abcdef1234567890abcdef', message: 'chore: initial commit' })
      .build()
    const output = printMockLog(log)
    const lines = output.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('abc1234 feat: add auth')
    expect(lines[1]).toBe('def5678 chore: initial commit')
  })

  it('uses first 7 chars of deterministic hashes', () => {
    const log = mockLogResult({ count: 3 })
    const output = printMockLog(log)
    const lines = output.split('\n')
    // deterministicHash(0) = '0000000...', first 7 = '0000000'
    expect(lines[0]).toBe('0000000 commit 1')
    expect(lines[1]).toBe('0000000 commit 2')
    expect(lines[2]).toBe('0000000 commit 3')
  })
})

describe('Round-trip property: printMockStatus → parse → mapXYToBuckets', () => {
  /**
   * For any StatusResult built by our factories, parsing the output
   * of printMockStatus back through the bucket mapping produces
   * equivalent bucket placements for each file.
   *
   * **Validates: Requirements 10**
   */

  // Generator for a single bucket category (non-conflict, non-untracked)
  const pathArb = fc.stringMatching(/^[a-z][a-z0-9/._-]{0,20}$/)
  const pathListArb = fc.uniqueArray(pathArb, { minLength: 0, maxLength: 5 })

  it('round-trips bucket placements through print/parse', () => {
    fc.assert(
      fc.property(
        pathListArb, // staged
        pathListArb, // modified
        pathListArb, // not_added
        pathListArb, // conflicted
        (stagedPaths, modifiedPaths, untrackedPaths, conflictedPaths) => {
          // Build a StatusResult from the random paths
          const status = mockStatusResult({
            staged: stagedPaths,
            modified: modifiedPaths,
            not_added: untrackedPaths,
            conflicted: conflictedPaths,
          })

          // Print it
          const output = printMockStatus(status)
          const lines = output.split('\n')

          // Skip the branch header (first line)
          const fileLines = lines.slice(1)

          // For each file line, parse XY and path, then verify mapping
          for (const line of fileLines) {
            if (line.length < 4) continue // skip empty/malformed lines

            const x = line[0] as XCode
            const y = line[1] as YCode
            const path = line.slice(3) // skip XY + space

            // Find the original file entry to compare
            const originalFile = status.files.find((f) => f.path === path)
            expect(originalFile).toBeDefined()

            // Map the parsed XY back through bucket mapping
            const parsedPlacement = mapXYToBuckets(x, y)

            // Map the original file's XY through bucket mapping
            const originalPlacement = mapXYToBuckets(
              originalFile!.index as XCode,
              originalFile!.working_dir as YCode
            )

            // They should be equivalent
            expect(parsedPlacement).toEqual(originalPlacement)
          }

          // Verify file count matches
          expect(fileLines.length).toBe(status.files.length)
        }
      ),
      { numRuns: 100 }
    )
  })
})
