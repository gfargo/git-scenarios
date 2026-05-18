/**
 * Catch-up tests for atoms shipped in v0.2.0 without dedicated coverage:
 *   - startRebase / abortRebase / continueRebase
 *   - deleteFiles
 *   - renameFile
 *   - conditionally
 *
 * Existing scenarios exercise these atoms implicitly via the registered
 * scenario contracts; this file pins their individual semantics so
 * regressions in any one atom are caught at the atom layer.
 */
import { existsSync } from 'fs'
import { join } from 'path'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import {
  abortRebase,
  addCommit,
  chain,
  checkoutBranch,
  conditionally,
  continueRebase,
  deleteFiles,
  renameFile,
  stageFiles,
  startRebase,
  switchToBranch,
  writeFiles,
} from './'

async function withRepo(callback: (repo: TempGitRepo) => Promise<void>): Promise<void> {
  const repo = await createTempGitRepo()
  try {
    await callback(repo)
  } finally {
    await repo.cleanup()
  }
}

describe('startRebase', () => {
  it('replays current branch onto the target when no conflicts', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'base', files: { 'base.ts': 'base\n' } }),
        switchToBranch('feat/x'),
        addCommit({ message: 'feat: x', files: { 'x.ts': 'x\n' } }),
        checkoutBranch('main'),
        addCommit({ message: 'main: y', files: { 'y.ts': 'y\n' } }),
        checkoutBranch('feat/x'),
        startRebase('main'),
      )(repo)

      const status = await repo.git.status()
      expect(status.conflicted).toHaveLength(0)
      // After rebase, feat/x should contain both x.ts and y.ts.
      expect(existsSync(join(repo.path, 'x.ts'))).toBe(true)
      expect(existsSync(join(repo.path, 'y.ts'))).toBe(true)
    })
  })

  it('leaves repo mid-rebase on conflict (default allowConflict)', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'base', files: { 'x.ts': 'base\n' } }),
        switchToBranch('feat/theirs'),
        addCommit({ message: 'theirs', files: { 'x.ts': 'theirs\n' } }),
        checkoutBranch('main'),
        addCommit({ message: 'ours', files: { 'x.ts': 'ours\n' } }),
        checkoutBranch('feat/theirs'),
        startRebase('main'),
      )(repo)

      const status = await repo.git.status()
      expect(status.conflicted).toContain('x.ts')
      expect(existsSync(join(repo.path, '.git/rebase-merge'))).toBe(true)
    })
  })

  it('rethrows on conflict when allowConflict: false', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'base', files: { 'x.ts': 'base\n' } }),
        switchToBranch('feat/theirs'),
        addCommit({ message: 'theirs', files: { 'x.ts': 'theirs\n' } }),
        checkoutBranch('main'),
        addCommit({ message: 'ours', files: { 'x.ts': 'ours\n' } }),
        checkoutBranch('feat/theirs'),
      )(repo)

      await expect(startRebase('main', { allowConflict: false })(repo)).rejects.toBeTruthy()
    })
  })
})

describe('abortRebase', () => {
  it('restores the pre-rebase state', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'base', files: { 'x.ts': 'base\n' } }),
        switchToBranch('feat/theirs'),
        addCommit({ message: 'theirs', files: { 'x.ts': 'theirs\n' } }),
        checkoutBranch('main'),
        addCommit({ message: 'ours', files: { 'x.ts': 'ours\n' } }),
        checkoutBranch('feat/theirs'),
        startRebase('main'),
        abortRebase(),
      )(repo)

      expect(existsSync(join(repo.path, '.git/rebase-merge'))).toBe(false)
      const status = await repo.git.status()
      expect(status.conflicted).toHaveLength(0)
      expect(status.current).toBe('feat/theirs')
    })
  })
})

describe('continueRebase', () => {
  it('completes the rebase after manual conflict resolution', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'base', files: { 'x.ts': 'base\n' } }),
        switchToBranch('feat/theirs'),
        addCommit({ message: 'theirs', files: { 'x.ts': 'theirs\n' } }),
        checkoutBranch('main'),
        addCommit({ message: 'ours', files: { 'x.ts': 'ours\n' } }),
        checkoutBranch('feat/theirs'),
        startRebase('main'),
        // Resolve the conflict by picking 'theirs' content.
        writeFiles({ 'x.ts': 'theirs\n' }),
        stageFiles('x.ts'),
        continueRebase(),
      )(repo)

      expect(existsSync(join(repo.path, '.git/rebase-merge'))).toBe(false)
      const status = await repo.git.status()
      expect(status.conflicted).toHaveLength(0)
    })
  })
})

describe('deleteFiles', () => {
  it('removes a file from the working directory without staging', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'a.ts': 'a\n', 'b.ts': 'b\n' } }),
        deleteFiles('b.ts'),
      )(repo)

      expect(existsSync(join(repo.path, 'b.ts'))).toBe(false)
      const status = await repo.git.status()
      // Deletion shows up as not-staged.
      expect(status.deleted).toContain('b.ts')
      // Nothing should be staged.
      expect(status.staged).not.toContain('b.ts')
    })
  })

  it('accepts multiple paths', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({
          message: 'init',
          files: { 'a.ts': 'a\n', 'b.ts': 'b\n', 'c.ts': 'c\n' },
        }),
        deleteFiles('a.ts', 'c.ts'),
      )(repo)

      expect(existsSync(join(repo.path, 'a.ts'))).toBe(false)
      expect(existsSync(join(repo.path, 'b.ts'))).toBe(true)
      expect(existsSync(join(repo.path, 'c.ts'))).toBe(false)
    })
  })

  it('is idempotent on non-existent paths', async () => {
    await withRepo(async (repo) => {
      await addCommit({ message: 'init', files: { 'a.ts': 'a\n' } })(repo)
      await expect(deleteFiles('does-not-exist.ts')(repo)).resolves.not.toThrow()
    })
  })
})

describe('renameFile', () => {
  it('renames a tracked file via git mv and stages the rename', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'src/old.ts': 'content\n' } }),
        renameFile('src/old.ts', 'src/new.ts'),
      )(repo)

      expect(existsSync(join(repo.path, 'src/old.ts'))).toBe(false)
      expect(existsSync(join(repo.path, 'src/new.ts'))).toBe(true)
      const status = await repo.git.status()
      // git mv stages the rename in the index.
      expect(status.renamed.length).toBe(1)
      expect(status.renamed[0].from).toBe('src/old.ts')
      expect(status.renamed[0].to).toBe('src/new.ts')
    })
  })

  it('preserves rename detection across commit', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'old.ts': 'content\n' } }),
        renameFile('old.ts', 'new.ts'),
        addCommit({ message: 'refactor: rename' }),
      )(repo)

      // git log --follow new.ts should pick up the prior history.
      const log = await repo.git.log(['--follow', '--', 'new.ts'])
      expect(log.total).toBe(2)
    })
  })

  it('throws when the source file is not tracked', async () => {
    await withRepo(async (repo) => {
      await addCommit({ message: 'init', files: { 'a.ts': 'a\n' } })(repo)
      await writeFiles({ 'untracked.ts': 'u\n' })(repo)
      await expect(renameFile('untracked.ts', 'renamed.ts')(repo)).rejects.toBeTruthy()
    })
  })
})

describe('conditionally', () => {
  it('runs the step when condition is true (boolean)', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'README.md': '# repo\n' } }),
        conditionally(true, addCommit({ message: 'second', files: { 'a.ts': 'a\n' } })),
      )(repo)

      const log = await repo.git.log()
      expect(log.total).toBe(2)
    })
  })

  it('skips the step when condition is false (boolean)', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'README.md': '# repo\n' } }),
        conditionally(false, addCommit({ message: 'never', files: { 'a.ts': 'a\n' } })),
      )(repo)

      const log = await repo.git.log()
      expect(log.total).toBe(1)
      expect(log.latest?.message).toBe('init')
    })
  })

  it('evaluates a synchronous function predicate against the repo', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'README.md': '# repo\n' } }),
        switchToBranch('feat/x'),
        addCommit({ message: 'feat x', files: { 'x.ts': 'x\n' } }),
        checkoutBranch('main'),
        conditionally(
          async (r) => (await r.git.branchLocal()).all.includes('feat/x'),
          addCommit({ message: 'aware of feat/x', files: { 'note.md': 'n\n' } }),
        ),
      )(repo)

      const log = await repo.git.log()
      expect(log.latest?.message).toBe('aware of feat/x')
    })
  })

  it('skips the step when a function predicate returns false', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'init', files: { 'README.md': '# repo\n' } }),
        conditionally(
          async (r) => (await r.git.branchLocal()).all.includes('not-there'),
          addCommit({ message: 'never', files: { 'a.ts': 'a\n' } }),
        ),
      )(repo)

      const log = await repo.git.log()
      expect(log.total).toBe(1)
    })
  })
})
