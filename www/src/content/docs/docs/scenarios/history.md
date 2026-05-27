---
title: History Scenarios
description: Scenarios for testing history rendering, pagination, and graph display.
---

## `merge-no-conflict`

A successfully completed `--no-ff` merge of `feat/x` into `main`, fully committed. The merge commit is at HEAD with two parents. Distinct from `mid-merge-conflict` (in-progress) and from a fast-forward merge (no merge commit produced).

**Contracts:**
- `main` is checked out
- HEAD has 2 parents
- Worktree is clean
- `feat/x` exists and is merged into `main`

Useful for testing merge-commit rendering, "merged branches" lists, and tools that distinguish `--no-ff` merges from fast-forwards.

## `rich-history-graph`

20+ commits across 6 date buckets, 2 `--no-ff` merges, 1 live unmerged `feat/wip` branch. For testing compact + full-graph rendering (bucket dividers, type coloring, branch chips, lane topology).

## `chip-rendering-showcase`

6 commits on `main` where each row exercises a different branch-tip-chip kind — HEAD, plain local (`develop`), slashy local (`feat/widgets`), remote-tracking via `origin/main`, remote-tracking via `upstream/main`, and a root commit tagged `v0.1.0`.

Useful for visual regression checks on TUIs that colour-code chip kinds.

## `shallow-clone`

10 commits in the object store but only 4 reachable from HEAD. `.git/shallow` is set, so `git rev-parse --is-shallow-repository` returns `true`.

**Contracts:**
- `main` is checked out
- Repo is shallow
- Only 4 commits reachable from HEAD

Useful for testing tools that detect shallow repos and warn/error, or log views that hit the shallow boundary.

## `large-repo`

115 commits across 3 branches with 3 tags (`v0.1.0`, `v0.5.0`, `v1.0.0`). Designed for stress-testing tools that paginate, virtualize, or filter large histories.

**Structure:**
- `main` — 80 commits (mix of feat/fix/chore/docs/refactor)
- `feat/large-feature` — 25 commits (branched from main~40)
- `develop` — 10 commits (branched from main~20)
- 50+ files across `src/`, `tests/`, `docs/`, `lib/`, `config/`

**Contracts:**
- `main` has 80 commits
- `feat/large-feature` has 25 commits ahead of its fork point
- `develop` has 10 commits ahead of its fork point
- Tags `v0.1.0`, `v0.5.0`, `v1.0.0` exist
- Total 115 commits across all branches
