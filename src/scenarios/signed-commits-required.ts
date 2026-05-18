/**
 * `signed-commits-required` — repo configured to require GPG-signed
 * commits (`commit.gpgsign=true` + a `user.signingkey` placeholder).
 * Commits in the scenario itself are intentionally NOT signed — the
 * point is to set up the *config* so a tool can react to it.
 *
 * State after setup:
 *   - `main` is checked out with 3 commits (unsigned — the scenario
 *     creates them BEFORE flipping gpgsign on, since CI runners don't
 *     have a usable GPG key)
 *   - `commit.gpgsign` = true
 *   - `user.signingkey` = a placeholder value
 *   - worktree is clean
 *
 * EXTRACTION DISCIPLINE: no consumer-tool-specific imports.
 *
 * NOTE: a tool consuming this scenario can check `git config
 * commit.gpgsign` to know whether it's *expected* to sign — verifying
 * the signatures themselves requires a real GPG setup we can't
 * assume on CI.
 */

import { addCommit, chain, defineScenario, setConfig } from '../atoms'

export const signedCommitsRequiredScenario = defineScenario({
  name: 'signed-commits-required',
  summary: 'repo configured to require signed commits (commit.gpgsign=true + signingkey set)',
  description: [
    'Repo is configured to require GPG-signed commits. The pre-existing',
    'commits in the scenario are unsigned (the scenario sets the config',
    '*after* seeding history, since CI runners lack a usable GPG key).',
    '',
    'A tool can read `commit.gpgsign` and `user.signingkey` to detect',
    'the "signing required" state and adjust UI / warnings accordingly.',
    '',
    'Useful for testing:',
    '  - commit-signing prompts / warnings before commit',
    '  - "signing required" indicators in commit composers',
    '  - signing-key inspectors in repo settings views',
  ].join('\n'),
  kind: 'branch',
  contracts: [
    'main is checked out',
    'main has 3 commits',
    'commit.gpgsign is true',
    'user.signingkey is set',
    'worktree is clean',
  ],
  setup: chain(
    addCommit({ message: 'chore: initial', files: { 'README.md': '# repo\n' } }),
    addCommit({ message: 'feat: one', files: { 'src/one.ts': 'one\n' } }),
    addCommit({ message: 'feat: two', files: { 'src/two.ts': 'two\n' } }),
    // Flip the signing config on AFTER seeding. Subsequent commits
    // (if a test adds them) would now require a real key.
    setConfig('commit.gpgsign', 'true'),
    setConfig('user.signingkey', 'PLACEHOLDER_KEY_ID'),
  ),
})
