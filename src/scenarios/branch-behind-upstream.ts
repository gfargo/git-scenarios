/**
 * `branch-behind-upstream` — `main` is 3 commits behind
 * `origin/main`. The "I need to pull" state.
 *
 * State after setup:
 *   - `main` is checked out with 2 commits
 *   - `origin/main` has those 2 commits PLUS 3 more (5 total)
 *   - upstream tracking is configured
 *   - worktree is clean
 *
 * `git status` reports: "Your branch is behind 'origin/main' by 3 commits,
 * and can be fast-forwarded."
 *
 * Uses `withRemoteTracking` to generate the upstream-only commits in
 * the object DB.
 *
 * EXTRACTION DISCIPLINE: no consumer-tool-specific imports.
 */

import {
    addCommit,
    addRemote,
    chain,
    defineScenario,
    setUpstream,
    withRemoteTracking,
} from '../atoms'

export const branchBehindUpstreamScenario = defineScenario({
  name: 'branch-behind-upstream',
  summary: 'main is 3 commits behind origin/main, worktree clean',
  description: [
    '`main` is fast-forwardable — `origin/main` has 3 commits the local',
    'branch doesn\'t. Upstream tracking is configured so `git status`',
    'reports the behind count.',
    '',
    'Useful for testing:',
    '  - pull workflows / "update available" prompts',
    '  - behind-count rendering in branch lists and headers',
    '  - "fast-forward possible" indicators',
  ].join('\n'),
  kind: 'branch',
  tags: ['upstream', 'tracking', 'behind', 'remote', 'fast-forward'],
  contracts: [
    'main is checked out',
    'main has 2 commits',
    'main is 3 commits behind origin/main',
    'main tracks origin/main',
    'worktree is clean',
  ],
  setup: chain(
    addCommit({ message: 'chore: initial', files: { 'README.md': '# repo\n' } }),
    addCommit({ message: 'feat: shared baseline', files: { 'src/baseline.ts': 'b\n' } }),
    addRemote('origin', '/fake/url'),
    // Generate 3 upstream-only commits on top of the current main.
    withRemoteTracking('origin', 'main', chain(
      addCommit({ message: 'upstream feat one', files: { 'src/u1.ts': 'u1\n' } }),
      addCommit({ message: 'upstream feat two', files: { 'src/u2.ts': 'u2\n' } }),
      addCommit({ message: 'upstream feat three', files: { 'src/u3.ts': 'u3\n' } }),
    )),
    setUpstream('main', 'origin'),
  ),
})
