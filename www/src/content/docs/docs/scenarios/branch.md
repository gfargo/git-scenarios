---
title: Branch Scenarios
description: Scenarios for testing branch-related git states.
---

## `empty-repo`

A freshly-`git init`'d repo with no commits, no files, no remotes. HEAD on `main` but unborn. The "what does your tool do on a brand-new repo?" edge case.

```ts
const repo = await spinUpScenario('empty-repo')
// git status: On branch main — No commits yet
```

## `feature-pr-ready`

`feat/widget-v2` is 4 commits ahead of `main`, clean worktree. The classic "ready to open a PR" state.

**Contracts:**
- `feat/widget-v2` is checked out
- 4 commits ahead of `main`
- Worktree is clean

```ts
const repo = await spinUpScenario('feature-pr-ready')
const status = await repo.git.status()
// status.current === 'feat/widget-v2'
```

## `branch-tracking-upstream`

`main` tracks `origin/main`, both at the same commit. The baseline "synced" state where `git status` reports "Your branch is up to date."

## `branch-ahead-of-upstream`

`main` is 3 commits ahead of `origin/main`. The classic "unpushed" state.

## `branch-behind-upstream`

`main` is 3 commits behind `origin/main`. Fast-forwardable.

## `branch-diverged`

`main` is 2 ahead AND 2 behind `origin/main`. Diverged history requiring merge or rebase.

## `branch-sync-showcase`

Five local branches in five different upstream sync states — behind, ahead, diverged, synced, and no-upstream. HEAD is on the behind branch. For TUIs that show mixed sync states in a branch list.

## `multi-remote-with-tracking`

Fork-workflow baseline: `origin` + `upstream` remotes. `main` tracks `upstream/main`, `feat/fork-work` tracks `origin/feat/fork-work`.

## `detached-head`

HEAD detached at `main~2`, `main` still at its original tip.

## `signed-commits-required`

`commit.gpgsign=true` + `user.signingkey` set. For testing signing-aware UI. (Commits in the scenario remain unsigned since CI lacks a real GPG key.)

## `orphan-branch`

`main` (with regular history) plus a `gh-pages` orphan branch that has its own root commit and no ancestor relationship with `main`. The classic GitHub Pages pattern.

**Contracts:**
- `main` has 2 commits
- `gh-pages` is checked out
- `gh-pages` has 1 commit
- `main` and `gh-pages` share no common ancestor

Useful for surfacing tools that assume all branches descend from a single root commit.
