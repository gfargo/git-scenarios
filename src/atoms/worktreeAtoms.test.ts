/**
 * Regression tests for atoms that write directly into the git dir
 * (installHook, shallowAt/unshallow, startInteractiveRebase) when the
 * target repo handle is a *linked worktree*. There, `.git` is a file
 * containing `gitdir: <path>`, not a directory — a hardcoded
 * `join(repo.path, '.git', ...)` fails with ENOTDIR (or, for a plain
 * existence check, silently reads the wrong location). These atoms must
 * resolve the real git dir via `git rev-parse --git-path` instead.
 */

import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

import { createTempGitRepo, wrapRepoAtPath, type TempGitRepo } from '../tempGitRepo'
import { addCommit } from './addCommit'
import { addWorktree, removeWorktree } from './worktrees'
import { installHook, removeHook } from './hooks'
import { shallowAt, unshallow } from './shallowClone'
import { abortRebase, startInteractiveRebase } from './rebase'

async function withWorktree(
  callback: (repo: TempGitRepo, worktree: TempGitRepo, wtPath: string) => Promise<void>,
): Promise<void> {
  const repo = await createTempGitRepo()
  const wtPath = await mkdtemp(join(tmpdir(), 'git-scenarios-wt-atoms-'))
  try {
    await addCommit({ message: 'init', files: { 'README.md': '# test\n' } })(repo)
    await addWorktree(wtPath, { branch: 'feat/wt-atoms' })(repo)
    const worktree = await wrapRepoAtPath(wtPath)
    await callback(repo, worktree, wtPath)
  } finally {
    await removeWorktree(wtPath, { force: true })(repo).catch(() => {})
    await rm(wtPath, { recursive: true, force: true })
    await repo.cleanup()
  }
}

describe('atoms against a linked worktree', () => {
  it('installHook / removeHook succeed on a linked worktree', async () => {
    await withWorktree(async (_repo, worktree) => {
      await installHook('pre-commit', '#!/bin/sh\nexit 0')(worktree)

      const hookRelPath = (
        await worktree.git.raw(['rev-parse', '--git-path', 'hooks/pre-commit'])
      ).trim()
      expect(hookRelPath).not.toBe('')

      // The hook must land in the *common* git dir, not a bogus
      // "<worktree>/.git/hooks" path (which would be ENOTDIR).
      const commonDir = (await worktree.git.raw(['rev-parse', '--git-common-dir'])).trim()
      expect(commonDir).not.toBe('.git')

      await removeHook('pre-commit')(worktree)
    })
  }, 30_000)

  it('shallowAt / unshallow succeed on a linked worktree', async () => {
    await withWorktree(async (_repo, worktree) => {
      await addCommit({ message: 'second', files: { 'a.ts': 'a\n' } })(worktree)
      await addCommit({ message: 'third', files: { 'b.ts': 'b\n' } })(worktree)

      await shallowAt(1)(worktree)
      const isShallow = await worktree.git.raw(['rev-parse', '--is-shallow-repository'])
      expect(isShallow.trim()).toBe('true')

      await unshallow()(worktree)
      const isShallowAfter = await worktree.git.raw(['rev-parse', '--is-shallow-repository'])
      expect(isShallowAfter.trim()).toBe('false')
    })
  }, 30_000)

  it('startInteractiveRebase pauses correctly on a linked worktree', async () => {
    await withWorktree(async (_repo, worktree, wtPath) => {
      await addCommit({ message: 'second', files: { 'a.ts': 'a\n' } })(worktree)
      await addCommit({ message: 'third', files: { 'b.ts': 'b\n' } })(worktree)

      // Would previously throw 'did not pause at the edit step' because
      // the existsSync check looked for `<wtPath>/.git/rebase-merge`,
      // which never exists for a linked worktree (`.git` is a file
      // there; the real state lives in the common dir's
      // `worktrees/<name>/rebase-merge`). If it didn't throw, the test
      // below independently confirms the rebase actually paused.
      await startInteractiveRebase('HEAD~2')(worktree)

      const { existsSync } = await import('fs')
      expect(existsSync(join(wtPath, '.git', 'rebase-merge'))).toBe(false) // the old, broken check
      const rebaseMergePath = (
        await worktree.git.raw(['rev-parse', '--git-path', 'rebase-merge'])
      ).trim()
      expect(existsSync(rebaseMergePath)).toBe(true) // the real state

      await abortRebase()(worktree)
    })
  }, 30_000)

  it('installHook / shallowAt still work on a normal (non-worktree) repo', async () => {
    const repo = await createTempGitRepo()
    try {
      await addCommit({ message: 'init', files: { 'README.md': '# test\n' } })(repo)
      await addCommit({ message: 'second', files: { 'a.ts': 'a\n' } })(repo)

      await installHook('pre-commit', '#!/bin/sh\nexit 0')(repo)
      const { existsSync } = await import('fs')
      expect(existsSync(join(repo.path, '.git', 'hooks', 'pre-commit'))).toBe(true)

      await shallowAt(1)(repo)
      const isShallow = await repo.git.raw(['rev-parse', '--is-shallow-repository'])
      expect(isShallow.trim()).toBe('true')
    } finally {
      await repo.cleanup()
    }
  }, 30_000)
})
