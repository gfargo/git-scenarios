/**
 * `git-lfs-pointer` — repo that records a Git LFS pointer file for a
 * binary asset. No `git-lfs` binary is required: the pointer is written
 * directly as plain text so the scenario works on every platform and CI
 * runner without the LFS extension installed.
 *
 * State after setup:
 *   - `main` is checked out with 2 commits
 *   - `.gitattributes` marks `*.bin` as LFS-tracked
 *     (`filter=lfs diff=lfs merge=lfs -text`)
 *   - `assets/blob.bin` contains a canonical LFS pointer (hardcoded
 *     oid/size constants — no real LFS object)
 *   - worktree is clean
 *
 * EXTRACTION DISCIPLINE: no consumer-tool-specific imports.
 *
 * PLATFORM NOTES:
 *   - The `-text` attribute prevents CRLF mangling of the pointer text on
 *     Windows — always required for LFS pointer files.
 *   - Calling `git lfs checkout` or `git lfs pull` will fail if `git-lfs`
 *     is not installed; test only the pointer format and attribute rules.
 *   - The oid and size in `assets/blob.bin` are hardcoded constants that
 *     do not correspond to any real LFS object.
 */

import { addCommit, chain, defineScenario, writeFiles, writeGitattributes } from '../atoms'

const LFS_POINTER =
  'version https://git-lfs.github.com/spec/v1\n' +
  'oid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2393\n' +
  'size 12345\n'

export const gitLfsPointerScenario = defineScenario({
  name: 'git-lfs-pointer',
  summary:
    'repo with a Git LFS pointer file committed for a binary asset (no lfs binary required)',
  description: [
    'A binary asset (`assets/blob.bin`) is tracked by Git LFS. The file on',
    'disk is the plain-text *pointer stub* — the real binary object would',
    'live on an LFS server that this scenario does not configure.',
    '',
    '`.gitattributes` marks `*.bin` with `filter=lfs diff=lfs merge=lfs -text`.',
    'The `-text` attribute is required to prevent CRLF mangling of the pointer',
    'text on Windows.',
    '',
    'Platform notes:',
    '  - No `git-lfs` binary is needed — the pointer is written as plain text,',
    '    so the scenario passes everywhere without the LFS extension installed.',
    '  - Tools that call `git lfs checkout` or `git lfs pull` will fail unless',
    '    `git-lfs` is installed; test only pointer detection and attribute rules.',
    '  - The oid and size in `assets/blob.bin` are hardcoded constants and do',
    '    not correspond to any real LFS object.',
    '',
    'Useful for testing:',
    '  - LFS pointer detection ("is this file an LFS pointer?")',
    '  - UI badges or warnings for LFS-managed paths',
    '  - `.gitattributes` rule parsing (`filter=lfs`, `diff=lfs`, `-text`)',
  ].join('\n'),
  kind: 'worktree',
  tags: ['lfs', 'encoding', 'gitattributes', 'cross-platform'],
  contracts: [
    'main is checked out',
    'main has 2 commits',
    '.gitattributes marks *.bin as LFS-tracked (filter=lfs diff=lfs merge=lfs -text)',
    'assets/blob.bin contains a canonical LFS pointer (version + oid sha256 + size)',
    'worktree is clean',
  ],
  setup: chain(
    addCommit({ message: 'chore: initial', files: { 'README.md': '# repo\n' } }),
    writeGitattributes(['*.bin filter=lfs diff=lfs merge=lfs -text']),
    writeFiles({ 'assets/blob.bin': LFS_POINTER }),
    addCommit({ message: 'feat: add lfs-tracked binary asset' }),
  ),
})
