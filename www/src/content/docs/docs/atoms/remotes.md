---
title: Remotes & Tracking Atoms
description: addRemote, removeRemote, renameRemote, setUpstream, setRemoteRef, withRemoteTracking.
---

## Remotes

### `addRemote(name, url)`

Register a remote. URL stored as-is — no fetch.

### `removeRemote(name)`

Drop a remote.

### `renameRemote(from, to)`

Rename a remote (URL unchanged).

## Upstream tracking

### `setUpstream(localBranch, remote, remoteBranch?)`

Write `branch.<X>.remote` + `branch.<X>.merge` config. `remoteBranch` defaults to `localBranch`.

```ts
chain(
  addRemote('origin', '/fake/url'),
  setRemoteRef('origin', 'main', 'HEAD'),
  setUpstream('main', 'origin'),
)
// git status: "Your branch is up to date with 'origin/main'."
```

### `setRemoteRef(remote, branch, sha)`

Direct `git update-ref refs/remotes/<remote>/<branch>` — fabricate a remote-tracking ref without a fetch.

### `withRemoteTracking(remote, branch, step)`

Run a step against a temporary clone, then fetch the resulting branch tip back into the parent as `refs/remotes/<remote>/<branch>`. Generates "upstream-only commits" without manual ref plumbing.

```ts
chain(
  addCommit({ message: 'init' }),
  addRemote('origin', '/fake/url'),
  withRemoteTracking('origin', 'main', chain(
    addCommit({ message: 'upstream only A' }),
    addCommit({ message: 'upstream only B' }),
  )),
  setUpstream('main', 'origin'),
)
// git status: "Your branch is behind 'origin/main' by 2 commits"
```
