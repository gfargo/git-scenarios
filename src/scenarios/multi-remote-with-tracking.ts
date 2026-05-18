/**
 * `multi-remote-with-tracking` — a fork-style repo with two remotes
 * (`origin` and `upstream`) and a local branch tracking each.
 *
 * State after setup:
 *   - `origin` and `upstream` remotes are configured
 *   - `main` tracks `upstream/main` (the fork-source pattern: track the
 *     upstream project's main, push to your own origin)
 *   - `feat/fork-work` tracks `origin/feat/fork-work` (your fork's branch)
 *   - `main` and `upstream/main` are at the same commit
 *   - `feat/fork-work` is 2 commits ahead of `origin/feat/fork-work`
 *   - `feat/fork-work` is checked out
 *   - worktree is clean
 *
 * The "fork workflow" baseline — common when contributing to OSS where
 * `upstream` is the source repo and `origin` is your fork.
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
  switchToBranch,
} from '../atoms'

export const multiRemoteWithTrackingScenario = defineScenario({
  name: 'multi-remote-with-tracking',
  summary: 'origin + upstream remotes; main tracks upstream/main, feat/fork-work tracks origin',
  description: [
    'The "OSS fork contributor" baseline. Two remotes configured:',
    '`origin` (your fork) and `upstream` (the source project). `main`',
    'tracks `upstream/main` so you can pull source-project changes;',
    '`feat/fork-work` tracks your fork\'s branch for PR work.',
    '',
    'Useful for testing:',
    '  - multi-remote rendering in the remotes / branches views',
    '  - per-branch upstream resolution (different remotes per branch)',
    '  - "which remote does this branch track?" inspectors',
  ].join('\n'),
  kind: 'branch',
  contracts: [
    'origin and upstream remotes are configured',
    'feat/fork-work is checked out',
    'main tracks upstream/main',
    'feat/fork-work tracks origin/feat/fork-work',
    'feat/fork-work is 2 commits ahead of origin/feat/fork-work',
    'main and upstream/main are at the same commit',
    'worktree is clean',
  ],
  setup: chain(
    addCommit({ message: 'chore: initial', files: { 'README.md': '# fork\n' } }),
    addCommit({ message: 'feat: baseline', files: { 'src/baseline.ts': 'b\n' } }),
    addRemote('origin', '/fake/origin'),
    addRemote('upstream', '/fake/upstream'),
    // main tracks upstream/main (the source project's main).
    setRemoteRef('upstream', 'main', 'HEAD'),
    setUpstream('main', 'upstream'),
    // Now switch to the fork-work branch and set it tracking origin.
    switchToBranch('feat/fork-work'),
    addCommit({ message: 'feat: scaffold fork work', files: { 'src/fork.ts': 'f\n' } }),
    setRemoteRef('origin', 'feat/fork-work', 'HEAD'),
    setUpstream('feat/fork-work', 'origin'),
    // Add 2 unpushed commits to the fork branch.
    addCommit({ message: 'feat: fork work one', files: { 'src/f1.ts': '1\n' } }),
    addCommit({ message: 'feat: fork work two', files: { 'src/f2.ts': '2\n' } }),
  ),
})
