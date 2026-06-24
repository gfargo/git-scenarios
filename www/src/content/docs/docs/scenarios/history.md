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

## `commits-with-notes`

Two commits annotated with git notes in `refs/notes/commits`; the first commit also carries a note in `refs/notes/ci` to demonstrate multi-namespace note storage.

**Contracts:**
- `main` is checked out
- `main` has 2 commits
- HEAD~1 has a note in refs/notes/commits containing "Reviewed-by: Alice"
- HEAD~1 has a note in refs/notes/ci containing "CI: passed"
- HEAD has a note in refs/notes/commits containing "Reviewed-by: Bob" and "Coverage: 92%"

Useful for testing `git log --show-notes` display, `git notes list` output across namespaces, and multi-namespace note enumeration.

## `mixed-tags`

Three commits tagged with three distinct shapes: a lightweight tag (`v0.1.0`), an annotated tag object (`v1.0.0`), and a lightweight tag pointing at a tree object (`tree-snapshot`).

**Contracts:**
- `main` is checked out
- `main` has 3 commits
- `v0.1.0` is a lightweight tag pointing at HEAD~2 (`git cat-file -t` → `commit`)
- `v1.0.0` is an annotated tag object pointing at HEAD (`git cat-file -t` → `tag`)
- `tree-snapshot` is a lightweight tag pointing at a tree object (`git cat-file -t` → `tree`)
- Worktree is clean

Useful for testing annotated vs lightweight tag detection, `git describe` behaviour, and edge-case handling for tags that point at non-commit objects.

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
