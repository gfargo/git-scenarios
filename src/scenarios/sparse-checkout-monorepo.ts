/**
 * `sparse-checkout-monorepo` — a monorepo with sparse checkout enabled,
 * filtering the working tree to only a subset of packages.
 *
 * State after setup:
 *   - `main` has 4 commits building out a monorepo structure with
 *     packages/app, packages/lib, packages/shared, and root config
 *   - Sparse checkout is enabled in cone mode with only `packages/app`
 *     and `packages/shared` checked out
 *   - `packages/lib` is NOT in the working tree (sparse-filtered)
 *   - Root files (package.json, README.md, tsconfig.json) are present
 *   - Worktree is clean
 *
 * Useful for testing:
 *   - Tools that detect sparse checkout and adjust file listings
 *   - Tree views that must hide sparse-filtered paths
 *   - Diff/status commands that should respect sparse boundaries
 *   - "Add to sparse set" workflows
 *
 * EXTRACTION DISCIPLINE: no coco-specific imports.
 *
 * NOTE: requires git >= 2.25.0 for sparse-checkout support.
 */

import {
  addCommit,
  chain,
  defineScenario,
  enableSparseCheckout,
} from '../atoms'

export const sparseCheckoutMonorepoScenario = defineScenario({
  name: 'sparse-checkout-monorepo',
  summary: 'monorepo with cone-mode sparse checkout filtering to 2 of 3 packages',
  description: [
    'A monorepo with three packages (app, lib, shared) where sparse',
    'checkout in cone mode restricts the working tree to only',
    '`packages/app` and `packages/shared`. The `packages/lib` directory',
    'exists in the repo but is NOT checked out on disk.',
    '',
    'Useful for testing:',
    '  - sparse-checkout-aware file tree rendering',
    '  - `git sparse-checkout list` detection',
    '  - tools that offer "add path to sparse set" actions',
    '  - status/diff flows that skip sparse-filtered paths',
  ].join('\n'),
  kind: 'worktree',
  tags: ['sparse-checkout', 'monorepo', 'cone-mode'],
  contracts: [
    'main is checked out',
    'main has 4 commits',
    'sparse checkout is enabled in cone mode',
    'packages/app is in the working tree',
    'packages/shared is in the working tree',
    'packages/lib is NOT in the working tree (sparse-filtered)',
    'worktree is clean',
  ],
  setup: chain(
    // Root scaffold
    addCommit({
      message: 'chore: initial monorepo scaffold',
      files: {
        'README.md': '# Monorepo\n\nA workspace with three packages.\n',
        'package.json': JSON.stringify(
          { name: 'monorepo', private: true, workspaces: ['packages/*'] },
          null,
          2,
        ) + '\n',
        'tsconfig.json': JSON.stringify(
          { compilerOptions: { strict: true, target: 'ES2022' } },
          null,
          2,
        ) + '\n',
      },
    }),

    // packages/app
    addCommit({
      message: 'feat: add packages/app',
      files: {
        'packages/app/package.json': JSON.stringify(
          { name: '@mono/app', version: '1.0.0', main: 'src/index.ts' },
          null,
          2,
        ) + '\n',
        'packages/app/src/index.ts': 'export function main() { return "app" }\n',
        'packages/app/src/routes.ts': 'export const routes = ["/", "/about"]\n',
      },
    }),

    // packages/lib (will be sparse-filtered out)
    addCommit({
      message: 'feat: add packages/lib',
      files: {
        'packages/lib/package.json': JSON.stringify(
          { name: '@mono/lib', version: '1.0.0', main: 'src/index.ts' },
          null,
          2,
        ) + '\n',
        'packages/lib/src/index.ts': 'export function helper() { return "lib" }\n',
        'packages/lib/src/utils.ts': 'export const utils = { format: (s: string) => s }\n',
      },
    }),

    // packages/shared
    addCommit({
      message: 'feat: add packages/shared',
      files: {
        'packages/shared/package.json': JSON.stringify(
          { name: '@mono/shared', version: '1.0.0', main: 'src/index.ts' },
          null,
          2,
        ) + '\n',
        'packages/shared/src/index.ts': 'export const shared = { version: "1.0.0" }\n',
        'packages/shared/src/types.ts': 'export type Config = { debug: boolean }\n',
      },
    }),

    // Enable sparse checkout — only app + shared (lib is excluded)
    enableSparseCheckout(['packages/app', 'packages/shared'], { cone: true }),
  ),
})
