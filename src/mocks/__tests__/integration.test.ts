/**
 * Integration validation: mock vs real repo.
 *
 * Spins up real scenarios via `spinUpScenario`, captures their
 * `git.status()` output, and structurally compares counts and
 * properties against `mockFromScenario()` output.
 *
 * Only compares COUNTS and structural properties — not exact file
 * paths (real repos have real filenames, mocks use placeholders).
 */

import { spinUpScenario } from '../../index'
import { mockFromScenario } from '../scenarioMocks'
import type { TempGitRepo } from '../../tempGitRepo'

describe('integration: mock vs real repo', () => {
  describe('partial-stage scenario', () => {
    it(
      'mock counts match real repo status counts',
      async () => {
        let repo: TempGitRepo | undefined
        try {
          repo = await spinUpScenario('partial-stage')
          const realStatus = await repo.git.status()
          const mock = mockFromScenario('partial-stage')

          // Staged count
          expect(mock.status.staged.length).toBe(realStatus.staged.length)

          // Modified count — simple-git includes staged files in `modified`
          // (any file with M in either X or Y position). The mock's `modified`
          // represents worktree-only modifications (contract: "modified-but-unstaged").
          // Compare: mock.modified.length == real modified files NOT in staged.
          const realWorktreeOnly = realStatus.modified.filter(
            (f) => !realStatus.staged.includes(f),
          )
          expect(mock.status.modified.length).toBe(realWorktreeOnly.length)

          // Untracked (not_added) count
          expect(mock.status.not_added.length).toBe(realStatus.not_added.length)
          // Current branch
          expect(mock.status.current).toBe(realStatus.current)
        } finally {
          await repo?.cleanup()
        }
      },
      30_000,
    )
  })

  describe('mid-merge-conflict scenario', () => {
    it(
      'mock conflicted count matches real repo conflicted count',
      async () => {
        let repo: TempGitRepo | undefined
        try {
          repo = await spinUpScenario('mid-merge-conflict')
          const realStatus = await repo.git.status()
          const mock = mockFromScenario('mid-merge-conflict')

          // Conflicted file count
          expect(mock.status.conflicted.length).toBe(realStatus.conflicted.length)
          // Current branch
          expect(mock.status.current).toBe(realStatus.current)
        } finally {
          // Abort the merge before cleanup to avoid cleanup issues
          try {
            await repo?.git.raw(['merge', '--abort'])
          } catch {
            /* ignore */
          }
          await repo?.cleanup()
        }
      },
      30_000,
    )
  })
})
