---
title: Utility Atoms
description: Sparse checkout, shallow repos, git notes, hooks, config, stash, submodules, worktrees.
---

## Sparse checkout

| Atom | What it does |
|---|---|
| `enableSparseCheckout(paths, { cone? })` | Enable sparse checkout — only specified paths checked out. |
| `disableSparseCheckout()` | Disable sparse checkout, restore full worktree. |

```ts
chain(
  addCommit({ message: 'init', files: { 'src/app/index.ts': 'app\n', 'docs/README.md': 'docs\n' } }),
  enableSparseCheckout(['src/app']),
  // Only src/app/ is checked out; docs/ is absent from worktree
)
```

## Shallow repo simulation

| Atom | What it does |
|---|---|
| `shallowAt(depth)` | Write `.git/shallow` to simulate a shallow clone. |
| `unshallow()` | Remove the shallow boundary. |

## Git notes

| Atom | What it does |
|---|---|
| `addNote(message, { ref?, namespace? })` | Add a note to a commit. |
| `appendNote(message, { ref?, namespace? })` | Append to an existing note. |
| `removeNote({ ref?, namespace? })` | Remove a note. |

```ts
chain(
  addCommit({ message: 'feat: widget' }),
  addNote('Reviewed-by: Alice <alice@example.com>'),
)
```

## Git hooks

| Atom | What it does |
|---|---|
| `installHook(name, script)` | Write an executable hook to `.git/hooks/<name>`. |
| `removeHook(name)` | Remove a hook. |

```ts
installHook('pre-commit', '#!/bin/sh\nnpm run lint')
```

## Config

| Atom | What it does |
|---|---|
| `setConfig(key, value, { unset? })` | Local `git config`. |

## Stash

| Atom | What it does |
|---|---|
| `stashChanges({ message?, includeUntracked?, keepIndex? })` | `git stash push`. |
| `applyStash({ ref? })` | `git stash apply`. |
| `popStash({ ref? })` | `git stash pop`. |
| `dropStash({ ref? })` | `git stash drop`. |

## Submodules

| Atom | What it does |
|---|---|
| `addSubmodule({ path, branch?, setup })` | Build a source repo from `setup`, clone it in as a submodule. |
| `pinSubmodule(path, sha)` | Move the parent's recorded pin. |

## Worktrees

| Atom | What it does |
|---|---|
| `addWorktree(path, { branch?, detach?, from? })` | `git worktree add`. |
| `removeWorktree(path, { force? })` | `git worktree remove`. |

## Time helpers

| Atom | What it does |
|---|---|
| `daysAgo(n)` | ISO timestamp N days before now. Pairs with `date` option on commit atoms. |

## Scenario definition

| Atom | What it does |
|---|---|
| `defineScenario({…})` | Validating wrapper — catches bad names/kinds at import time. |
