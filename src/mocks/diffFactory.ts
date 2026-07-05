/**
 * DiffResult mock factory.
 *
 * Provides `mockDiffResult(options?)` for constructing in-memory
 * `DiffResult` objects matching simple-git's shape without touching disk.
 *
 * Aggregate counts (`insertions`, `deletions`, `changed`) are computed
 * automatically from the individual file entries.
 *
 * @module
 */

import type { DiffResult, DiffResultTextFile, DiffResultBinaryFile } from 'simple-git'

/**
 * A simplified file entry for the mock factory input.
 *
 * When `binary` is true, produces a `DiffResultBinaryFile` with
 * `before: 0` and `after: 0` defaults.
 * When `binary` is false or omitted, produces a `DiffResultTextFile`
 * with `changes` computed as `insertions + deletions`.
 */
export type MockDiffFileEntry = {
  file: string
  insertions: number
  deletions: number
  binary?: boolean
}

/** Options for the functional DiffResult factory */
export type MockDiffOptions = {
  files?: MockDiffFileEntry[]
}

/**
 * Create a complete DiffResult matching simple-git's shape.
 *
 * When `files` are provided, aggregate counts are computed automatically:
 * - `changed` = number of files
 * - `insertions` = sum of file insertions
 * - `deletions` = sum of file deletions
 *
 * When no arguments are provided, returns an empty diff (no files, all counts 0).
 *
 * @param options - Optional configuration for the diff result
 * @returns A valid DiffResult object
 */
export function mockDiffResult(options?: MockDiffOptions): DiffResult {
  const entries = options?.files ?? []

  const files: Array<DiffResultTextFile | DiffResultBinaryFile> = entries.map((entry) => {
    if (entry.binary) {
      return {
        file: entry.file,
        before: 0,
        after: 0,
        binary: true,
      } as DiffResultBinaryFile
    }

    return {
      file: entry.file,
      changes: entry.insertions + entry.deletions,
      insertions: entry.insertions,
      deletions: entry.deletions,
      binary: false,
    } as DiffResultTextFile
  })

  const insertions = entries.reduce((sum, e) => sum + e.insertions, 0)
  const deletions = entries.reduce((sum, e) => sum + e.deletions, 0)

  return {
    changed: files.length,
    files,
    insertions,
    deletions,
  }
}
