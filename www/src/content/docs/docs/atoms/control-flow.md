---
title: Control Flow Atoms
description: chain, repeat, and conditionally — sequencing and control.
---

## `chain(...steps)`

Sequence atoms into a single `Step`. Awaits each before the next. Short-circuits on rejection.

```ts
await chain(
  addCommit({ message: 'first' }),
  addCommit({ message: 'second' }),
  addCommit({ message: 'third' }),
)(repo)
```

`chain()` with no arguments is a valid no-op step.

## `repeat(n, factory)`

Run an atom factory N times. The index is passed to the factory for distinct steps.

```ts
await chain(
  repeat(8, (i) => addCommit({ message: `feat: step ${i + 1}` })),
)(repo)
// 8 commits on main
```

## `conditionally(condition, step)`

Run a step only when a condition is true. Accepts a static boolean or an async predicate.

```ts
// Static condition
chain(
  addCommit({ message: 'init' }),
  conditionally(process.env.WITH_REMOTE === '1',
    addRemote('origin', 'git@github.com:org/repo.git'),
  ),
)

// Dynamic condition (based on repo state)
chain(
  addCommit({ message: 'init' }),
  conditionally(
    async (repo) => (await repo.git.branchLocal()).all.includes('feat/x'),
    addCommit({ message: 'extra on feat/x' }),
  ),
)
```
