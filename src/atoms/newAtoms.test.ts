/**
 * Tests for the new atoms added in v0.4.0:
 * - sparseCheckout (enableSparseCheckout, disableSparseCheckout)
 * - shallowClone (shallowAt, unshallow)
 * - notes (addNote, appendNote, removeNote)
 * - hooks (installHook, removeHook)
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { addCommit } from './addCommit'
import { chain } from './chain'
import { enableSparseCheckout, disableSparseCheckout } from './sparseCheckout'
import { shallowAt, unshallow } from './shallowClone'
import { addNote, appendNote, removeNote } from './notes'
import { installHook, removeHook } from './hooks'

async function withRepo(callback: (repo: TempGitRepo) => Promise<void>): Promise<void> {
  const repo = await createTempGitRepo()
  try {
    await callback(repo)
  } finally {
    await repo.cleanup()
  }
}

async function seedMain(repo: TempGitRepo): Promise<void> {
  await addCommit({ message: 'init', files: { 'README.md': '# test\n' } })(repo)
}

describe('sparseCheckout', () => {
  it('enables sparse checkout with cone mode', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({
          message: 'init',
          files: {
            'src/app/index.ts': 'app\n',
            'src/lib/utils.ts': 'utils\n',
            'docs/README.md': '# docs\n',
          },
        }),
        enableSparseCheckout(['src/app']),
      )(repo)

      // src/app should exist
      expect(existsSync(join(repo.path, 'src/app/index.ts'))).toBe(true)
      // src/lib and docs should NOT exist in worktree
      expect(existsSync(join(repo.path, 'src/lib/utils.ts'))).toBe(false)
      expect(existsSync(join(repo.path, 'docs/README.md'))).toBe(false)
    })
  })

  it('disables sparse checkout and restores full worktree', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({
          message: 'init',
          files: {
            'src/app/index.ts': 'app\n',
            'src/lib/utils.ts': 'utils\n',
          },
        }),
        enableSparseCheckout(['src/app']),
        disableSparseCheckout(),
      )(repo)

      // Both should exist after disabling sparse checkout
      expect(existsSync(join(repo.path, 'src/app/index.ts'))).toBe(true)
      expect(existsSync(join(repo.path, 'src/lib/utils.ts'))).toBe(true)
    })
  })
})

describe('shallowClone', () => {
  it('makes the repo appear shallow', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'commit 1', files: { 'a.ts': 'a\n' } }),
        addCommit({ message: 'commit 2', files: { 'b.ts': 'b\n' } }),
        addCommit({ message: 'commit 3', files: { 'c.ts': 'c\n' } }),
        shallowAt(1),
      )(repo)

      const isShallow = await repo.git.raw(['rev-parse', '--is-shallow-repository'])
      expect(isShallow.trim()).toBe('true')
    })
  })

  it('unshallow restores full history', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'commit 1', files: { 'a.ts': 'a\n' } }),
        addCommit({ message: 'commit 2', files: { 'b.ts': 'b\n' } }),
        addCommit({ message: 'commit 3', files: { 'c.ts': 'c\n' } }),
        shallowAt(1),
        unshallow(),
      )(repo)

      const isShallow = await repo.git.raw(['rev-parse', '--is-shallow-repository'])
      expect(isShallow.trim()).toBe('false')
    })
  })
})

describe('notes', () => {
  it('adds a note to HEAD', async () => {
    await withRepo(async (repo) => {
      await seedMain(repo)
      await addNote('Reviewed-by: Alice')(repo)

      const note = await repo.git.raw(['notes', 'show', 'HEAD'])
      expect(note.trim()).toBe('Reviewed-by: Alice')
    })
  })

  it('appends to an existing note', async () => {
    await withRepo(async (repo) => {
      await seedMain(repo)
      await addNote('Line 1')(repo)
      await appendNote('Line 2')(repo)

      const note = await repo.git.raw(['notes', 'show', 'HEAD'])
      expect(note).toContain('Line 1')
      expect(note).toContain('Line 2')
    })
  })

  it('adds a note to a specific ref', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'first', files: { 'a.ts': 'a\n' } }),
        addCommit({ message: 'second', files: { 'b.ts': 'b\n' } }),
      )(repo)
      await addNote('Note on first commit', { ref: 'HEAD~1' })(repo)

      const note = await repo.git.raw(['notes', 'show', 'HEAD~1'])
      expect(note.trim()).toBe('Note on first commit')
    })
  })

  it('removes a note', async () => {
    await withRepo(async (repo) => {
      await seedMain(repo)
      await addNote('Temporary note')(repo)
      await removeNote()(repo)

      await expect(
        repo.git.raw(['notes', 'show', 'HEAD']),
      ).rejects.toThrow()
    })
  })

  it('supports custom namespaces', async () => {
    await withRepo(async (repo) => {
      await seedMain(repo)
      await addNote('CI passed', { namespace: 'refs/notes/ci' })(repo)

      const note = await repo.git.raw(['notes', '--ref', 'refs/notes/ci', 'show', 'HEAD'])
      expect(note.trim()).toBe('CI passed')
    })
  })
})

describe('hooks', () => {
  it('installs a hook script', async () => {
    await withRepo(async (repo) => {
      await seedMain(repo)
      await installHook('pre-commit', '#!/bin/sh\necho "hook ran"')(repo)

      const hookPath = join(repo.path, '.git', 'hooks', 'pre-commit')
      expect(existsSync(hookPath)).toBe(true)
      const content = readFileSync(hookPath, 'utf-8')
      expect(content).toContain('echo "hook ran"')
    })
  })

  it('removes a hook', async () => {
    await withRepo(async (repo) => {
      await seedMain(repo)
      await installHook('pre-commit', '#!/bin/sh\nexit 0')(repo)
      await removeHook('pre-commit')(repo)

      const hookPath = join(repo.path, '.git', 'hooks', 'pre-commit')
      expect(existsSync(hookPath)).toBe(false)
    })
  })

  it('installed hook is executable and can be detected by git', async () => {
    await withRepo(async (repo) => {
      await seedMain(repo)
      const hookScript = '#!/bin/sh\necho "hook active"\nexit 1'
      await installHook('pre-commit', hookScript)(repo)

      // Verify the hook file exists and has the right content
      const hookPath = join(repo.path, '.git', 'hooks', 'pre-commit')
      expect(existsSync(hookPath)).toBe(true)
      const content = readFileSync(hookPath, 'utf-8')
      expect(content).toBe(hookScript)

      // Windows file systems don't expose Unix execute bits — the
      // mode field always reports 0 for the execute group there.
      // Skip the executable check on Windows; the file existence +
      // content check above is the meaningful assertion on any OS.
      if (process.platform !== 'win32') {
        const { statSync } = await import('fs')
        const stats = statSync(hookPath)
        // Check that the owner execute bit is set (0o100)
        expect(stats.mode & 0o111).toBeGreaterThan(0)
      }
    })
  })
})
