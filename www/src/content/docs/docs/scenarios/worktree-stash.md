---
title: Worktree & Stash Scenarios
description: Scenarios for dirty worktrees, staged files, linked worktrees, and stash states.
---

## `single-staged-file`

Baseline + 1 staged README. The minimum "ready to commit" shape.

## `partial-stage`

2 staged + 2 unstaged + 1 untracked file — the "mixed worktree" shape that real-world tools render with separate Staged / Unstaged sections. Distinct from `single-staged-file` (only staged) and `dirty-many-files` (large dirty set).

**Contracts:**
- `main` has 2 commits
- Exactly 2 staged files
- Exactly 2 modified-but-unstaged files
- Exactly 1 untracked file

Useful for testing per-section status rendering, "stage hunk" / "unstage hunk" affordances, and commit-flow guards that warn about partial commits.

## `monorepo-multi-package`

A workspaces-style monorepo (`packages/app`, `packages/lib`, `packages/cli`) with each package in a different state: `app` is clean, `lib` has staged changes, `cli` has unstaged worktree edits.

**Contracts:**
- `main` has 3 commits
- Root `package.json` declares `packages/*` workspaces
- `packages/app` is clean
- `packages/lib` has staged changes
- `packages/cli` has unstaged changes

Useful for testing workspace-aware tooling — per-package status views, workspace-scoped diff/log filters, and tools that group changes by package boundary.

## `dirty-many-files`

12 staged + 6 unstaged + 3 untracked files across `src/`, `tests/`, `docs/`. For testing tools that display mixed staging states.

## `multiple-worktrees`

Primary worktree on `main` + 3 linked worktrees on different branches:
- `feat/alpha` — 1 commit ahead of main
- `feat/beta` — 2 commits ahead of main
- `hotfix/urgent` — 1 commit ahead of main

Useful for testing worktree list views and the "branch is checked out in another worktree" error case.

## `stashed-changes`

Clean `main` + 3 stashes (LIFO ordered, each touching a distinct file). For testing stash list views and pop/apply/drop flows.

## `stash-with-untracked`

A clean worktree on `main` with a single stash that was created with `--include-untracked`. The stash mixes a modification to an existing tracked file with a brand-new untracked file — the realistic shape of "I want to set my work aside" when that work includes scaffolding new files.

**Contracts:**
- `main` has 2 commits
- Worktree is clean
- `git stash list` reports 1 entry
- The stash includes both modified tracked and untracked new files

Useful for testing stash list rendering when entries contain new files, apply/pop flows that recreate untracked content, and tools that highlight "stash includes N untracked files."
