---
title: Commits & Staging Atoms
description: stageFiles, commit, addCommit, emptyCommit, amendCommit.
---

## `stageFiles(...paths)`

`git add .` (no args) or `git add <paths>`.

```ts
stageFiles()              // git add .
stageFiles('src/app.ts')  // git add src/app.ts
```

## `commit(message, { date? })`

Commit the staged set. Does not stage anything first.

```ts
chain(
  writeFiles({ 'x.ts': 'x\n' }),
  stageFiles('x.ts'),
  commit('feat: add x'),
)
```

## `addCommit({ message, files?, date? })`

The workhorse: write files + stage all + commit in one atom.

```ts
addCommit({
  message: 'feat: add widget',
  files: { 'src/widget.ts': 'export const widget = {}\n' },
  date: '2024-01-15T12:00:00Z',  // optional: pin author/committer date
})
```

## `emptyCommit(message, { date? })`

`--allow-empty` commit. Useful for "N commits" scenarios where content doesn't matter.

```ts
repeat(20, (i) => emptyCommit(`commit ${i + 1}`))
```

## `amendCommit({ message? })`

`git commit --amend`. With `message`, rewrites the subject; without, keeps existing (`--no-edit`).

```ts
chain(
  addCommit({ message: 'wip' }),
  writeFiles({ 'src/fix.ts': 'fixed\n' }),
  stageFiles('src/fix.ts'),
  amendCommit({ message: 'feat: proper message' }),
)
```

## Date pinning

Every commit-producing atom accepts an optional `date`. Pair with `daysAgo(n)`:

```ts
addCommit({ message: 'old commit', date: daysAgo(30) })
```
