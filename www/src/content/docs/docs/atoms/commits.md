---
title: Commits & Staging Atoms
description: stageFiles, unstageFiles, commit, addCommit, emptyCommit, amendCommit, bulkCommits.
---

## `stageFiles(...paths)`

`git add .` (no args) or `git add <paths>`.

```ts
stageFiles()              // git add .
stageFiles('src/app.ts')  // git add src/app.ts
```

## `unstageFiles(...paths)`

The inverse of `stageFiles`. With no args, resets the index (`git reset`); with paths, uses `git restore --staged`.

```ts
chain(
  writeFiles({ 'a.ts': 'a', 'b.ts': 'b' }),
  stageFiles(),                    // both staged
  unstageFiles('b.ts'),            // a still staged, b unstaged
)
```

Useful for assembling partial-stage states where some files are staged and others aren't — a very common real-world worktree shape.

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

## `bulkCommits(specs)`

Produce N commits in a tight loop. ~30% faster than `chain(...specs.map(addCommit))` for 50+ commit scenarios. Specs without `files` are committed `--allow-empty`.

```ts
bulkCommits([
  { message: 'feat: a', files: { 'a.ts': 'a\n' } },
  { message: 'feat: b', files: { 'b.ts': 'b\n' } },
  { message: 'milestone' },                            // empty commit
  { message: 'old', date: '2024-01-15T12:00:00Z' },    // pinned date
])
```

For small numbers of commits with distinct logic, prefer `chain(...)` of `addCommit` atoms — clearer intent. Reach for `bulkCommits` when filling out long histories where the diff content doesn't matter.

## Date pinning

Every commit-producing atom accepts an optional `date`. Pair with `daysAgo(n)`:

```ts
addCommit({ message: 'old commit', date: daysAgo(30) })
```
