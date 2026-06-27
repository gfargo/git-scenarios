/**
 * `<kebab-name>` — one-line description of the repo state.
 *
 * State after setup:
 *   - <bullet describing branch / HEAD state>
 *   - <bullet describing worktree state>
 *   - <bullet describing any operation in progress, if relevant>
 *
 * Used by <list tools / flows this scenario is designed to exercise>.
 *
 * DETERMINISM: never use `new Date()` or `Math.random()` here.
 * Let the commit atoms pin dates via the monotonic commit clock.
 * Use `seededFiles({ seed, files })` for generated content,
 * and `daysAgo(n)` only when you need a specific timeline.
 */

// When placed in src/scenarios/, adjust this import to '../atoms'.
// For external use (outside this repo), use '@gfargo/git-scenarios'.
import { addCommit, chain, defineScenario, switchToBranch } from '../atoms'

export const myNewScenario = defineScenario({
  // Kebab-case identifier — must be unique across all registered scenarios.
  name: 'my-new-scenario',

  // One-line description shown in `git-scenarios list` output.
  summary: 'Short description of the repo state',

  // Multi-line description shown in `git-scenarios describe <name>`.
  // Use an array joined with '\n' for readability.
  description: [
    'Full description of what the scenario sets up and why.',
    '',
    'Useful for testing:',
    '  - <use case 1>',
    '  - <use case 2>',
  ].join('\n'),

  // One of: 'branch' | 'worktree' | 'operation' | 'history' | 'stash' | 'submodule'
  kind: 'branch',

  // Optional tags for filtering with `git-scenarios list --tag <t>`.
  tags: ['example'],

  // Human-readable post-setup invariants. Each line becomes one `it()`
  // in the co-located test file.
  contracts: [
    'main has 1 commit',
    'feat/example is checked out',
    'worktree is clean',
  ],

  // The git-state factory. Compose atoms with chain().
  // All atoms run sequentially; any rejection short-circuits the chain.
  setup: chain(
    addCommit({
      message: 'chore: initial commit',
      files: { 'README.md': '# Example repo\n' },
    }),
    switchToBranch('feat/example'),
    addCommit({
      message: 'feat: add example module',
      files: { 'src/example.ts': 'export const example = true\n' },
    }),
  ),
})
