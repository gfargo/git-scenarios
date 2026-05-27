/**
 * `monorepo-multi-package` — a workspaces-style monorepo with three
 * packages, each in different states. Models the "I changed two
 * out of three packages, the third is clean" pattern that monorepo-
 * aware tools render distinctly.
 *
 * State after setup:
 *   - `main` has 3 commits (root scaffold + per-package baselines)
 *   - root `package.json` declares `packages/*` workspaces
 *   - `packages/app` — clean, no changes
 *   - `packages/lib` — modified files, all staged (ready to commit)
 *   - `packages/cli` — modified files, NOT staged (worktree-only)
 *
 * Useful for testing:
 *   - monorepo-aware status views ("changes in lib + cli, app clean")
 *   - per-workspace commit flows
 *   - workspace-scoped diff/log filters
 *   - tools that group changes by package boundary
 */

import {
    addCommit,
    chain,
    defineScenario,
    stageFiles,
    writeFiles,
} from '../atoms'

export const monorepoMultiPackageScenario = defineScenario({
  name: 'monorepo-multi-package',
  summary: 'workspaces monorepo with 3 packages: app (clean), lib (staged), cli (unstaged)',
  description: [
    'A workspaces-style monorepo with three packages in distinct',
    'states: `app` is clean, `lib` has staged changes, `cli` has',
    'unstaged worktree edits. Root config declares `packages/*` as',
    'workspaces (npm/yarn/pnpm-style).',
    '',
    'Useful for testing:',
    '  - workspace-aware status views',
    '  - per-package commit flows',
    '  - workspace-scoped diff or log filters',
    '  - tools that group changes by package boundary',
  ].join('\n'),
  kind: 'worktree',
  tags: ['monorepo', 'workspaces', 'staged', 'unstaged'],
  contracts: [
    'main has 3 commits',
    'root package.json declares packages/* workspaces',
    'packages/app is clean (no staged or unstaged changes)',
    'packages/lib has staged changes',
    'packages/cli has unstaged changes',
  ],
  setup: chain(
    // === root scaffold ===
    addCommit({
      message: 'chore: scaffold workspace root',
      files: {
        'package.json':
          JSON.stringify(
            {
              name: 'monorepo',
              version: '0.1.0',
              private: true,
              workspaces: ['packages/*'],
            },
            null,
            2,
          ) + '\n',
        'README.md': '# Monorepo demo\n',
      },
    }),

    // === packages/app baseline ===
    addCommit({
      message: 'feat(app): scaffold app package',
      files: {
        'packages/app/package.json':
          JSON.stringify({ name: 'app', version: '0.1.0', main: 'src/index.ts' }, null, 2) + '\n',
        'packages/app/src/index.ts': 'export const app = "v1"\n',
      },
    }),

    // === packages/lib + packages/cli baseline ===
    addCommit({
      message: 'feat(lib,cli): scaffold lib + cli packages',
      files: {
        'packages/lib/package.json':
          JSON.stringify({ name: 'lib', version: '0.1.0', main: 'src/index.ts' }, null, 2) + '\n',
        'packages/lib/src/index.ts': 'export const lib = "v1"\n',
        'packages/cli/package.json':
          JSON.stringify({ name: 'cli', version: '0.1.0', bin: 'src/cli.ts' }, null, 2) + '\n',
        'packages/cli/src/cli.ts': 'export const cli = "v1"\n',
      },
    }),

    // === lib — staged changes ===
    writeFiles({
      'packages/lib/src/index.ts': 'export const lib = "v2 — improved API"\n',
      'packages/lib/src/helpers.ts': 'export const helper = () => null\n',
    }),
    stageFiles('packages/lib/src/index.ts', 'packages/lib/src/helpers.ts'),

    // === cli — unstaged changes ===
    writeFiles({
      'packages/cli/src/cli.ts': 'export const cli = "v2 — WIP"\n',
    }),
  ),
})
