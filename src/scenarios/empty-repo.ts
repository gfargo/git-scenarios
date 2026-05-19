/**
 * `empty-repo` — a freshly-initialized git repository with no commits,
 * no files, no remotes. The "what does your tool do on a brand-new
 * repo?" edge case.
 *
 * State after setup:
 *   - `git init` has run
 *   - user.name / user.email / commit.gpgsign are configured
 *   - HEAD is on `main` but the branch is **unborn** (no commits)
 *   - `git status` reports "No commits yet"
 *   - working tree is empty
 *   - no remotes, no tags, no stashes
 *
 * Why it exists: many TUIs ship without handling the empty-repo
 * gracefully — log views crash on missing HEAD, branch lists assume
 * at least one ref exists, status views render a no-op layout when
 * there's "nothing dirty" without distinguishing "you have no commits
 * yet" from "your worktree is clean." This scenario gives consumers a
 * clean fixture to exercise those code paths.
 *
 * Setup is a no-op (`chain()` with no steps) because `createTempGitRepo`
 * already produces this state — the scenario exists so the registry
 * carries the case explicitly and so `npm run scenario create empty-repo`
 * is a one-liner. The contract test below asserts the expected shape.
 *
 * EXTRACTION DISCIPLINE: no consumer-tool-specific imports.
 */

import { chain, defineScenario } from '../atoms'

export const emptyRepoScenario = defineScenario({
  name: 'empty-repo',
  summary: 'freshly-initialized repo, no commits, no files, no remotes',
  description: [
    'A `git init`\'d repo on `main` with zero commits. HEAD is unborn.',
    'Working tree empty. No remotes, tags, or stashes.',
    '',
    'Useful for testing:',
    '  - log / history views when there\'s no HEAD to resolve',
    '  - branch / tag / stash views when the underlying lists are empty',
    '  - status view distinguishing "no commits yet" from "clean worktree"',
    '  - the "create your first commit" affordance / empty-state copy',
    '',
    'Setup is a no-op because `createTempGitRepo` already produces this',
    'state; the scenario exists so consumers can name and target it via',
    'the registry alongside the rest.',
  ].join('\n'),
  kind: 'branch',
  contracts: [
    'HEAD is unborn (no commits)',
    'main is the current branch',
    'working tree is empty',
    'no remotes configured',
    'no tags',
    'no stashes',
  ],
  setup: chain(), // intentional no-op — createTempGitRepo bootstraps this state
})
