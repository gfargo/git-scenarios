---
title: Worktree & Stash Scenarios
description: Scenarios for dirty worktrees, staged files, linked worktrees, and stash states.
---

## `single-staged-file`

Baseline + 1 staged README. The minimum "ready to commit" shape.

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
