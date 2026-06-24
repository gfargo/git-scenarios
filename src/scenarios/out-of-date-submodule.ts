/**
 * `out-of-date-submodule` — a parent repo whose pinned submodule SHA is
 * behind the submodule's current HEAD.
 *
 * State after setup:
 *   - parent `main` has 2 commits:
 *       1. chore: initial scaffold
 *       2. chore: add vendor/lib submodule  (pins submodule at 2-commit HEAD)
 *   - submodule at `vendor/lib` has 3 commits:
 *       1. chore: initial scaffold
 *       2. feat: initial API
 *       3. feat: add extras  (added AFTER the parent's pin — out of date)
 *   - `git submodule status` shows `+` for `vendor/lib` (pin lags HEAD)
 *   - parent worktree is clean
 *
 * Useful for testing the "update submodule" flow: the parent is pinned
 * to the submodule's commit 2, while the submodule is at commit 3. The
 * difference is visible via `git submodule status` (leading `+`).
 *
 * EXTRACTION DISCIPLINE: no coco-specific imports.
 */

import { addCommit, addSubmodule, chain, defineScenario, insideSubmodule, seededFiles } from '../atoms'

const SUBMODULE_SEED = 0x0d5b_c001

export const outOfDateSubmoduleScenario = defineScenario({
  name: 'out-of-date-submodule',
  summary: 'parent pinned to an older submodule SHA while the submodule has moved ahead',
  description: [
    'A parent repo whose pinned submodule SHA (`vendor/lib`) is one commit',
    'behind the submodule\'s current HEAD. The parent committed the',
    'submodule when it had 2 commits; a third commit was then added',
    'inside the submodule without updating the parent\'s pin.',
    '`git submodule status` shows `+` for `vendor/lib`, indicating the',
    'checked-out submodule HEAD differs from the parent\'s recorded SHA.',
    '',
    'Useful for testing:',
    '  - out-of-date submodule detection and `+` status flag display',
    '  - "update submodule pin" workflows (`git add vendor/lib` + commit)',
    '  - diff between the pinned SHA and the current submodule HEAD',
    '  - `git submodule update` to restore the pinned state',
  ].join('\n'),
  kind: 'submodule',
  tags: ['submodule', 'out-of-date', 'in-progress'],
  contracts: [
    'parent main has 2 commits',
    '.gitmodules registers vendor/lib',
    'git submodule status shows + for vendor/lib',
    'vendor/lib HEAD is 1 commit ahead of the parent pin',
  ],
  setup: chain(
    addCommit({
      message: 'chore: initial scaffold',
      files: {
        'README.md': '# Parent\n',
        'src/index.ts': 'export {}\n',
      },
    }),
    // Build the submodule with 2 commits and add it to the parent.
    addSubmodule({
      path: 'vendor/lib',
      branch: 'main',
      setup: chain(
        addCommit({
          message: 'chore: initial scaffold',
          files: { 'README.md': '# vendor-lib\n' },
        }),
        seededFiles({ files: [{ path: 'src/index.ts', tokens: 60 }], seed: SUBMODULE_SEED }),
        addCommit({ message: 'feat: initial API' }),
      ),
    }),
    // Parent pins the submodule at its 2-commit HEAD.
    addCommit({ message: 'chore: add vendor/lib submodule' }),
    // Advance the submodule without updating the parent's pin.
    // This creates the out-of-date state: parent still points at
    // commit 2 while the submodule HEAD is at commit 3.
    insideSubmodule(
      'vendor/lib',
      chain(
        seededFiles({ files: [{ path: 'src/extras.ts', tokens: 50 }], seed: SUBMODULE_SEED + 1 }),
        addCommit({ message: 'feat: add extras' }),
      ),
    ),
  ),
})
