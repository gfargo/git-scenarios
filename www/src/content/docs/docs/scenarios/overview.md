---
title: Scenarios Overview
description: All 27 curated scenarios at a glance.
---

The library ships 27 curated scenarios across 6 kinds. Each produces a deterministic git repo state — same setup, same result, every time.

## By kind

### Branch (13 scenarios)

| Name | What you get |
|---|---|
| `empty-repo` | Freshly-initialized repo: no commits, no files, no remotes. HEAD on `main` but unborn. |
| `feature-pr-ready` | `feat/widget-v2` 4 commits ahead of `main`, clean worktree. |
| `feature-branch-one-commit` | `main` + `feat/x` (1 commit ahead). |
| `multi-commit-branch` | `feat/dashboard` with 8 varied commits. |
| `two-commit-feature` | Baseline + a feat commit on `main`, clean worktree. |
| `branch-tracking-upstream` | `main` tracks `origin/main`, both at same commit. |
| `branch-ahead-of-upstream` | `main` is 3 commits ahead of `origin/main`. |
| `branch-behind-upstream` | `main` is 3 commits behind `origin/main`. |
| `branch-diverged` | `main` is 2 ahead AND 2 behind `origin/main`. |
| `multi-remote-with-tracking` | Fork-workflow: `origin` + `upstream` remotes with tracking. |
| `branch-sync-showcase` | Five branches in five different sync states. |
| `detached-head` | HEAD detached at `main~2`. |
| `signed-commits-required` | `commit.gpgsign=true` + `user.signingkey` set. |

### Operation (5 scenarios)

| Name | What you get |
|---|---|
| `mid-bisect` | 20 commits + active `git bisect`, HEAD at midpoint. |
| `mid-merge-conflict` | In-progress merge with 1 conflict on `src/widget.ts`. |
| `mid-rebase-conflict` | In-progress rebase with 1 conflict on `src/config.ts`. |
| `mid-cherry-pick-conflict` | In-progress cherry-pick with 1 conflict on `src/utils.ts`. |
| `mid-revert-conflict` | In-progress revert with 1 conflict on `src/service.ts`. |

### History (4 scenarios)

| Name | What you get |
|---|---|
| `rich-history-graph` | 20+ commits, 2 `--no-ff` merges, 1 unmerged branch. |
| `chip-rendering-showcase` | 6 commits with different ref-chip kinds (HEAD, local, remote, tag). |
| `shallow-clone` | 10 commits but only 4 reachable (`.git/shallow` set). |
| `large-repo` | 115 commits across 3 branches with 3 tags. |

### Worktree (3 scenarios)

| Name | What you get |
|---|---|
| `single-staged-file` | Baseline + 1 staged README. |
| `dirty-many-files` | 12 staged + 6 unstaged + 3 untracked files. |
| `multiple-worktrees` | Primary worktree + 3 linked worktrees. |

### Stash (1 scenario)

| Name | What you get |
|---|---|
| `stashed-changes` | Clean `main` + 3 stashes (LIFO ordered). |

### Submodule (1 scenario)

| Name | What you get |
|---|---|
| `submodule-with-history` | Parent + `vendor/lib` submodule (4 commits, `branch = main`). |

## Using scenarios

```ts
// One-shot
const repo = await spinUpScenario('mid-merge-conflict')

// With extra steps
const repo = await fromScenario('feature-pr-ready',
  addCommit({ message: 'extra', files: { 'x.ts': 'x\n' } }),
)

// Via Jest adapter
describeWithScenario('mid-merge-conflict', (getRepo) => {
  it('has conflicts', async () => {
    const repo = getRepo()
    const status = await repo.git.status()
    expect(status.conflicted.length).toBeGreaterThan(0)
  })
})
```

## Filtering by tag

Some scenarios carry tags for finer-grained filtering:

```ts
import { findScenariosByTag } from '@gfargo/git-scenarios'

// All conflict scenarios
const conflicts = findScenariosByTag(['conflict'])
// → mid-merge-conflict, mid-rebase-conflict, mid-cherry-pick-conflict, mid-revert-conflict
```
