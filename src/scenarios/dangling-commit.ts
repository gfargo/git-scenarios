/**
 * `dangling-commit` — an experimental commit dropped from `main` via
 * `git reset --hard HEAD~1`. The commit object still exists in the
 * object store but is reachable only via the reflog (`HEAD@{1}`).
 *
 * State after setup:
 *   - `main` has 2 commits
 *   - The 3rd "experimental" commit is not on any branch or tag
 *   - The dangling commit object is still present in the object store
 *   - It is recoverable via `HEAD@{1}` in the reflog
 *   - worktree is clean
 *
 * EXTRACTION DISCIPLINE: no consumer-tool-specific imports.
 */

import { addCommit, chain, defineScenario, resetTo } from '../atoms'

export const danglingCommitScenario = defineScenario({
  name: 'dangling-commit',
  summary: 'experimental commit dropped from main, reachable only via reflog',
  description: [
    'A commit exists in the object store but is not reachable from any',
    'branch or tag — only via `HEAD@{1}` in the reflog.',
    '',
    '`main` has 2 commits; the third "experimental" commit was dropped',
    'by a `git reset --hard HEAD~1`. The object is still present and',
    'can be recovered with `git checkout HEAD@{1}` or by handing the',
    'SHA to `git branch recover <sha>`.',
    '',
    'Useful for testing:',
    '  - reflog-browsing UIs',
    '  - "recover lost commit" affordances',
    '  - `git fsck --lost-found` integrations',
  ].join('\n'),
  kind: 'branch',
  tags: ['reflog', 'recovery', 'dangling'],
  contracts: [
    'main has 2 commits',
    'worktree is clean',
    'the experimental commit is not reachable from any branch',
    'the experimental commit is recoverable via the reflog (HEAD@{1})',
  ],
  setup: chain(
    addCommit({ message: 'chore: initial', files: { 'README.md': '# repo\n' } }),
    addCommit({ message: 'feat: keep this', files: { 'src/keep.ts': 'keep\n' } }),
    addCommit({ message: 'feat: experimental work', files: { 'src/experiment.ts': 'wip\n' } }),
    // Drop the experimental tip — now reachable ONLY via HEAD@{1} / reflog.
    resetTo({ target: 'HEAD~1', mode: 'hard' }),
  ),
})
