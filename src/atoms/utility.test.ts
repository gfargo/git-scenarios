/**
 * Tests for utility atoms added in v0.6:
 *   - gitClean
 *   - writeGitignore / writeGitattributes
 *   - bulkCommits
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import {
    addCommit,
    bulkCommits,
    chain,
    gitClean,
    writeFiles,
    writeGitattributes,
    writeGitignore,
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

describe('gitClean', () => {
  it('removes untracked files (default args)', async () => {
    await withRepo(async (repo) => {
      await chain(
        seedMain,
        writeFiles({ 'untracked.ts': 'x', 'src/another.ts': 'y' }),
      )(repo)
      // Default git-clean removes only top-level untracked files (no -d)
      await gitClean()(repo)
      expect(existsSync(join(repo.path, 'untracked.ts'))).toBe(false)
      // src/ is a directory — without -d, git-clean leaves it
      expect(existsSync(join(repo.path, 'src/another.ts'))).toBe(true)
    })
  })

  it('removes untracked directories with directories: true', async () => {
    await withRepo(async (repo) => {
      await chain(
        seedMain,
        writeFiles({ 'untracked.ts': 'x', 'src/another.ts': 'y' }),
        gitClean({ directories: true }),
      )(repo)
      expect(existsSync(join(repo.path, 'untracked.ts'))).toBe(false)
      expect(existsSync(join(repo.path, 'src'))).toBe(false)
    })
  })

  it('does not touch tracked files', async () => {
    await withRepo(async (repo) => {
      await chain(
        seedMain,
        writeFiles({ 'untracked.ts': 'x' }),
        gitClean({ directories: true }),
      )(repo)
      // README is tracked, untracked.ts isn't
      expect(existsSync(join(repo.path, 'README.md'))).toBe(true)
      expect(existsSync(join(repo.path, 'untracked.ts'))).toBe(false)
    })
  })
})

describe('writeGitignore', () => {
  it('writes a .gitignore from a pattern array', async () => {
    await withRepo(async (repo) => {
      await writeGitignore(['node_modules', 'dist', '*.log'])(repo)
      const content = readFileSync(join(repo.path, '.gitignore'), 'utf8')
      expect(content).toBe('node_modules\ndist\n*.log\n')
    })
  })

  it('preserves existing newlines when given a string', async () => {
    await withRepo(async (repo) => {
      await writeGitignore('node_modules\ndist\n')(repo)
      const content = readFileSync(join(repo.path, '.gitignore'), 'utf8')
      expect(content).toBe('node_modules\ndist\n')
    })
  })

  it('actually causes git to ignore the patterns', async () => {
    await withRepo(async (repo) => {
      await chain(
        seedMain,
        writeGitignore(['*.log']),
        addCommit({ message: 'chore: gitignore' }),
        writeFiles({ 'debug.log': 'noise', 'src/index.ts': 'x' }),
      )(repo)
      const status = await repo.git.status()
      // *.log ignored — only src/index.ts shows as untracked
      expect(status.not_added).toContain('src/index.ts')
      expect(status.not_added).not.toContain('debug.log')
    })
  })
})

describe('writeGitattributes', () => {
  it('writes a .gitattributes from a rule array', async () => {
    await withRepo(async (repo) => {
      await writeGitattributes(['*.png binary', '*.md text=auto'])(repo)
      const content = readFileSync(join(repo.path, '.gitattributes'), 'utf8')
      expect(content).toBe('*.png binary\n*.md text=auto\n')
    })
  })
})

describe('bulkCommits', () => {
  it('produces N commits in order', async () => {
    await withRepo(async (repo) => {
      await chain(
        seedMain,
        bulkCommits([
          { message: 'feat: a', files: { 'a.ts': 'a\n' } },
          { message: 'feat: b', files: { 'b.ts': 'b\n' } },
          { message: 'feat: c', files: { 'c.ts': 'c\n' } },
        ]),
      )(repo)
      const log = await repo.git.log()
      expect(log.total).toBe(4)
      const subjects = log.all.map((e) => e.message.split('\n')[0])
      expect(subjects).toEqual(['feat: c', 'feat: b', 'feat: a', 'init'])
    })
  })

  it('produces empty commits when files is omitted', async () => {
    await withRepo(async (repo) => {
      await chain(
        seedMain,
        bulkCommits([
          { message: 'milestone 1' },
          { message: 'milestone 2' },
        ]),
      )(repo)
      const log = await repo.git.log()
      expect(log.total).toBe(3)
      expect(log.latest?.message).toBe('milestone 2')
    })
  })

  it('honors per-spec date', async () => {
    await withRepo(async (repo) => {
      await chain(
        seedMain,
        bulkCommits([
          { message: 'old', date: '2020-01-15T12:00:00Z' },
          { message: 'older', date: '2019-06-01T12:00:00Z' },
        ]),
      )(repo)
      const log = await repo.git.log()
      const olderEntry = log.all.find((e) => e.message.startsWith('older'))!
      const oldEntry = log.all.find((e) => e.message.startsWith('old\n') || e.message === 'old')!
      expect(new Date(olderEntry.date).getFullYear()).toBe(2019)
      expect(new Date(oldEntry.date).getFullYear()).toBe(2020)
    })
  })

  it('handles 50 commits efficiently', async () => {
    await withRepo(async (repo) => {
      const specs = Array.from({ length: 50 }, (_, i) => ({
        message: `commit ${i}`,
      }))
      await chain(seedMain, bulkCommits(specs))(repo)
      const log = await repo.git.log()
      expect(log.total).toBe(51)
    })
  }, 60_000)
})
