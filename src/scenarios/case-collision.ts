/**
 * `case-collision` — repo whose git history contains two paths that differ
 * only by case: `src/File.ts` (PascalCase) and `src/file.ts` (lowercase).
 * These co-exist in the git object store but collide on case-insensitive
 * filesystems (macOS and Windows default).
 *
 * State after setup:
 *   - `main` is checked out with 2 commits
 *   - HEAD tree records both `src/File.ts` and `src/file.ts`
 *   - `core.ignoreCase = false` is set explicitly so git treats the two
 *     paths as distinct on all host platforms
 *   - both case variants are absent from the working tree (they exist only
 *     in git's history, not on disk)
 *
 * EXTRACTION DISCIPLINE: no consumer-tool-specific imports.
 *
 * PLATFORM NOTES:
 *   - Linux (case-sensitive FS): `git checkout HEAD -- src/` would create
 *     both files without conflict. Both appear as "deleted" in the working
 *     tree because the scenario intentionally leaves them off disk.
 *   - macOS / Windows (case-insensitive FS, the default): the OS treats
 *     `src/File.ts` and `src/file.ts` as the same path. Checking out this
 *     commit would silently overwrite one variant with the other — the
 *     classic cross-platform footgun this scenario is designed to expose.
 *   - `core.ignoreCase=false` is set after `git init` so that git exposes
 *     both entries on all platforms, including macOS where `git init`
 *     auto-detects `ignoreCase=true`.
 *   - Both paths are reachable from git's object store via plumbing:
 *       git show HEAD:src/File.ts
 *       git show HEAD:src/file.ts
 *       git ls-tree -r HEAD
 *
 * Useful for testing:
 *   - Case-collision detection and warnings in status / diff views
 *   - Tools that verify a repo is safe to clone on case-insensitive FS
 *   - `git ls-tree` output parsing (two entries, same directory, case only)
 */

import { join } from 'node:path'
import { unlink } from 'node:fs/promises'
import { addCommit, chain, defineScenario } from '../atoms'
import { datePin, gitAt } from '../atoms/gitEnv'
import { nextCommitDate } from '../commitClock'

export const caseCollisionScenario = defineScenario({
  name: 'case-collision',
  summary:
    'repo whose history holds src/File.ts and src/file.ts — a case-only path collision invisible on case-insensitive filesystems',
  description: [
    'The git object store contains two paths that differ only by case:',
    '`src/File.ts` (PascalCase) and `src/file.ts` (lowercase). They',
    'co-exist in git\'s history but collide on case-insensitive filesystems.',
    '',
    'Both entries are accessible via git plumbing regardless of platform:',
    '  git show HEAD:src/File.ts   # the PascalCase variant',
    '  git show HEAD:src/file.ts   # the lowercase variant',
    '  git ls-tree -r HEAD         # lists both as distinct paths',
    '',
    'Platform notes:',
    '  - Linux (case-sensitive FS): `git checkout HEAD -- src/` creates both',
    '    files without conflict. The scenario leaves them off disk — both',
    '    show as "deleted" in the working tree.',
    '  - macOS / Windows (case-insensitive FS, the default): the OS maps',
    '    `File.ts` and `file.ts` to the same physical inode. Checking out',
    '    the commit silently overwrites one variant with the other, losing',
    '    data. This is the cross-platform footgun the scenario documents.',
    '  - `core.ignoreCase=false` is set explicitly so git exposes both',
    '    entries on all host platforms, including macOS where `git init`',
    '    would otherwise auto-detect `ignoreCase=true`.',
    '',
    'Useful for testing:',
    '  - Case-collision detection and warnings in status / diff views',
    '  - Tools that verify a repo is safe to clone on case-insensitive FS',
    '  - `git ls-tree` output parsing (two entries, same prefix, case only)',
  ].join('\n'),
  kind: 'worktree',
  tags: ['case-collision', 'filesystem', 'cross-platform'],
  contracts: [
    'main is checked out',
    'main has 2 commits',
    'HEAD tree contains src/File.ts (PascalCase variant)',
    'HEAD tree contains src/file.ts (lowercase variant)',
    'both case variants are absent from the working tree',
    'core.ignoreCase is false',
  ],
  setup: chain(
    addCommit({ message: 'chore: initial', files: { 'README.md': '# repo\n' } }),
    async (repo) => {
      // Write two temp files with unambiguous, distinct names to obtain
      // their blob OIDs without touching the case-colliding paths on disk.
      await repo.writeFile('_tmp_upper.ts', 'export const File = "upper";\n')
      await repo.writeFile('_tmp_lower.ts', 'export const file = "lower";\n')

      const oidUpper = (await repo.git.raw(['hash-object', '-w', '_tmp_upper.ts'])).trim()
      const oidLower = (await repo.git.raw(['hash-object', '-w', '_tmp_lower.ts'])).trim()

      // Blobs are in the object store — remove the temp files from disk.
      await unlink(join(repo.path, '_tmp_upper.ts'))
      await unlink(join(repo.path, '_tmp_lower.ts'))

      // Force case-sensitivity so update-index treats the two paths as
      // distinct entries regardless of what the host filesystem reports.
      // On macOS, `git init` auto-detects ignoreCase=true; overriding it
      // here lets us store both variants without one silently replacing the other.
      await repo.git.raw(['config', 'core.ignoreCase', 'false'])

      // Inject both case variants directly into the index without writing
      // physical files (cacheinfo bypasses the working tree entirely).
      await repo.git.raw([
        'update-index',
        '--add',
        '--cacheinfo',
        `100644,${oidUpper},src/File.ts`,
      ])
      await repo.git.raw([
        'update-index',
        '--add',
        '--cacheinfo',
        `100644,${oidLower},src/file.ts`,
      ])

      // Commit — index now holds README.md + src/File.ts + src/file.ts.
      // Both case variants land in the git object store but neither is
      // written to disk, so the working tree shows them as deleted.
      //
      // Pin the date explicitly: this commits via a raw `git commit`
      // rather than through an atom, so it has no date of its own.
      await gitAt(repo.path, datePin(nextCommitDate(repo.path)))
        .commit('feat: add case-colliding sources')
    },
  ),
})
