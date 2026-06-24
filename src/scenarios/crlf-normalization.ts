/**
 * `crlf-normalization` — repo with a root-level `.gitattributes` that
 * enforces LF line endings for all text files (`* text=auto eol=lf`).
 * Demonstrates the cross-platform line-ending behaviour tools need to
 * handle.
 *
 * State after setup:
 *   - `main` is checked out with 2 commits
 *   - `.gitattributes` contains `* text=auto eol=lf`
 *   - `src/lf-only.txt` is committed with LF-only line endings
 *   - worktree is clean
 *
 * EXTRACTION DISCIPLINE: no consumer-tool-specific imports.
 *
 * PLATFORM NOTES:
 *   - Windows (core.autocrlf=true by default): without `.gitattributes`
 *     Git stores LF in the object store but writes CRLF to the working
 *     tree on checkout. The `eol=lf` attribute overrides the checkout
 *     direction, forcing LF in the working tree too.
 *   - macOS / Linux (LF by default): the rule is a no-op in the checkout
 *     direction but still normalises any stray CRLF to LF on commit.
 *   - Git emits "CRLF will be replaced by LF" when staging a file with
 *     Windows-style line endings under this rule — useful for testing
 *     warning-suppression or line-ending conversion UI.
 */

import { addCommit, chain, defineScenario, writeFiles, writeGitattributes } from '../atoms'

export const crlfNormalizationScenario = defineScenario({
  name: 'crlf-normalization',
  summary:
    'repo with .gitattributes enforcing LF line endings on all text files (text=auto eol=lf)',
  description: [
    'A root `.gitattributes` rule (`* text=auto eol=lf`) tells Git to',
    'normalise all text files to LF on commit and to write LF to the',
    'working tree on checkout — overriding platform defaults.',
    '',
    'The committed text file (`src/lf-only.txt`) is stored with LF endings',
    'in the git object store regardless of the host OS.',
    '',
    'Platform notes:',
    '  - Windows (core.autocrlf=true by default): without `.gitattributes`',
    '    Git would store LF but write CRLF on checkout. The `eol=lf`',
    '    attribute overrides that, keeping LF in the working tree.',
    '  - macOS / Linux (LF by default): the rule is a no-op for checkout',
    '    but still normalises any stray CRLF to LF on commit.',
    '  - Git emits "CRLF will be replaced by LF" when staging a file with',
    '    Windows-style endings under this rule — useful for testing',
    '    warning-suppression or line-ending conversion UI.',
    '',
    'Useful for testing:',
    '  - `.gitattributes` rule parsing (`text=auto`, `eol=lf`)',
    '  - Line-ending normalisation detection in diff and blame views',
    '  - "mixed line endings" or CRLF-conversion warnings in commit composers',
  ].join('\n'),
  kind: 'worktree',
  tags: ['crlf', 'encoding', 'gitattributes', 'cross-platform'],
  contracts: [
    'main is checked out',
    'main has 2 commits',
    '.gitattributes contains "* text=auto eol=lf"',
    'src/lf-only.txt is committed with LF-only line endings',
    'worktree is clean',
  ],
  setup: chain(
    addCommit({ message: 'chore: initial', files: { 'README.md': '# repo\n' } }),
    writeGitattributes(['* text=auto eol=lf']),
    writeFiles({ 'src/lf-only.txt': 'line one\nline two\nline three\n' }),
    addCommit({ message: 'chore: enforce LF line endings via .gitattributes' }),
  ),
})
