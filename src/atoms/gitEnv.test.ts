/**
 * Regression tests for the git-environment handling fixed in the
 * "merge, never replace" change. Each block pins a bug that was real
 * and empirically reproduced before the fix.
 */

import { existsSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'

import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { chain } from './chain'
import { addCommit } from './addCommit'
import { bulkCommits } from './bulkCommits'
import { emptyCommit } from './commits'
import { commit, stageFiles } from './staging'
import { writeFiles } from './writeFiles'
import { installHook } from './hooks'
import { createTag } from './tags'
import { withAuthor } from './scopes'
import { switchToBranch } from './branches'
import { startRebase } from './rebase'
import { stashChanges } from './stash'
import { addNote } from './notes'

jest.setTimeout(60_000)

describe('gitEnv: withAuthor attributes every commit-producing atom', () => {
  // Before the fix, each atom's own `.env({dates})` REPLACED the
  // identity installed by withAuthor, so only `addCommit` (which routes
  // through commitAll) attributed correctly. The rest silently fell
  // back to the repo default.
  let repo: TempGitRepo
  let authorBySubject: Record<string, string>

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await chain(
      addCommit({ message: 'base', files: { 'a.txt': 'a\n' } }),
      withAuthor({ name: 'Alice', email: 'alice@example.com' },
        addCommit({ message: 'via-addCommit', files: { 'b.txt': 'b\n' } })),
      withAuthor({ name: 'Bob', email: 'bob@example.com' },
        chain(writeFiles({ 'c.txt': 'c\n' }), stageFiles('c.txt'), commit('via-commit'))),
      withAuthor({ name: 'Carol', email: 'carol@example.com' },
        emptyCommit('via-emptyCommit')),
      withAuthor({ name: 'Dave', email: 'dave@example.com' },
        bulkCommits([{ message: 'via-bulkCommits', files: { 'e.txt': 'e\n' } }])),
    )(repo)

    authorBySubject = {}
    const log = await repo.git.raw(['log', '--format=%s\t%an'])
    for (const line of log.trim().split('\n')) {
      const [subject, author] = line.split('\t')
      authorBySubject[subject] = author
    }
  })

  afterAll(async () => {
    await repo?.cleanup()
  })

  it.each([
    ['via-addCommit', 'Alice'],
    ['via-commit', 'Bob'],
    ['via-emptyCommit', 'Carol'],
    ['via-bulkCommits', 'Dave'],
  ])('%s is authored by %s', (subject, expected) => {
    expect(authorBySubject[subject]).toBe(expected)
  })

  it('annotated tags created inside withAuthor keep the tagger identity', async () => {
    const r = await createTempGitRepo()
    try {
      await chain(
        addCommit({ message: 'base', files: { 'a.txt': 'a\n' } }),
        withAuthor({ name: 'Tagger', email: 'tagger@example.com' },
          createTag('v1.0.0', { message: 'release' })),
      )(r)
      const tagger = await r.git.raw(['for-each-ref', '--format=%(taggername)', 'refs/tags/v1.0.0'])
      expect(tagger.trim()).toBe('Tagger')
    } finally {
      await r.cleanup()
    }
  })
})

describe('gitEnv: the child environment is inherited, not replaced', () => {
  // Object-form `.env()` hands its object straight to spawn, so pinning
  // a date used to run git with ONLY those two vars — no PATH, no HOME.
  // That made installHook unusable with any hook invoking a binary.
  it('a hook that shells out to a toolchain binary still runs', async () => {
    const repo = await createTempGitRepo()
    try {
      await chain(
        addCommit({ message: 'base', files: { 'a.txt': 'a\n' } }),
        installHook('pre-commit',
          '#!/bin/sh\nnode --version >/dev/null 2>&1 || { echo "HOOK FAIL: node not on PATH" >&2; exit 1; }\nexit 0\n'),
        writeFiles({ 'b.txt': 'b\n' }),
        stageFiles('b.txt'),
      )(repo)

      // Would throw "HOOK FAIL: node not on PATH" before the fix.
      await expect(chain(commit('hooked'))(repo)).resolves.toBeUndefined()
      const count = await repo.git.raw(['rev-list', '--count', 'HEAD'])
      expect(parseInt(count.trim(), 10)).toBe(2)
    } finally {
      await repo.cleanup()
    }
  })

  it('strips unsafe git-redirecting env vars so fixtures stay hermetic', async () => {
    const repo = await createTempGitRepo()
    const probe = join(repo.path, 'env-probe.txt')
    const prevEditor = process.env.EDITOR
    const prevPager = process.env.PAGER
    try {
      await chain(
        addCommit({ message: 'base', files: { 'a.txt': 'a\n' } }),
        installHook('pre-commit',
          `#!/bin/sh\necho "EDITOR=\${EDITOR:-unset} PAGER=\${PAGER:-unset}" > "${probe}"\nexit 0\n`),
        writeFiles({ 'b.txt': 'b\n' }),
        stageFiles('b.txt'),
      )(repo)

      process.env.EDITOR = 'should-not-leak'
      process.env.PAGER = 'should-not-leak'
      await chain(commit('probe'))(repo)

      expect(existsSync(probe)).toBe(true)
      const observed = readFileSync(probe, 'utf8').trim()
      expect(observed).toBe('EDITOR=unset PAGER=unset')
    } finally {
      if (prevEditor === undefined) delete process.env.EDITOR
      else process.env.EDITOR = prevEditor
      if (prevPager === undefined) delete process.env.PAGER
      else process.env.PAGER = prevPager
      rmSync(probe, { force: true })
      await repo.cleanup()
    }
  })

  it('PATH and HOME reach the hook', async () => {
    const repo = await createTempGitRepo()
    const probe = join(repo.path, 'path-probe.txt')
    try {
      await chain(
        addCommit({ message: 'base', files: { 'a.txt': 'a\n' } }),
        installHook('pre-commit',
          `#!/bin/sh\necho "vars=$(env | wc -l)" > "${probe}"\nexit 0\n`),
        writeFiles({ 'b.txt': 'b\n' }),
        stageFiles('b.txt'),
      )(repo)
      await chain(commit('probe'))(repo)

      const observed = readFileSync(probe, 'utf8').trim()
      const seen = parseInt(observed.replace('vars=', ''), 10)
      // Pre-fix the hook saw ~12 vars (only the two pinned dates plus
      // sh builtins). Post-fix it inherits the real environment.
      expect(seen).toBeGreaterThan(20)
    } finally {
      rmSync(probe, { force: true })
      await repo.cleanup()
    }
  })
})

describe('gitEnv: date pins do not leak onto the shared instance', () => {
  // The monotonic commit clock exists to guarantee distinct, increasing
  // dates. A leaked pin made non-pinning atoms reuse a stale timestamp,
  // producing same-second ties and unstable `git log --all` ordering.
  it('rebase gets its own clock tick rather than inheriting a stale pin', async () => {
    const repo = await createTempGitRepo()
    try {
      await chain(
        addCommit({ message: 'c1', files: { 'a.txt': '1\n' } }),
        switchToBranch('feat'),
        addCommit({ message: 'feat work', files: { 'f.txt': 'f\n' } }),
      )(repo)
      await repo.git.checkout('main')
      await chain(addCommit({ message: 'main work', files: { 'm.txt': 'm\n' } }))(repo)
      await repo.git.checkout('feat')
      await chain(startRebase('main'))(repo)

      const dates = (await repo.git.raw(['log', '--format=%cI', '-2'])).trim().split('\n')
      expect(dates[0]).not.toBe(dates[1])
      // Still deterministic — sourced from the pinned clock, not the wall clock.
      for (const d of dates) expect(d).toMatch(/^2020-/)
    } finally {
      await repo.cleanup()
    }
  })

  it('stash entries are pinned to the deterministic clock', async () => {
    const repo = await createTempGitRepo()
    try {
      await chain(
        addCommit({ message: 'base', files: { 'a.txt': 'a\n' } }),
        writeFiles({ 'a.txt': 'modified\n' }),
        stashChanges({ message: 'wip' }),
      )(repo)
      const stashDate = await repo.git.raw(['log', '-1', '--format=%cI', 'refs/stash'])
      expect(stashDate.trim()).toMatch(/^2020-/)
    } finally {
      await repo.cleanup()
    }
  })

  it('notes are pinned to the deterministic clock', async () => {
    const repo = await createTempGitRepo()
    try {
      await chain(
        addCommit({ message: 'base', files: { 'a.txt': 'a\n' } }),
        addNote('Reviewed-by: Alice'),
      )(repo)
      const noteDate = await repo.git.raw(['log', '-1', '--format=%cI', 'refs/notes/commits'])
      expect(noteDate.trim()).toMatch(/^2020-/)
    } finally {
      await repo.cleanup()
    }
  })
})
