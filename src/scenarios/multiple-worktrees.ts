/**
 * `multiple-worktrees` — a repo with multiple linked worktrees, each
 * on a different branch. Tools that display worktree lists or allow
 * switching between them need this state.
 *
 * State after setup:
 *   - `main` is checked out in the primary worktree
 *   - 3 linked worktrees exist:
 *     - `feat/alpha` — one commit ahead of main
 *     - `feat/beta` — two commits ahead of main
 *     - `hotfix/urgent` — one commit ahead of main
 *   - All worktrees are clean (no uncommitted changes)
 *
 * EXTRACTION DISCIPLINE: no coco-specific imports.
 */

import {
    addCommit, chain,
    defineScenario
} from '../atoms'
import { join } from 'path'
import { mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import type { Step } from '../atoms/types'

/**
 * Helper that creates a worktree at a temp path and adds a commit to it.
 * We need dynamic paths since worktrees must be outside the main repo.
 */
function addWorktreeWithCommit(
  branch: string,
  commits: Array<{ message: string; files: Record<string, string> }>,
): Step {
  return async (repo) => {
    // Create the branch from main first
    await repo.git.raw(['branch', branch])

    // Create a temp dir for the worktree
    const wtPath = await mkdtemp(join(tmpdir(), `git-scenarios-wt-${branch.replace(/\//g, '-')}-`))
    await repo.git.raw(['worktree', 'add', wtPath, branch])

    // Make commits in the worktree
    const { simpleGit } = await import('simple-git')
    const wtGit = simpleGit(wtPath)
    for (const c of commits) {
      for (const [filePath, content] of Object.entries(c.files)) {
        const { mkdir, writeFile } = await import('fs/promises')
        const { dirname } = await import('path')
        const absPath = join(wtPath, filePath)
        await mkdir(dirname(absPath), { recursive: true })
        await writeFile(absPath, content)
      }
      await wtGit.add('.')
      await wtGit.commit(c.message)
    }
  }
}

export const multipleWorktreesScenario = defineScenario({
  name: 'multiple-worktrees',
  summary: 'primary worktree on main + 3 linked worktrees on feature/hotfix branches',
  description: [
    'A repository with multiple linked worktrees, each on a different',
    'branch. The primary worktree is on `main` with a baseline commit.',
    'Three linked worktrees exist at temp paths:',
    '  - `feat/alpha` — one commit ahead of main',
    '  - `feat/beta` — two commits ahead of main',
    '  - `hotfix/urgent` — one commit ahead of main',
    '',
    'Useful for testing:',
    '  - worktree list views',
    '  - branch switching when worktrees lock branches',
    '  - tools that detect and display linked worktrees',
    '  - the "branch is checked out in another worktree" error case',
  ].join('\n'),
  kind: 'worktree',
  tags: ['worktree', 'branch'],
  contracts: [
    'main is checked out in the primary worktree',
    '3 linked worktrees exist',
    'feat/alpha has 1 commit ahead of main',
    'feat/beta has 2 commits ahead of main',
    'hotfix/urgent has 1 commit ahead of main',
  ],
  setup: chain(
    addCommit({
      message: 'chore: initial scaffold',
      files: {
        'README.md': '# Multi-Worktree Project\n',
        'src/index.ts': 'export const app = {}\n',
      },
    }),
    addWorktreeWithCommit('feat/alpha', [
      { message: 'feat: alpha feature', files: { 'src/alpha.ts': 'export const alpha = true\n' } },
    ]),
    addWorktreeWithCommit('feat/beta', [
      { message: 'feat: beta part 1', files: { 'src/beta.ts': 'export const beta = 1\n' } },
      { message: 'feat: beta part 2', files: { 'src/beta.ts': 'export const beta = 2\n' } },
    ]),
    addWorktreeWithCommit('hotfix/urgent', [
      { message: 'fix: critical hotfix', files: { 'src/hotfix.ts': 'export const fix = true\n' } },
    ]),
  ),
})
