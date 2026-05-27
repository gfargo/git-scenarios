/**
 * `chip-rendering-showcase` — every branch-tip-chip variant on screen
 * at once. Designed to exercise TUIs that render branch chips with
 * distinct visual treatment per kind (HEAD vs local vs remote-tracking).
 *
 * Why it exists: the upstream-tracking scenarios (`branch-ahead-of-upstream`
 * etc.) test individual states well but only show one or two chip kinds
 * at a time. This scenario stacks SIX commits, each carrying a different
 * chip variant, so a single screen of history hits every code path —
 * useful for visual regression checks and for verifying that a TUI's
 * chip colour logic correctly distinguishes:
 *
 *   - HEAD                      → "this is the current branch" (typically green)
 *   - Plain local branch        → "another local branch" (typically blue)
 *   - Local branch with slash   → also local, NOT remote (regression test
 *                                  for tools that use "slash means remote"
 *                                  as their heuristic — `feat/widgets`
 *                                  is local, not a remote ref)
 *   - Remote-tracking via origin → "upstream tip" (typically yellow)
 *   - Remote-tracking via upstream → another remote, different from origin,
 *                                  exercises multi-remote handling
 *   - Tag in trailing ref list  → tags belong off-chip, in the row's
 *                                  decoration list
 *
 * State after setup (6 commits on main, newest first):
 *
 *   * commit 6  HEAD -> main           ← green HEAD chip
 *   * commit 5  origin/main            ← yellow remote chip
 *   * commit 4  feat/widgets           ← blue local chip (slash, NOT remote)
 *   * commit 3  upstream/main          ← yellow remote chip (different remote)
 *   * commit 2  develop                ← blue local chip (plain, no slash)
 *   * commit 1  (no chip)              ← tag v0.1.0 in trailing decoration
 *
 * Upstream tracking is also configured: `main` tracks `origin/main`, so
 * `git status` reports "1 commit ahead of origin/main" — a useful side
 * effect for tests that exercise the status indicator alongside chips.
 *
 * EXTRACTION DISCIPLINE: no consumer-tool-specific imports.
 */

import {
    addCommit,
    addRemote,
    chain,
    createBranch,
    createTag,
    defineScenario,
    setRemoteRef,
    setUpstream,
} from '../atoms'

export const chipRenderingShowcaseScenario = defineScenario({
  name: 'chip-rendering-showcase',
  summary:
    '6-commit history with every branch-tip-chip variant visible at once (HEAD, local, slashy-local, two remotes, tag)',
  description: [
    'Every branch-tip-chip kind on screen at once. Six commits on `main`',
    'where each row in the history view exercises a different chip code',
    'path. Useful for:',
    '',
    '  - visual regression checks on TUIs that colour-code chip kinds',
    '  - verifying that "ref contains a slash" heuristics don\'t',
    '    misclassify local feature branches as remote',
    '  - multi-remote rendering (origin + upstream)',
    '  - confirming tag refs render in the trailing list, not as a chip',
    '',
    'Composed states:',
    '  - HEAD on `main` (current branch)',
    '  - `develop` local branch at commit 2 (plain, no slash)',
    '  - `feat/widgets` local branch at commit 4 (has a slash — regression',
    '    test for "slash = remote" heuristics)',
    '  - `origin` remote with `origin/main` pinned at commit 5',
    '  - `upstream` remote with `upstream/main` pinned at commit 3',
    '  - tag `v0.1.0` at commit 1',
    '  - `main` configured to track `origin/main` (1 ahead, 0 behind)',
  ].join('\n'),
  kind: 'history',
  tags: ['rendering', 'showcase', 'chips', 'history'],
  contracts: [
    'main is checked out',
    'main has 6 commits',
    'develop branch exists at commit 2',
    'feat/widgets branch exists at commit 4',
    'origin/main exists at commit 5',
    'upstream/main exists at commit 3',
    'tag v0.1.0 exists at commit 1',
    'main is 1 commit ahead of origin/main',
    'main tracks origin/main',
    'worktree is clean',
  ],
  setup: chain(
    // ── commit 1 ──────────────────────────────────────────────────
    // Initial commit. Tagged as v0.1.0 — the trailing-ref-list slot
    // for tag rendering tests.
    addCommit({
      message: 'chore: initial commit',
      files: {
        'README.md': '# Chip showcase\n\nFixture for branch-tip-chip rendering.\n',
        'package.json':
          JSON.stringify(
            { name: 'chip-showcase', version: '0.1.0' },
            null,
            2,
          ) + '\n',
      },
    }),
    createTag('v0.1.0'),

    // ── commit 2 ──────────────────────────────────────────────────
    // Baseline commit. Cap with a `develop` branch — plain (slashless)
    // local branch tip, the simplest "non-HEAD local" chip case.
    addCommit({
      message: 'feat: scaffold core module',
      files: { 'src/core.ts': 'export const core = "ready"\n' },
    }),
    createBranch('develop'),

    // ── commit 3 ──────────────────────────────────────────────────
    // Where `upstream/main` will pin. No local branch chips here, so
    // the upstream remote ref wins the chip slot. Tests multi-remote
    // chip rendering (the `upstream` remote, distinct from `origin`).
    addCommit({
      message: 'refactor: extract helpers',
      files: { 'src/helpers.ts': 'export const noop = () => {}\n' },
    }),
    addRemote('upstream', '/fake/upstream'),
    setRemoteRef('upstream', 'main', 'HEAD'),

    // ── commit 4 ──────────────────────────────────────────────────
    // Where `feat/widgets` will live. SLASHED local branch — the
    // critical case for tools that classify chips by ref shape. A
    // naive "slash = remote" heuristic mis-colours this as a remote
    // ref; correct classification recognizes it as local because the
    // prefix doesn't match a known remote name.
    addCommit({
      message: 'feat: add widget module',
      files: { 'src/widgets.ts': 'export const Widget = () => ({})\n' },
    }),
    createBranch('feat/widgets'),

    // ── commit 5 ──────────────────────────────────────────────────
    // Where `origin/main` will pin. Like commit 3 but for the
    // `origin` remote — yellow chip, no local competition.
    addCommit({
      message: 'feat: widget interactions',
      files: { 'src/widgets.ts': 'export const Widget = () => ({ click() {} })\n' },
    }),
    addRemote('origin', '/fake/origin'),
    setRemoteRef('origin', 'main', 'HEAD'),

    // ── commit 6 ──────────────────────────────────────────────────
    // HEAD. Green chip — the current branch.
    addCommit({
      message: 'feat: widget tests',
      files: { 'tests/widgets.test.ts': "import { Widget } from '../src/widgets'\n" },
    }),

    // Track origin/main so git status shows ahead/behind alongside
    // the chip showcase.
    setUpstream('main', 'origin'),
  ),
})
