/**
 * `branch-tracking-upstream` — `main` has an upstream-tracking
 * configuration pointing at `origin/main`, and local + remote refs are
 * at the same commit. Worktree is clean.
 *
 * The simplest "tracked branch" baseline. Useful for verifying that a
 * tool shows tracking status, branch icons, or remote-aware UI when
 * the branch is fully synced.
 *
 * State after setup:
 *   - `main` is checked out with 3 commits
 *   - `origin/main` exists and points at the same commit
 *   - `branch.main.remote` = origin, `branch.main.merge` = refs/heads/main
 *   - worktree is clean
 *
 * EXTRACTION DISCIPLINE: no consumer-tool-specific imports.
 */

import {
    addCommit,
    addRemote,
    chain,
    defineScenario,
    setRemoteRef,
    setUpstream,
} from '../atoms'

export const branchTrackingUpstreamScenario = defineScenario({
  name: 'branch-tracking-upstream',
  summary: 'main tracks origin/main, both at the same commit, worktree clean',
  description: [
    'Baseline "tracked branch" state — `main` has its upstream set to',
    '`origin/main` and both refs point at the same commit. No divergence.',
    '',
    'Useful for testing:',
    '  - tooltips / status indicators that read tracking config',
    '  - branch view icons distinguishing tracked vs untracked branches',
    '  - "Your branch is up to date with \'origin/main\'" rendering',
  ].join('\n'),
  kind: 'branch',
  tags: ['upstream', 'tracking', 'synced', 'remote', 'clean'],
  contracts: [
    'main is checked out',
    'main has 3 commits',
    'origin/main exists at the same commit as main',
    'main is configured to track origin/main',
    'worktree is clean',
  ],
  setup: chain(
    addCommit({ message: 'chore: initial', files: { 'README.md': '# repo\n' } }),
    addCommit({ message: 'feat: one', files: { 'src/one.ts': 'export const one = 1\n' } }),
    addCommit({ message: 'feat: two', files: { 'src/two.ts': 'export const two = 2\n' } }),
    addRemote('origin', '/fake/url'),
    setRemoteRef('origin', 'main', 'HEAD'),
    setUpstream('main', 'origin'),
  ),
})
