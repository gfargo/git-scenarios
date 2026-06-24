/**
 * `installed-hooks` — repo with git hook scripts installed in `.git/hooks/`.
 * Two hooks are present and marked executable: `pre-commit` and `commit-msg`.
 * Both exit 0 so the repo remains committable; the scenario focuses on the
 * *presence* and *permissions* of hooks, not enforcement behaviour.
 *
 * State after setup:
 *   - `main` is checked out with 2 commits
 *   - `.git/hooks/pre-commit` is present and executable (exits 0)
 *   - `.git/hooks/commit-msg` is present and executable (exits 0)
 *   - worktree is clean
 *
 * EXTRACTION DISCIPLINE: no consumer-tool-specific imports.
 *
 * PLATFORM NOTES:
 *   - Hooks are installed AFTER all commits. A blocking hook installed
 *     before setup commits would cause the setup itself to fail.
 *   - On Windows, git hook execution requires a POSIX shell (Git Bash /
 *     WSL). Test only for hook presence and the executable bit on POSIX;
 *     skip invocation tests on native Windows.
 *
 * Useful for testing:
 *   - Hook detection ("does this repo have a pre-commit hook?")
 *   - UI indicators showing hooks are active
 *   - Tools that wrap or bypass git hooks (--no-verify flows)
 *   - Permission checks (hook must be executable to be invoked by git)
 */

import { addCommit, chain, defineScenario, installHook } from '../atoms'

export const installedHooksScenario = defineScenario({
  name: 'installed-hooks',
  summary:
    'repo with pre-commit and commit-msg hooks installed and marked executable',
  description: [
    'Two passing hook scripts are installed in `.git/hooks/`.',
    '',
    '  - `pre-commit`: runs before every commit; a non-zero exit aborts the',
    '    commit. Useful for linters, formatters, or secret-scanners.',
    '  - `commit-msg`: receives the path to the commit-message file; used to',
    '    enforce message format (e.g. Conventional Commits, ticket prefixes).',
    '',
    'Both scripts exit 0 so the repo stays in a clean, committable state. The',
    'scenario documents *presence* and *permissions* of hooks, not enforcement.',
    '',
    'Platform notes:',
    '  - Hooks are installed after the setup commits so a blocking hook cannot',
    '    interrupt the scenario construction itself.',
    '  - On Windows (native cmd.exe), git hooks require a POSIX shell such as',
    '    Git Bash or WSL. Test hook presence on all platforms; skip invocation',
    '    tests on native Windows.',
    '',
    'Useful for testing:',
    '  - Hook detection ("does this repo have a pre-commit hook?")',
    '  - UI indicators showing hooks are active',
    '  - Tools that offer to bypass hooks (--no-verify flows)',
    '  - Permission checks (hooks must be executable to be invoked by git)',
  ].join('\n'),
  kind: 'worktree',
  tags: ['hooks', 'metadata'],
  contracts: [
    'main is checked out',
    'main has 2 commits',
    '.git/hooks/pre-commit exists and is executable',
    '.git/hooks/commit-msg exists and is executable',
    'worktree is clean',
  ],
  setup: chain(
    addCommit({ message: 'chore: initial', files: { 'README.md': '# repo\n' } }),
    addCommit({ message: 'feat: add source', files: { 'src/index.ts': 'export {}\n' } }),
    installHook('pre-commit', '#!/bin/sh\n# validate staged files before commit\nexit 0\n'),
    installHook('commit-msg', '#!/bin/sh\n# enforce conventional commit message format\nexit 0\n'),
  ),
})
