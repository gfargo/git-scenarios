/**
 * Cross-platform path property tests.
 *
 * Property 11: Path normalization — forward-slash paths create files
 * successfully on the host OS, and `exists()` returns true for them.
 *
 * Also includes one test per atom category exercising path-sensitive
 * behavior: working tree, staging + commits, branches, and control flow.
 *
 * Uses fast-check to verify path normalization holds across many
 * randomly generated relative paths.
 *
 * **Validates: Requirements 12.2**
 */

import * as fc from 'fast-check'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { writeFiles, addCommit, stageFiles, switchToBranch, chain } from '../atoms'

async function withRepo(callback: (repo: TempGitRepo) => Promise<void>): Promise<void> {
  const repo = await createTempGitRepo()
  try {
    await callback(repo)
  } finally {
    await repo.cleanup()
  }
}

/**
 * Property 11: Path normalization for cross-platform correctness
 *
 * For any relative file path containing forward slashes (e.g.,
 * "src/utils/helper.ts"), atoms that create files should successfully
 * create the file on the host OS, and `exists()` should return true
 * for that path.
 *
 * **Validates: Requirements 12.2**
 */
describe('Property 11: Path normalization for cross-platform correctness', () => {
  // Generate safe relative path segments (lowercase alphanumeric)
  const safeSegment = fc
    .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
      minLength: 1,
      maxLength: 8,
    })
    .map((chars) => chars.join(''))

  // Generate forward-slash paths with 2–4 segments ending in .ts
  const forwardSlashPath = fc
    .array(safeSegment, { minLength: 2, maxLength: 4 })
    .map((segments) => segments.join('/') + '.ts')

  it('forward-slash paths create files successfully on host OS', async () => {
    await fc.assert(
      fc.asyncProperty(forwardSlashPath, async (filePath) => {
        await withRepo(async (repo) => {
          await writeFiles({ [filePath]: 'content' })(repo)
          const fileExists = await repo.exists(filePath)
          expect(fileExists).toBe(true)
        })
      }),
      { numRuns: 20 },
    )
  }, 60_000)
})

describe('Cross-platform path tests by atom category', () => {
  /**
   * Working tree category: writeFiles with nested forward-slash paths
   * creates files correctly and they are readable.
   */
  describe('Working tree: writeFiles with nested paths', () => {
    it('creates deeply nested files with forward-slash paths', async () => {
      await withRepo(async (repo) => {
        const files = {
          'src/components/Button.tsx': 'export const Button = () => {}',
          'src/utils/helpers/format.ts': 'export function format() {}',
          'tests/unit/components/Button.test.tsx': 'test("renders", () => {})',
        }

        await writeFiles(files)(repo)

        for (const path of Object.keys(files)) {
          const exists = await repo.exists(path)
          expect(exists).toBe(true)
        }
      })
    })
  })

  /**
   * Staging + commits category: addCommit with nested file paths
   * stages and commits files at forward-slash paths.
   */
  describe('Staging + commits: addCommit with nested paths', () => {
    it('commits files at nested forward-slash paths', async () => {
      await withRepo(async (repo) => {
        await addCommit({
          message: 'feat: add nested files',
          files: {
            'src/lib/core/index.ts': 'export {}',
            'src/lib/utils/string.ts': 'export function trim() {}',
          },
        })(repo)

        // Verify files exist after commit
        expect(await repo.exists('src/lib/core/index.ts')).toBe(true)
        expect(await repo.exists('src/lib/utils/string.ts')).toBe(true)

        // Verify they are tracked in git
        const status = await repo.git.status()
        expect(status.isClean()).toBe(true)
      })
    })
  })

  /**
   * Staging category: stageFiles works with forward-slash paths.
   */
  describe('Staging: stageFiles with forward-slash paths', () => {
    it('stages files specified with forward-slash paths', async () => {
      await withRepo(async (repo) => {
        // Need an initial commit for staging to work properly
        await addCommit({
          message: 'init',
          files: { 'README.md': '# test' },
        })(repo)

        // Write files with nested paths
        await writeFiles({
          'src/deep/nested/file.ts': 'content a',
          'src/other/path/file.ts': 'content b',
        })(repo)

        // Stage only one nested path
        await stageFiles('src/deep/nested/file.ts')(repo)

        const status = await repo.git.status()
        expect(status.staged).toContain('src/deep/nested/file.ts')
      })
    })
  })

  /**
   * Branches category: switchToBranch works after creating files
   * with nested paths (verifies branch operations don't break on
   * any OS when nested path files are present).
   */
  describe('Branches: switchToBranch with nested path files', () => {
    it('switches branches after creating nested path files', async () => {
      await withRepo(async (repo) => {
        // Create initial commit with nested files
        await addCommit({
          message: 'init',
          files: {
            'src/components/App.tsx': 'export const App = () => {}',
            'src/styles/main.css': 'body {}',
          },
        })(repo)

        // Switch to a new branch
        await switchToBranch('feature/nested-paths')(repo)

        // Verify we're on the new branch
        const branches = await repo.git.branchLocal()
        expect(branches.current).toBe('feature/nested-paths')

        // Verify nested files still exist
        expect(await repo.exists('src/components/App.tsx')).toBe(true)
        expect(await repo.exists('src/styles/main.css')).toBe(true)
      })
    })
  })

  /**
   * Control flow category: chain with path-creating atoms works
   * correctly when composing multiple nested-path operations.
   */
  describe('Control flow: chain with path-creating steps', () => {
    it('chain composes multiple nested-path file operations', async () => {
      await withRepo(async (repo) => {
        await chain(
          addCommit({
            message: 'feat: scaffold',
            files: {
              'src/index.ts': 'export {}',
              'src/utils/logger.ts': 'export function log() {}',
            },
          }),
          writeFiles({
            'src/components/Header.tsx': 'export const Header = () => {}',
            'docs/api/reference.md': '# API Reference',
          }),
          stageFiles('src/components/Header.tsx', 'docs/api/reference.md'),
        )(repo)

        // All files should exist
        expect(await repo.exists('src/index.ts')).toBe(true)
        expect(await repo.exists('src/utils/logger.ts')).toBe(true)
        expect(await repo.exists('src/components/Header.tsx')).toBe(true)
        expect(await repo.exists('docs/api/reference.md')).toBe(true)
      })
    })
  })
})
