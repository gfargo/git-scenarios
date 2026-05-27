/**
 * `partial-stage` — a worktree where some files are staged and
 * others are modified-but-unstaged. The most common real-world
 * worktree shape: a developer in the middle of "let me commit the
 * good parts, keep iterating on the rest."
 *
 * State after setup:
 *   - `main` has 2 commits (baseline scaffold + tracked content)
 *   - 2 files are staged with new content
 *   - 2 files are modified but NOT staged (worktree-only edits)
 *   - 1 untracked file
 *
 * Distinct from `single-staged-file` (only staged) and
 * `dirty-many-files` (large dirty set spanning many dirs) —
 * `partial-stage` is the "small mixed state" tools render with
 * separate "Staged" and "Unstaged" sections.
 *
 * Useful for testing:
 *   - per-section status rendering (staged vs unstaged vs untracked)
 *   - "stage hunk" / "unstage hunk" affordances
 *   - tools that warn before committing only-some-of-the-changes
 */

import {
    addCommit,
    chain,
    defineScenario,
    stageFiles,
    writeFiles,
} from '../atoms'

export const partialStageScenario = defineScenario({
  name: 'partial-stage',
  summary: '2 staged + 2 modified-unstaged + 1 untracked — the "mixed worktree" shape',
  description: [
    'A worktree mid-development: some files staged for the next',
    'commit, others modified but kept out of the index, and one',
    'untracked scratch file. Models the "I only want to commit',
    'half of what I changed" pattern.',
    '',
    'Useful for testing:',
    '  - per-section status rendering (staged / unstaged / untracked)',
    '  - "stage hunk" / "unstage hunk" affordances',
    '  - commit-flow guards that warn about partial commits',
    '  - tools that visualize index-vs-worktree state separately',
  ].join('\n'),
  kind: 'worktree',
  tags: ['dirty', 'staged', 'unstaged', 'untracked', 'partial'],
  contracts: [
    'main has 2 commits',
    'exactly 2 staged files',
    'exactly 2 modified-but-unstaged files',
    'exactly 1 untracked file',
  ],
  setup: chain(
    // === baseline scaffold ===
    addCommit({
      message: 'chore: initial commit',
      files: { 'README.md': '# Mixed-state demo\n' },
    }),
    addCommit({
      message: 'chore: baseline content',
      files: {
        'src/auth.ts': 'export const auth = "v1"\n',
        'src/api.ts': 'export const api = "v1"\n',
        'src/utils.ts': 'export const util = "v1"\n',
        'src/types.ts': 'export type Status = "v1"\n',
      },
    }),

    // === 2 staged: ready-to-commit changes ===
    writeFiles({
      'src/auth.ts': 'export const auth = "v2 — refactored"\n',
      'src/api.ts': 'export const api = "v2 — new endpoint"\n',
    }),
    stageFiles('src/auth.ts', 'src/api.ts'),

    // === 2 unstaged: still-iterating changes ===
    writeFiles({
      'src/utils.ts': 'export const util = "v2 — WIP, not done"\n',
      'src/types.ts': 'export type Status = "v2 | v3" // exploring\n',
    }),

    // === 1 untracked: scratch file ===
    writeFiles({
      'scratch.md': '# Scratch notes\n\n- TODO: think about caching\n',
    }),
  ),
})
