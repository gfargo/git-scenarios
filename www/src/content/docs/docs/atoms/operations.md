---
title: Operation Atoms
description: Merge, cherry-pick, revert, rebase, bisect, and reset atoms.
---

## Merge

| Atom | What it does |
|---|---|
| `startMerge(branch, { allowConflict?, noFastForward?, message?, date? })` | Merge — conflicts leave the repo mid-merge by default. |
| `abortMerge()` | `git merge --abort`. |

## Cherry-pick

| Atom | What it does |
|---|---|
| `cherryPick(ref, { allowConflict?, date? })` | Cherry-pick — conflicts leave mid-cherry-pick by default. |
| `abortCherryPick()` | `git cherry-pick --abort`. |

## Revert

| Atom | What it does |
|---|---|
| `revert(ref, { mainline?, allowConflict?, date? })` | Revert a commit. Use `mainline` for merge commits. |

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
