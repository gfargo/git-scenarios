import { mockDiffResult } from '../diffFactory'
import type { DiffResultTextFile, DiffResultBinaryFile } from 'simple-git'

describe('mockDiffResult', () => {
  describe('defaults (empty diff)', () => {
    it('returns an empty diff with no arguments', () => {
      const diff = mockDiffResult()

      expect(diff.changed).toBe(0)
      expect(diff.insertions).toBe(0)
      expect(diff.deletions).toBe(0)
      expect(diff.files).toEqual([])
    })

    it('returns an empty diff with explicit empty files array', () => {
      const diff = mockDiffResult({ files: [] })

      expect(diff.changed).toBe(0)
      expect(diff.insertions).toBe(0)
      expect(diff.deletions).toBe(0)
      expect(diff.files).toEqual([])
    })
  })

  describe('aggregate computation', () => {
    it('changed equals files.length', () => {
      const diff = mockDiffResult({
        files: [
          { file: 'src/a.ts', insertions: 5, deletions: 2 },
          { file: 'src/b.ts', insertions: 10, deletions: 0 },
          { file: 'src/c.ts', insertions: 0, deletions: 3 },
        ],
      })

      expect(diff.changed).toBe(3)
      expect(diff.changed).toBe(diff.files.length)
    })

    it('insertions equals sum of individual file insertions', () => {
      const diff = mockDiffResult({
        files: [
          { file: 'src/a.ts', insertions: 5, deletions: 2 },
          { file: 'src/b.ts', insertions: 10, deletions: 0 },
          { file: 'src/c.ts', insertions: 3, deletions: 7 },
        ],
      })

      expect(diff.insertions).toBe(5 + 10 + 3)
    })

    it('deletions equals sum of individual file deletions', () => {
      const diff = mockDiffResult({
        files: [
          { file: 'src/a.ts', insertions: 5, deletions: 2 },
          { file: 'src/b.ts', insertions: 10, deletions: 4 },
          { file: 'src/c.ts', insertions: 3, deletions: 7 },
        ],
      })

      expect(diff.deletions).toBe(2 + 4 + 7)
    })

    it('single file: aggregates match the file entry', () => {
      const diff = mockDiffResult({
        files: [{ file: 'index.ts', insertions: 42, deletions: 7 }],
      })

      expect(diff.changed).toBe(1)
      expect(diff.insertions).toBe(42)
      expect(diff.deletions).toBe(7)
    })
  })

  describe('text file entries', () => {
    it('produces DiffResultTextFile with correct fields', () => {
      const diff = mockDiffResult({
        files: [{ file: 'src/app.ts', insertions: 10, deletions: 3 }],
      })

      const file = diff.files[0] as DiffResultTextFile
      expect(file.file).toBe('src/app.ts')
      expect(file.insertions).toBe(10)
      expect(file.deletions).toBe(3)
      expect(file.changes).toBe(13)
      expect(file.binary).toBe(false)
    })

    it('changes is computed as insertions + deletions', () => {
      const diff = mockDiffResult({
        files: [{ file: 'utils.ts', insertions: 7, deletions: 4 }],
      })

      const file = diff.files[0] as DiffResultTextFile
      expect(file.changes).toBe(7 + 4)
    })
  })

  describe('binary file entries', () => {
    it('produces DiffResultBinaryFile when binary is true', () => {
      const diff = mockDiffResult({
        files: [{ file: 'image.png', insertions: 0, deletions: 0, binary: true }],
      })

      const file = diff.files[0] as DiffResultBinaryFile
      expect(file.file).toBe('image.png')
      expect(file.binary).toBe(true)
      expect(file.before).toBe(0)
      expect(file.after).toBe(0)
    })

    it('binary files still contribute to aggregate counts', () => {
      const diff = mockDiffResult({
        files: [
          { file: 'src/a.ts', insertions: 5, deletions: 2 },
          { file: 'logo.png', insertions: 0, deletions: 0, binary: true },
        ],
      })

      expect(diff.changed).toBe(2)
      expect(diff.insertions).toBe(5)
      expect(diff.deletions).toBe(2)
    })
  })

  describe('invariants', () => {
    it('changed === files.length for any input', () => {
      const inputs = [
        { files: [] as { file: string; insertions: number; deletions: number }[] },
        { files: [{ file: 'a.ts', insertions: 1, deletions: 0 }] },
        {
          files: [
            { file: 'a.ts', insertions: 1, deletions: 0 },
            { file: 'b.ts', insertions: 2, deletions: 3 },
            { file: 'c.ts', insertions: 0, deletions: 5 },
            { file: 'd.ts', insertions: 10, deletions: 10 },
          ],
        },
      ]

      for (const input of inputs) {
        const diff = mockDiffResult(input)
        expect(diff.changed).toBe(diff.files.length)
      }
    })

    it('insertions === sum of file insertions for any input', () => {
      const files = [
        { file: 'a.ts', insertions: 1, deletions: 0 },
        { file: 'b.ts', insertions: 20, deletions: 3 },
        { file: 'c.ts', insertions: 0, deletions: 5 },
        { file: 'd.ts', insertions: 100, deletions: 10 },
      ]

      const diff = mockDiffResult({ files })
      const expectedInsertions = files.reduce((sum, f) => sum + f.insertions, 0)
      expect(diff.insertions).toBe(expectedInsertions)
    })

    it('deletions === sum of file deletions for any input', () => {
      const files = [
        { file: 'a.ts', insertions: 1, deletions: 7 },
        { file: 'b.ts', insertions: 20, deletions: 3 },
        { file: 'c.ts', insertions: 0, deletions: 15 },
      ]

      const diff = mockDiffResult({ files })
      const expectedDeletions = files.reduce((sum, f) => sum + f.deletions, 0)
      expect(diff.deletions).toBe(expectedDeletions)
    })
  })
})
