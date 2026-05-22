---
title: Branches & Tags Atoms
description: switchToBranch, checkoutBranch, createBranch, deleteBranch, createTag, deleteTag.
---

## Branches

### `switchToBranch(name, { from? })`

`git checkout -b <name>` — create and switch to a new branch. Optionally from a specific ref.

```ts
switchToBranch('feat/x')                    // from current HEAD
switchToBranch('feat/x', { from: 'main' })  // from main
```

### `checkoutBranch(name)`

`git checkout <name>` — switch to an existing branch.

### `createBranch(name, { from? })`

`git branch <name>` — create without switching.

### `deleteBranch(name, { force? })`

`git branch -d` / `-D`.

## Tags

### `createTag(name, { message?, sha? })`

Annotated when `message` is set, otherwise lightweight. Optionally at a specific sha.

```ts
createTag('v1.0.0', { message: 'Release v1.0.0' })  // annotated
createTag('v1.0.0-rc1')                               // lightweight at HEAD
createTag('v0.9.0', { sha: 'HEAD~5' })               // at a specific commit
```

### `deleteTag(name)`

`git tag -d <name>`.
