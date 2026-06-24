/**
 * `mixed-tags` — repo demonstrating three distinct tag shapes: a lightweight
 * tag, an annotated tag, and a tag pointing at a tree object rather than a
 * commit.
 *
 * State after setup:
 *   - `main` is checked out with 3 commits
 *   - `v0.1.0`       — lightweight tag pointing at HEAD~2 (first commit)
 *   - `v1.0.0`       — annotated tag (full tag object) pointing at HEAD
 *   - `tree-snapshot` — lightweight tag pointing at HEAD's *tree* object
 *   - worktree is clean
 *
 * EXTRACTION DISCIPLINE: no consumer-tool-specific imports.
 *
 * Useful for testing:
 *   - Distinguishing annotated vs lightweight tags (`git cat-file -t <name>`)
 *   - `git describe` behaviour (only annotated tags by default)
 *   - Tag-listing and sorting (by date, semver, etc.)
 *   - Edge-case handling for tags that point at non-commit objects
 */

import { addCommit, chain, createTag, defineScenario } from '../atoms'

export const mixedTagsScenario = defineScenario({
  name: 'mixed-tags',
  summary:
    'lightweight tag (v0.1.0), annotated tag (v1.0.0), and a tag pointing at a tree object (tree-snapshot)',
  description: [
    'Three commits carry three tag shapes:',
    '',
    '  v0.1.0        lightweight tag — a named ref pointing directly at the',
    '                first commit; no tag object is created.',
    '  v1.0.0        annotated tag — a full tag object that stores the tagger',
    '                identity, timestamp, and release message. This is what',
    '                `git describe` resolves and what release tooling signs.',
    '  tree-snapshot lightweight tag — points at the tree object of HEAD rather',
    '                than a commit. Uncommon but valid; some tag-parsing tools',
    '                handle this case incorrectly.',
    '',
    'Detecting the tag type:',
    '  git cat-file -t v0.1.0        → commit   (lightweight: resolves to commit)',
    '  git cat-file -t v1.0.0        → tag      (annotated: is a tag object)',
    '  git cat-file -t tree-snapshot → tree     (unusual: points at a tree)',
    '',
    'Useful for testing:',
    '  - Distinguishing annotated vs lightweight tags (`git cat-file -t`)',
    '  - `git describe` behaviour (only annotated tags by default)',
    '  - Tag-listing and sorting (by date, semver, name)',
    '  - Edge-case handling for tags that point at non-commit objects',
  ].join('\n'),
  kind: 'history',
  tags: ['tags', 'metadata'],
  contracts: [
    'main is checked out',
    'main has 3 commits',
    'v0.1.0 is a lightweight tag pointing at HEAD~2 (git cat-file -t → commit)',
    'v1.0.0 is an annotated tag object pointing at HEAD (git cat-file -t → tag)',
    'tree-snapshot is a lightweight tag pointing at a tree object (git cat-file -t → tree)',
    'worktree is clean',
  ],
  setup: chain(
    addCommit({ message: 'chore: initial', files: { 'README.md': '# repo\n' } }),
    addCommit({ message: 'feat: v0.1.0 content', files: { 'src/v0.ts': 'export const v = 0\n' } }),
    addCommit({ message: 'feat: stable release', files: { 'src/v1.ts': 'export const v = 1\n' } }),
    createTag('v0.1.0', { sha: 'HEAD~2' }),
    createTag('v1.0.0', { message: 'Release 1.0.0' }),
    async (repo) => {
      const tree = (await repo.git.raw(['rev-parse', 'HEAD^{tree}'])).trim()
      await repo.git.raw(['tag', 'tree-snapshot', tree])
    },
  ),
})
