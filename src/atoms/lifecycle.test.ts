/**
 * Tests for the lifecycle-completion atoms added in v0.6:
 *   - unstageFiles      (inverse of stageFiles)
 *   - continueCherryPick (paired with abortCherryPick)
 *   - continueRevert / abortRevert (paired with revert)
 *   - startMerge with squash: true
 */

import { existsSync } from 'fs'
import { join } from 'path'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import {
    abortRevert,
    addCommit,
    chain,
    checkoutBranch,
    cherryPick,
    commit,
    continueCherryPick,
    continueRevert,
    revert,
    stageFiles,
    startMerge,
    switchToBranch,
    unstageFiles,
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

async function seedMain(repo: TempGitRepo): Promise<void> {
  await addCommit({ message: 'init', files: { 'README.md': '# repo\n' } })(repo)
}

describe('unstageFiles', () => {
  it('unstages everything when called with no args', async () => {
    await withRepo(async (repo) => {
      await chain(
        seedMain,
        writeFiles({ 'a.ts': 'a\n', 'b.ts': 'b\n' }),
        stageFiles(),
        unstageFiles(),
      )(repo)
      const status = await repo.git.status()
      expect(status.staged).toEqual([])
      expect(status.not_added.sort()).toEqual(['a.ts', 'b.ts'])
    })
  })

  it('unstages only the named paths', async () => {
    await withRepo(async (repo) => {
      await chain(
        seedMain,
        writeFiles({ 'a.ts': 'a\n', 'b.ts': 'b\n' }),
        stageFiles(),
        unstageFiles('b.ts'),
      )(repo)
      const status = await repo.git.status()
      expect(status.staged).toEqual(['a.ts'])
      expect(status.not_added).toEqual(['b.ts'])
    })
  })

  it('produces a partial-stage state (some staged, some not)', async () => {
    await withRepo(async (repo) => {
      await chain(
        seedMain,
        writeFiles({
          'src/a.ts': 'a\n',
          'src/b.ts': 'b\n',
          'src/c.ts': 'c\n',
        }),
        stageFiles(),
        unstageFiles('src/b.ts'),
      )(repo)
      const status = await repo.git.status()
      expect(status.staged.sort()).toEqual(['src/a.ts', 'src/c.ts'])
      expect(status.not_added).toEqual(['src/b.ts'])
    })
  })
})

describe('continueCherryPick', () => {
  it('completes a paused cherry-pick after resolving conflicts', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'base', files: { 'x.ts': 'base\n' } }),
        switchToBranch('feat/source'),
        addCommit({ message: 'pickable', files: { 'x.ts': 'theirs\n' } }),
        checkoutBranch('main'),
        addCommit({ message: 'ours', files: { 'x.ts': 'ours\n' } }),
        cherryPick('feat/source'),
      )(repo)

      // Verify mid-cherry-pick state
      expect(existsSync(join(repo.path, '.git', 'CHERRY_PICK_HEAD'))).toBe(true)
      const conflictedStatus = await repo.git.status()
      expect(conflictedStatus.conflicted.length).toBeGreaterThan(0)

      // Resolve and continue
      await chain(
        writeFiles({ 'x.ts': 'resolved\n' }),
        stageFiles('x.ts'),
        continueCherryPick(),
      )(repo)

      // Verify cleared state and new commit
      expect(existsSync(join(repo.path, '.git', 'CHERRY_PICK_HEAD'))).toBe(false)
      const status = await repo.git.status()
      expect(status.conflicted.length).toBe(0)
      const log = await repo.git.log()
      expect(log.latest?.message).toContain('pickable')
    })
  })
})

describe('continueRevert + abortRevert', () => {
  it('continueRevert completes a paused revert after resolving conflicts', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'base', files: { 'x.ts': 'v1\n' } }),
        addCommit({ message: 'add feature', files: { 'x.ts': 'v2 with feat\n' } }),
        addCommit({ message: 'add second feature', files: { 'x.ts': 'v3 with feat + new feat\n' } }),
        revert('HEAD~1'),
      )(repo)

      // Verify mid-revert state
      expect(existsSync(join(repo.path, '.git', 'REVERT_HEAD'))).toBe(true)

      // Resolve and continue
      await chain(
        writeFiles({ 'x.ts': 'manually resolved\n' }),
        stageFiles('x.ts'),
        continueRevert(),
      )(repo)

      expect(existsSync(join(repo.path, '.git', 'REVERT_HEAD'))).toBe(false)
      const log = await repo.git.log()
      // Latest commit is the revert
      expect(log.latest?.message).toMatch(/^Revert/)
    })
  })

  it('abortRevert restores to pre-revert state', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'base', files: { 'x.ts': 'v1\n' } }),
        addCommit({ message: 'add feature', files: { 'x.ts': 'v2 with feat\n' } }),
        addCommit({ message: 'add second feature', files: { 'x.ts': 'v3 with feat + new feat\n' } }),
        revert('HEAD~1'),
      )(repo)

      expect(existsSync(join(repo.path, '.git', 'REVERT_HEAD'))).toBe(true)

      await abortRevert()(repo)

      expect(existsSync(join(repo.path, '.git', 'REVERT_HEAD'))).toBe(false)
      const status = await repo.git.status()
      expect(status.conflicted).toEqual([])
      // HEAD unchanged after abort
      const log = await repo.git.log()
      expect(log.total).toBe(3)
      expect(log.latest?.message).toBe('add second feature')
    })
  })
})

describe('startMerge with squash', () => {
  it('squash-merges a branch (changes staged, no merge commit)', async () => {
    await withRepo(async (repo) => {
      await chain(
        addCommit({ message: 'base', files: { 'a.ts': 'a\n' } }),
        switchToBranch('feat/x'),
        addCommit({ message: 'feat 1', files: { 'b.ts': 'b\n' } }),
        addCommit({ message: 'feat 2', files: { 'c.ts': 'c\n' } }),
        checkoutBranch('main'),
        startMerge('feat/x', { squash: true }),
      )(repo)

      // Squash leaves a single staged set, no merge commit, no MERGE_HEAD
      expect(existsSync(join(repo.path, '.git', 'MERGE_HEAD'))).toBe(false)
      const status = await repo.git.status()
      expect(status.staged.sort()).toEqual(['b.ts', 'c.ts'])
      // main hasn't advanced past base
      const log = await repo.git.log(['main'])
      expect(log.total).toBe(1)
      expect(log.latest?.message).toBe('base')

      // Caller commits to finalize the squash
      await commit('feat: squash from feat/x')(repo)
      const after = await repo.git.log(['main'])
      expect(after.total).toBe(2)
      expect(after.latest?.message).toBe('feat: squash from feat/x')
    })
  })
})
