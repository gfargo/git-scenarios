/**
 * `branch-sync-showcase` — every branch-upstream sync state on a
 * single repo, so a TUI's branch list can be designed and tested
 * against the full visual variety in one screen.
 *
 * Why it exists: the upstream-tracking scenarios shipped in v0.3.0
 * (`branch-ahead-of-upstream`, `branch-behind-upstream`, `branch-diverged`,
 * etc.) each pin one branch in one state. Useful for testing the
 * history / status surface in isolation, but a branches sidebar needs
 * to render MIXED states together: how does the user tell at a glance
 * which branches need a pull, which have local commits to push, which
 * are tracking nothing? This scenario stacks five local branches each
 * in a different sync state and checks out the "behind" one so the
 * history view also surfaces the "remote is ahead of local" case.
 *
 * Branches present after setup, in the order they appear in
 * `branchOverview.localBranches`:
 *
 *   - `main`               → BEHIND origin/main by 2 commits.
 *                            This is the CHECKED-OUT branch, so the
 *                            history view's "remote is ahead" affordance
 *                            should fire.
 *   - `feat/ahead-only`    → AHEAD of origin/feat/ahead-only by 3 commits.
 *                            The classic "you have unpushed work" state.
 *   - `feat/diverged`      → 2 AHEAD AND 2 BEHIND origin/feat/diverged.
 *                            The "pull --rebase / merge" state.
 *   - `feat/synced`        → fully synced with origin/feat/synced
 *                            (both at the same commit). The neutral
 *                            baseline that should look quiet in the list.
 *   - `local-only`         → NO UPSTREAM configured. A branch that lives
 *                            only on the local machine. Should render
 *                            with the "no upstream" marker.
 *
 * State after setup:
 *   - `main` is checked out
 *   - `origin` remote configured (URL is a placeholder)
 *   - Five local branches with the sync states above
 *   - Corresponding `refs/remotes/origin/<name>` refs for the four
 *     branches that have upstreams
 *   - All tracking branches have their `branch.<X>.remote` /
 *     `branch.<X>.merge` config set so `git status` reports
 *     ahead-behind counts for them
 *   - Worktree is clean
 *
 * EXTRACTION DISCIPLINE: no consumer-tool-specific imports.
 */

import {
    addCommit,
    addRemote,
    chain,
    checkoutBranch,
    defineScenario,
    setRemoteRef,
    setUpstream,
    switchToBranch,
    withRemoteTracking,
} from '../atoms'

export const branchSyncShowcaseScenario = defineScenario({
  name: 'branch-sync-showcase',
  summary:
    'five local branches in five different upstream sync states (behind / ahead / diverged / synced / no-upstream); HEAD on the behind branch',
  description: [
    'A single repo with five local branches, each in a different sync',
    'state relative to its `origin/` upstream:',
    '',
    '  - `main` (CHECKED OUT) — 2 commits BEHIND `origin/main`. Drives',
    '    "remote is ahead" surfacing in the history / status views.',
    '  - `feat/ahead-only` — 3 commits AHEAD of `origin/feat/ahead-only`.',
    '    Unpushed local work.',
    '  - `feat/diverged` — 2 AHEAD + 2 BEHIND `origin/feat/diverged`.',
    '    Needs pull --rebase / merge.',
    '  - `feat/synced` — fully synced with its upstream. Neutral baseline.',
    '  - `local-only` — NO UPSTREAM. Local-only branch.',
    '',
    'Useful for testing:',
    '  - Branches sidebar iconography across all sync states at once',
    '  - History view "remote is ahead" affordance (HEAD is on the behind branch)',
    '  - Per-branch pull / push hotkeys that act on the cursored branch',
    '  - Branch list filtering / sorting with mixed-state input',
  ].join('\n'),
  kind: 'branch',
  tags: ['upstream', 'tracking', 'showcase', 'remote'],
  contracts: [
    'main is checked out',
    'main is 2 commits behind origin/main',
    'feat/ahead-only is 3 commits ahead of origin/feat/ahead-only',
    'feat/diverged is 2 ahead and 2 behind origin/feat/diverged',
    'feat/synced is at the same commit as origin/feat/synced',
    'local-only has no upstream configured',
    'all four tracked branches have branch.<X>.remote = origin',
    'worktree is clean',
  ],
  setup: chain(
    // ── shared baseline ─────────────────────────────────────────────
    // Two commits on main that every branch forks from. These are the
    // commits the synced branch will mirror, and the "shared base" for
    // the diverged / ahead-only branches.
    addCommit({
      message: 'chore: initial commit',
      files: {
        'README.md': '# branch-sync-showcase\n\nFixture for branches-sidebar testing.\n',
        'package.json':
          JSON.stringify({ name: 'branch-sync-showcase', version: '0.1.0' }, null, 2) + '\n',
      },
    }),
    addCommit({
      message: 'feat: shared baseline module',
      files: { 'src/baseline.ts': 'export const baseline = true\n' },
    }),
    addRemote('origin', '/fake/origin'),

    // ── feat/synced — fully synced with origin/feat/synced ──────────
    // Branch off main, add a commit, pin origin/feat/synced at HEAD,
    // configure tracking. After this, main is still at the baseline.
    switchToBranch('feat/synced'),
    addCommit({
      message: 'feat: synced-branch work',
      files: { 'src/synced.ts': 'export const synced = "ok"\n' },
    }),
    setRemoteRef('origin', 'feat/synced', 'HEAD'),
    setUpstream('feat/synced', 'origin'),

    // ── feat/ahead-only — 3 commits ahead of origin/feat/ahead-only ─
    // Branch off main's baseline. Pin the remote at the baseline first
    // (so the upstream exists), then add 3 local-only commits.
    checkoutBranch('main'),
    switchToBranch('feat/ahead-only'),
    setRemoteRef('origin', 'feat/ahead-only', 'HEAD'),
    setUpstream('feat/ahead-only', 'origin'),
    addCommit({
      message: 'feat: ahead one',
      files: { 'src/ahead-1.ts': 'export const a1 = 1\n' },
    }),
    addCommit({
      message: 'feat: ahead two',
      files: { 'src/ahead-2.ts': 'export const a2 = 2\n' },
    }),
    addCommit({
      message: 'feat: ahead three',
      files: { 'src/ahead-3.ts': 'export const a3 = 3\n' },
    }),

    // ── feat/diverged — 2 ahead + 2 behind ──────────────────────────
    // Branch off main's baseline. Use withRemoteTracking to generate 2
    // upstream-only commits in the object DB and pin origin/feat/diverged
    // at the resulting tip. Then add 2 local-only commits to make the
    // local tip diverge from the upstream tip.
    checkoutBranch('main'),
    switchToBranch('feat/diverged'),
    withRemoteTracking('origin', 'feat/diverged', chain(
      addCommit({
        message: 'upstream: diverged 1',
        files: { 'src/diverged-up-1.ts': 'export const du1 = 1\n' },
      }),
      addCommit({
        message: 'upstream: diverged 2',
        files: { 'src/diverged-up-2.ts': 'export const du2 = 2\n' },
      }),
    )),
    setUpstream('feat/diverged', 'origin'),
    addCommit({
      message: 'local: diverged 1',
      files: { 'src/diverged-local-1.ts': 'export const dl1 = 1\n' },
    }),
    addCommit({
      message: 'local: diverged 2',
      files: { 'src/diverged-local-2.ts': 'export const dl2 = 2\n' },
    }),

    // ── local-only — no upstream configured ─────────────────────────
    // Branch off main's baseline. Don't add a remote ref or set upstream.
    // This branch lives only on the local machine.
    checkoutBranch('main'),
    switchToBranch('local-only'),
    addCommit({
      message: 'wip: local-only experiment',
      files: { 'src/local-only.ts': 'export const localOnly = "wip"\n' },
    }),

    // ── main — 2 commits BEHIND origin/main ─────────────────────────
    // Back on main. Use withRemoteTracking to generate 2 upstream-only
    // commits and pin origin/main at the resulting tip. Don't add any
    // local commits, so main stays at the baseline and is 2 BEHIND its
    // upstream.
    checkoutBranch('main'),
    withRemoteTracking('origin', 'main', chain(
      addCommit({
        message: 'upstream: main 1',
        files: { 'src/main-up-1.ts': 'export const mu1 = 1\n' },
      }),
      addCommit({
        message: 'upstream: main 2',
        files: { 'src/main-up-2.ts': 'export const mu2 = 2\n' },
      }),
    )),
    setUpstream('main', 'origin'),
  ),
})
