/**
 * `commits-with-notes` — two commits, each carrying a git note in the
 * default `refs/notes/commits` namespace. The first commit also has a note
 * in a second namespace (`refs/notes/ci`) to demonstrate multi-namespace
 * storage.
 *
 * State after setup:
 *   - `main` is checked out with 2 commits
 *   - HEAD~1 has a note in refs/notes/commits ("Reviewed-by: Alice …")
 *   - HEAD~1 has a note in refs/notes/ci ("CI: passed")
 *   - HEAD has a note in refs/notes/commits ("Reviewed-by: Bob …" + appended
 *     "Coverage: 92%")
 *
 * EXTRACTION DISCIPLINE: no consumer-tool-specific imports.
 *
 * Useful for testing:
 *   - `git log --show-notes` display and note content parsing
 *   - `git notes list` output across namespaces
 *   - Note-aware diff and annotation tools
 *   - Multi-namespace note enumeration (`git notes --ref=refs/notes/ci list`)
 */

import { addCommit, addNote, appendNote, chain, defineScenario } from '../atoms'

export const commitsWithNotesScenario = defineScenario({
  name: 'commits-with-notes',
  summary:
    'two commits annotated with git notes; first commit also carries a note in a second namespace (refs/notes/ci)',
  description: [
    'Notes are metadata attached to commits *outside* the commit object itself:',
    'they can be added, updated, or removed without rewriting history.',
    '',
    'Layout:',
    '  HEAD~1 (`feat: initial widget`):',
    '    refs/notes/commits → "Reviewed-by: Alice <alice@example.com>"',
    '    refs/notes/ci      → "CI: passed"',
    '  HEAD (`fix: widget alignment`):',
    '    refs/notes/commits → "Reviewed-by: Bob <bob@example.com>\\nCoverage: 92%"',
    '',
    'The HEAD note is built with `git notes add` followed by `git notes append`,',
    'producing a multi-line note without rewriting the first entry.',
    '',
    'Useful for testing:',
    '  - `git log --show-notes` display and note content parsing',
    '  - `git notes list` output across namespaces',
    '  - Note-aware diff and annotation tools',
    '  - Multi-namespace enumeration (`git notes --ref=refs/notes/ci list`)',
  ].join('\n'),
  kind: 'history',
  tags: ['notes', 'metadata'],
  contracts: [
    'main is checked out',
    'main has 2 commits',
    'HEAD~1 has a note in refs/notes/commits containing "Reviewed-by: Alice"',
    'HEAD~1 has a note in refs/notes/ci containing "CI: passed"',
    'HEAD has a note in refs/notes/commits containing "Reviewed-by: Bob" and "Coverage: 92%"',
  ],
  setup: chain(
    addCommit({
      message: 'feat: initial widget',
      files: { 'src/widget.ts': 'export const widget = {}\n' },
    }),
    addNote('Reviewed-by: Alice <alice@example.com>'),
    addNote('CI: passed', { namespace: 'refs/notes/ci' }),
    addCommit({
      message: 'fix: widget alignment',
      files: { 'src/widget.ts': 'export const widget = { align: true }\n' },
    }),
    addNote('Reviewed-by: Bob <bob@example.com>'),
    appendNote('Coverage: 92%'),
  ),
})
