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

## `git-lfs-pointer`

A binary asset (`assets/blob.bin`) tracked by Git LFS. The file on disk is the plain-text *pointer stub* — no `git-lfs` binary is required; the pointer is written directly so the scenario works on every platform.

`.gitattributes` marks `*.bin` with `filter=lfs diff=lfs merge=lfs -text`. The `-text` attribute prevents CRLF mangling on Windows.

**Platform notes:** Calling `git lfs checkout` or `git lfs pull` will fail if `git-lfs` is not installed — test only the pointer format and attribute rules, not the resolved binary.

Useful for testing LFS pointer detection, UI badges for LFS-managed paths, and `.gitattributes` rule parsing.

## `crlf-normalization`

A root `.gitattributes` rule (`* text=auto eol=lf`) that tells Git to normalise all text files to LF on commit and write LF on checkout — overriding platform defaults.

**Platform notes:**
- **Windows** (`core.autocrlf=true` by default): without `.gitattributes`, Git would write CRLF on checkout. The `eol=lf` attribute overrides this to LF.
- **macOS / Linux**: the rule is a no-op for checkout direction but still normalises stray CRLF on commit.

Useful for testing `.gitattributes` rule parsing, line-ending normalisation in diff views, and CRLF-conversion warnings in commit composers.

## `case-collision`

The git object store contains two paths that differ only by case: `src/File.ts` (PascalCase) and `src/file.ts` (lowercase). Both co-exist in git's history but collide on case-insensitive filesystems.

Both entries are reachable via plumbing (`git show HEAD:src/File.ts`, `git show HEAD:src/file.ts`, `git ls-tree -r HEAD`) and absent from the working tree. `core.ignoreCase=false` is set explicitly so git exposes both on all platforms.

**Platform notes:**
- **Linux** (case-sensitive FS): `git checkout HEAD -- src/` would create both files without conflict.
- **macOS / Windows** (case-insensitive FS, the default): checkout silently overwrites one variant with the other, losing data. This is the cross-platform footgun the scenario documents.

Useful for testing case-collision detection, warnings about case-insensitive FS risk, and `git ls-tree` output parsing.

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
