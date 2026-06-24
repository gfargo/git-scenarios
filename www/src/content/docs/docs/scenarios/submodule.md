---
title: Submodule Scenarios
description: Scenarios involving git submodules.
---

## `submodule-with-history`

Parent repo with 4 commits + `vendor/lib` submodule (clean pin, 4 commits, `branch = main`). For testing recursive submodule navigation and submodule status display.

**Contracts:**
- Parent has 4 commits on `main`
- `vendor/lib` submodule exists with `branch = main`
- Submodule has 4 commits
- Submodule pin is clean (not modified)

## `out-of-date-submodule`

Parent repo pinned to an older `vendor/lib` SHA while the submodule has one new commit. `git submodule status` shows `+` — the checked-out submodule HEAD differs from the parent's pin.

**Contracts:**
- Parent has 3 commits on `main`
- `vendor/lib` submodule registered in `.gitmodules`
- `git submodule status` shows `+` for `vendor/lib`
- `vendor/lib` HEAD is 1 commit ahead of the parent pin

## Building out-of-date submodule states

Use the `insideSubmodule` scope to add commits that don't update the parent's pin:

```ts
import { fromScenario, insideSubmodule, addCommit, chain } from '@gfargo/git-scenarios'

const repo = await fromScenario('submodule-with-history',
  insideSubmodule('vendor/lib', chain(
    addCommit({ message: 'feat: post-pin work', files: { 'new.ts': 'new\n' } }),
  )),
)
// git submodule status now shows `+` (modified — pin lags HEAD)
```
