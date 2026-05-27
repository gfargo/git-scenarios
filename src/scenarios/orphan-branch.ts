/**
 * `orphan-branch` — a repo with a branch that has no shared history
 * with `main`. The classic "gh-pages" pattern: a separate root commit
 * dedicated to documentation or assets that lives parallel to the
 * code branch.
 *
 * State after setup:
 *   - `main` has 2 commits forming the regular code history
 *   - `gh-pages` is checked out and has its own root commit (no
 *     ancestor relationship with `main`)
 *   - `git merge-base main gh-pages` returns nothing — they share
 *     no commits
 *
 * Tools that assume all branches descend from a single root break
 * here. Useful for surfacing those edge cases.
 *
 * Useful for testing:
 *   - branch listings that show a "no common ancestor" state
 *   - merge-base / fork-point logic
 *   - tools that assume a single repo root
 *   - gh-pages workflow rendering
 */

import {
    addCommit,
    chain,
    checkoutBranch,
    defineScenario,
} from '../atoms'

import type { Step } from '../atoms'

/**
 * Create + check out an orphan branch via `git checkout --orphan`.
 * Inline atom — small enough not to merit its own file.
 */
const orphanCheckout = (name: string): Step => async (repo) => {
  await repo.git.raw(['checkout', '--orphan', name])
  // Orphan branches start with the index inherited from the previous
  // branch — clear it so the first commit is genuinely a fresh root.
  await repo.git.raw(['rm', '-rf', '--cached', '.'])
}

export const orphanBranchScenario = defineScenario({
  name: 'orphan-branch',
  summary: 'main + gh-pages with no shared history (orphan branch)',
  description: [
    'A repository with two unrelated branches: `main` carries the',
    'regular code history, and `gh-pages` is an orphan with its own',
    'root commit and no ancestor relationship with `main`. The',
    'classic GitHub Pages pattern.',
    '',
    'Useful for testing:',
    '  - branch listings that show "no common ancestor"',
    '  - merge-base / fork-point logic',
    '  - tools that assume a single repo root',
    '  - gh-pages workflow rendering',
  ].join('\n'),
  kind: 'branch',
  tags: ['orphan', 'unrelated-history', 'gh-pages'],
  contracts: [
    'main has 2 commits',
    'gh-pages is checked out',
    'gh-pages has 1 commit',
    'main and gh-pages share no common ancestor',
  ],
  setup: chain(
    // === main: regular history ===
    addCommit({
      message: 'chore: initial commit',
      files: { 'README.md': '# repo\n', 'src/index.ts': 'export const v = 1\n' },
    }),
    addCommit({
      message: 'feat: add module',
      files: { 'src/module.ts': 'export const m = 2\n' },
    }),

    // === gh-pages: orphan branch ===
    orphanCheckout('gh-pages'),
    addCommit({
      message: 'docs: scaffold gh-pages site',
      files: {
        'index.html': '<!DOCTYPE html>\n<html><body><h1>Docs</h1></body></html>\n',
        'style.css': 'body { font-family: sans-serif; }\n',
      },
    }),

    // Stay on gh-pages — that's the contract. If a test wants to
    // start from main, it can switch in its setup.
    checkoutBranch('gh-pages'),
  ),
})
