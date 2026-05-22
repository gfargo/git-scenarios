---
title: Operation Scenarios
description: Scenarios for in-progress git operations (merge, rebase, cherry-pick, revert, bisect).
---

These scenarios leave the repo in the middle of a git operation — conflicts unresolved, state files present. Each produces a distinct `.git` state that tools need to handle differently.

## `mid-merge-conflict`

In-progress merge with 1 unresolved conflict on `src/widget.ts`. `MERGE_HEAD` is set.

**Contracts:**
- `main` is checked out
- A merge is in progress (`MERGE_HEAD` exists)
- `src/widget.ts` has conflict markers
- Exactly 1 unresolved conflict

## `mid-rebase-conflict`

In-progress rebase with 1 unresolved conflict on `src/config.ts`. `.git/rebase-merge/` exists and `REBASE_HEAD` is set.

**Contracts:**
- A rebase is in progress (`.git/rebase-merge/` exists)
- `REBASE_HEAD` is set
- `src/config.ts` has conflict markers
- Exactly 1 unresolved conflict

## `mid-cherry-pick-conflict`

In-progress cherry-pick with 1 unresolved conflict on `src/utils.ts`. `CHERRY_PICK_HEAD` is set.

**Contracts:**
- `main` is checked out
- A cherry-pick is in progress (`CHERRY_PICK_HEAD` exists)
- `src/utils.ts` has conflict markers
- Exactly 1 unresolved conflict

## `mid-revert-conflict`

In-progress revert with 1 unresolved conflict on `src/service.ts`. `REVERT_HEAD` is set.

**Contracts:**
- `main` is checked out
- A revert is in progress (`REVERT_HEAD` exists)
- `src/service.ts` has conflict markers
- Exactly 1 unresolved conflict

## `mid-bisect`

20 commits on `main` + active `git bisect` session. HEAD is at the midpoint candidate.

**Contracts:**
- Bisect is active
- HEAD is detached at the midpoint
- 20 commits in the history

## Distinguishing conflict types

Each conflict scenario produces different `.git` state files:

| Scenario | State file | Resolution command |
|---|---|---|
| `mid-merge-conflict` | `.git/MERGE_HEAD` | `git merge --continue` or `git commit` |
| `mid-rebase-conflict` | `.git/rebase-merge/` + `REBASE_HEAD` | `git rebase --continue` |
| `mid-cherry-pick-conflict` | `.git/CHERRY_PICK_HEAD` | `git cherry-pick --continue` |
| `mid-revert-conflict` | `.git/REVERT_HEAD` | `git revert --continue` |

Tools that display "operation in progress" indicators need to check for each of these.
