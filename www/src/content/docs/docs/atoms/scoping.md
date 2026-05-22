---
title: Scoping Atoms
description: onBranch, insideSubmodule, withAuthor, withRemoteTracking — context-switching atoms.
---

Scoping atoms take a `Step` and return a `Step`. They change the context for the inner step, then restore it. Because they compose, they nest arbitrarily.

## `onBranch(name, step)`

Switch to a branch, run the step, restore the previous branch (even on throw).

```ts
chain(
  addCommit({ message: 'init' }),
  createBranch('feat/x'),
  onBranch('feat/x', chain(
    addCommit({ message: 'feat work' }),
  )),
  // Back on main
)
```

## `insideSubmodule(path, step)`

Run any step against a submodule's working tree. Every atom works inside.

```ts
insideSubmodule('vendor/lib', chain(
  addCommit({ message: 'post-pin work', files: { 'new.ts': 'new\n' } }),
))
```

## `withAuthor({ name, email, date? }, step)`

Pin author/committer identity for everything inside.

```ts
chain(
  withAuthor({ name: 'Alice', email: 'alice@x', date: daysAgo(10) },
    addCommit({ message: 'feat: alice work' }),
  ),
  withAuthor({ name: 'Bob', email: 'bob@x', date: daysAgo(5) },
    addCommit({ message: 'fix: bob work' }),
  ),
)
```

## `withRemoteTracking(remote, branch, step)`

Run a step against a temporary clone, then fetch the result back as a remote-tracking ref. See [Remotes & Tracking](/docs/atoms/remotes) for details.

## Nesting scopes

Scopes compose cleanly:

```ts
withAuthor({ name: 'Alice', email: 'alice@x' },
  insideSubmodule('vendor/lib',
    onBranch('feat/x',
      chain(addCommit({ message: 'nested context' }))
    )
  )
)
```
