/**
 * `branch-ahead-of-upstream` — `main` is 3 commits ahead of
 * `origin/main`. The classic "I have commits to push" state.
 *
 * State after setup:
 *   - `main` is checked out with 6 commits total
 *   - `origin/main` points at HEAD~3 (3 commits behind main)
 *   - upstream tracking is configured
 *   - worktree is clean
 *
 * `git status` reports: "Your branch is ahead of 'origin/main' by 3 commits."
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

export const branchAheadOfUpstreamScenario = defineScenario({
  name: 'branch-ahead-of-upstream',
  summary: 'main is 3 commits ahead of origin/main, worktree clean',
  description: [
    '`main` has 3 unpushed commits — `origin/main` sits 3 commits behind.',
    'Upstream tracking is fully configured, so `git status` reports the',
    'ahead count.',
    '',
    'Useful for testing:',
    '  - push workflows / "publish your changes" prompts',
    '  - ahead-count rendering in branch lists and headers',
    '  - PR-creation flows that count unpushed commits',
  ].join('\n'),
  kind: 'branch',
  tags: ['upstream', 'tracking', 'ahead', 'remote'],
  contracts: [
    'main is checked out',
    'main has 6 commits',
    'main is 3 commits ahead of origin/main',
    'main tracks origin/main',
    'worktree is clean',
  ],
  setup: chain(
    addCommit({ message: 'chore: initial', files: { 'README.md': '# repo\n' } }),
    addCommit({ message: 'feat: baseline one', files: { 'src/a.ts': 'a\n' } }),
    addCommit({ message: 'feat: baseline two', files: { 'src/b.ts': 'b\n' } }),
    addRemote('origin', '/fake/url'),
    // origin/main pins to the baseline (HEAD at this point) ...
    setRemoteRef('origin', 'main', 'HEAD'),
    setUpstream('main', 'origin'),
    // ... and then we add 3 local-only commits that will be "ahead".
    addCommit({ message: 'feat: ahead one', files: { 'src/c.ts': 'c\n' } }),
    addCommit({ message: 'feat: ahead two', files: { 'src/d.ts': 'd\n' } }),
    addCommit({ message: 'feat: ahead three', files: { 'src/e.ts': 'e\n' } }),
  ),
})
