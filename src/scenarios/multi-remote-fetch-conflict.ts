/**
 * `multi-remote-fetch-conflict` — a repo with two remotes where the
 * same branch diverges between them, creating a "which remote is
 * authoritative?" situation.
 *
 * State after setup:
 *   - `origin` and `upstream` remotes are configured
 *   - `main` is checked out with 3 commits
 *   - `origin/main` is 2 commits ahead of local `main` (has new work)
 *   - `upstream/main` is 1 commit ahead of local `main` (different new work)
 *   - `origin/main` and `upstream/main` have DIVERGED from each other
 *     (they share the local base but each added different commits)
 *   - `main` tracks `origin/main` (standard clone pattern)
 *   - worktree is clean
 *
 * Useful for testing:
 *   - Tools that detect multi-remote divergence
 *   - "Which remote to pull from?" decision flows
 *   - Branch sync views showing per-remote ahead/behind
 *   - Fetch-all-remotes workflows
 *
 * EXTRACTION DISCIPLINE: no coco-specific imports.
 */

import {
  addCommit,
  addRemote,
  chain,
  defineScenario,
  setRemoteRef,
  setUpstream,
  withRemoteTracking,
} from '../atoms'

export const multiRemoteFetchConflictScenario = defineScenario({
  name: 'multi-remote-fetch-conflict',
  summary: 'two remotes with diverged main branches — origin/main and upstream/main conflict',
  description: [
    'A repo cloned from `origin` where `upstream` (the source project)',
    'has also advanced. Both `origin/main` and `upstream/main` have',
    'commits not present in the other, creating a divergence that tools',
    'need to surface and help the user resolve.',
    '',
    'This differs from `multi-remote-with-tracking` (which is a clean',
    'fork workflow) by introducing actual remote-to-remote divergence',
    'that requires the user to decide which remote is authoritative.',
    '',
    'Useful for testing:',
    '  - per-remote divergence indicators in branch views',
    '  - "fetch all remotes" + merge/rebase decision flows',
    '  - remote comparison / diff views',
    '  - pull strategy selection (rebase vs merge vs fast-forward)',
  ].join('\n'),
  kind: 'branch',
  tags: ['multi-remote', 'diverged', 'fetch', 'remote'],
  contracts: [
    'main is checked out',
    'main has 3 commits',
    'origin and upstream remotes are configured',
    'main tracks origin/main',
    'main is 2 commits behind origin/main',
    'upstream/main is 1 commit ahead of local main',
    'origin/main and upstream/main have diverged (different tips)',
    'worktree is clean',
  ],
  setup: chain(
    // Local baseline: 3 commits on main
    addCommit({
      message: 'chore: initial scaffold',
      files: {
        'README.md': '# Project\n\nA multi-remote project.\n',
        'package.json': JSON.stringify(
          { name: 'multi-remote-project', version: '1.0.0' },
          null,
          2,
        ) + '\n',
      },
    }),
    addCommit({
      message: 'feat: add core module',
      files: { 'src/core.ts': 'export const core = { version: 1 }\n' },
    }),
    addCommit({
      message: 'feat: add helpers',
      files: { 'src/helpers.ts': 'export function help() { return "ok" }\n' },
    }),

    // Configure remotes
    addRemote('origin', '/fake/origin'),
    addRemote('upstream', '/fake/upstream'),

    // Pin origin/main at local HEAD (the shared base)
    setRemoteRef('origin', 'main', 'HEAD'),
    setUpstream('main', 'origin'),

    // Pin upstream/main at local HEAD too (shared base)
    setRemoteRef('upstream', 'main', 'HEAD'),

    // origin/main advances by 2 commits (e.g., team pushed new features)
    withRemoteTracking('origin', 'main', chain(
      addCommit({
        message: 'feat(origin): add dashboard module',
        files: { 'src/dashboard.ts': 'export const dashboard = { ready: true }\n' },
      }),
      addCommit({
        message: 'feat(origin): add analytics',
        files: { 'src/analytics.ts': 'export function track(event: string) {}\n' },
      }),
    )),

    // upstream/main advances by 1 commit (source project pushed a fix)
    withRemoteTracking('upstream', 'main', chain(
      addCommit({
        message: 'fix(upstream): patch security vulnerability',
        files: { 'src/core.ts': 'export const core = { version: 2, patched: true }\n' },
      }),
    )),
  ),
})
