/**
 * `mid-revert-conflict` — a repo mid-revert with one unresolved
 * conflict. A commit is being reverted but the revert conflicts with
 * subsequent changes, leaving the repo in a paused revert state.
 *
 * State after setup:
 *   - `main` is checked out
 *   - `REVERT_HEAD` is set
 *   - `src/service.ts` has unresolved conflict markers
 *   - `git status` reports the revert as in progress
 *
 * Distinct from merge/rebase/cherry-pick conflicts because:
 *   - The `.git` state file is `REVERT_HEAD`
 *   - Tools render revert conflicts differently ("Reverting commit X")
 *   - The resolution flow is `git revert --continue` or `--abort`
 *
 * EXTRACTION DISCIPLINE: no coco-specific imports.
 */

import {
    addCommit,
    chain,
    defineScenario,
    revert,
} from '../atoms'

const serviceV1 = [
  'export class UserService {',
  '  getUser(id: string) {',
  '    return { id, name: "default" }',
  '  }',
  '}',
  '',
].join('\n')

const serviceV2 = [
  'export class UserService {',
  '  getUser(id: string) {',
  '    return { id, name: "updated", email: "user@example.com" }',
  '  }',
  '',
  '  listUsers() {',
  '    return []',
  '  }',
  '}',
  '',
].join('\n')

const serviceV3 = [
  'export class UserService {',
  '  getUser(id: string) {',
  '    return { id, name: "updated", email: "user@example.com", role: "admin" }',
  '  }',
  '',
  '  listUsers() {',
  '    return []',
  '  }',
  '',
  '  deleteUser(id: string) {',
  '    return true',
  '  }',
  '}',
  '',
].join('\n')

export const midRevertConflictScenario = defineScenario({
  name: 'mid-revert-conflict',
  summary: 'in-progress revert with one unresolved conflict in src/service.ts',
  description: [
    'A repository mid-revert, blocked on one unresolved conflict.',
    'Three commits build on `src/service.ts` progressively. Reverting',
    'the second commit (which added `email` and `listUsers`) conflicts',
    'with the third commit (which added `role` and `deleteUser`).',
    '`REVERT_HEAD` is set and the conflicted file has markers.',
    '',
    'Useful for testing:',
    '  - revert-specific conflict resolution UI',
    '  - title-bar "REVERTING" indicator',
    '  - distinguishing revert state from merge/rebase/cherry-pick',
    '  - `git revert --continue` / `--abort` flows',
  ].join('\n'),
  kind: 'operation',
  tags: ['conflict', 'revert'],
  contracts: [
    'main is checked out',
    'a revert is in progress (REVERT_HEAD exists)',
    'src/service.ts has unresolved conflict markers',
    'exactly 1 unresolved conflict',
  ],
  setup: chain(
    // Commit 1: baseline service
    addCommit({
      message: 'feat: add user service',
      files: { 'src/service.ts': serviceV1, 'README.md': '# Service\n' },
    }),
    // Commit 2: add email + listUsers (this is what we'll revert)
    addCommit({
      message: 'feat: add email field and listUsers method',
      files: { 'src/service.ts': serviceV2 },
    }),
    // Commit 3: add role + deleteUser (conflicts with reverting commit 2)
    addCommit({
      message: 'feat: add role field and deleteUser method',
      files: { 'src/service.ts': serviceV3 },
    }),
    // Revert commit 2 — conflicts because commit 3 depends on its changes
    revert('HEAD~1'),
  ),
})
