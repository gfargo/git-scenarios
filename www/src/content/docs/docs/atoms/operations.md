---
title: Operation Atoms
description: Merge, cherry-pick, revert, rebase, bisect, and reset atoms.
---

## Merge

| Atom | What it does |
|---|---|
| `startMerge(branch, { allowConflict?, noFastForward?, squash?, message?, date? })` | Merge — conflicts leave the repo mid-merge by default. |
| `abortMerge()` | `git merge --abort`. |

`squash: true` produces a staged squash without a merge commit. The caller commits to finalize:

```ts
chain(
  startMerge('feat/x', { squash: true }),
  commit('feat: squash from feat/x'),
)
```

## Cherry-pick

| Atom | What it does |
|---|---|
| `cherryPick(ref, { allowConflict?, date? })` | Cherry-pick — conflicts leave mid-cherry-pick by default. |
| `abortCherryPick()` | `git cherry-pick --abort`. |
| `continueCherryPick()` | `git cherry-pick --continue` (after resolving conflicts). |

```ts
// Mid-cherry-pick → resolve → continue
chain(
  cherryPick('feat/source'),
  // resolve conflicts:
  writeFiles({ 'x.ts': 'resolved\n' }),
  stageFiles('x.ts'),
  continueCherryPick(),
)
```

## Revert

| Atom | What it does |
|---|---|
| `revert(ref, { mainline?, allowConflict?, date? })` | Revert a commit. Use `mainline` for merge commits. |
| `abortRevert()` | `git revert --abort`. |
| `continueRevert()` | `git revert --continue` (after resolving conflicts). |

```ts
// Revert a merge commit
revert('merge-sha', { mainline: 1 })
```

## Rebase

| Atom | What it does |
|---|---|
| `startRebase(onto, { allowConflict? })` | Rebase onto a ref — conflicts leave mid-rebase by default. |
| `abortRebase()` | `git rebase --abort`. |
| `continueRebase()` | `git rebase --continue` (after resolving conflicts). |

## Bisect

| Atom | What it does |
|---|---|
| `startBisect({ bad, good })` | Begin a bisect session. |
| `bisectStep(verdict)` | `'good'` / `'bad'` / `'skip'`. |
| `resetBisect()` | `git bisect reset`. |

## Reset

| Atom | What it does |
|---|---|
| `resetTo({ target, mode? })` | `git reset --soft/mixed/hard <target>`. |

## The `allowConflict` pattern

All conflict-producing atoms (`startMerge`, `cherryPick`, `revert`, `startRebase`) default to `allowConflict: true`. This means conflicts leave the repo in the mid-operation state — exactly what scenario tests want. Set `allowConflict: false` to rethrow on conflicts.

## Lifecycle symmetry

Every conflict-producing operation has a complete lifecycle: `start → abort` and `start → resolve → continue`. Together they let you assemble both the conflicted state (for testing detection) and the resolution path (for testing post-resolve behavior).

| Operation | Start | Abort | Continue |
|---|---|---|---|
| Merge | `startMerge` | `abortMerge` | `commit` (merge) |
| Cherry-pick | `cherryPick` | `abortCherryPick` | `continueCherryPick` |
| Revert | `revert` | `abortRevert` | `continueRevert` |
| Rebase | `startRebase` | `abortRebase` | `continueRebase` |

Note: `startMerge` doesn't have a dedicated `continueMerge` because the merge-conflict resolution flow is just `git commit` once everything is staged. Use the regular `commit` atom.
