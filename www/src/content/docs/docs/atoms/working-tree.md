---
title: Working Tree Atoms
description: writeFiles, deleteFiles, renameFile, seededFiles.
---

## `writeFiles(fileMap)`

Write literal content to files. Parent directories created automatically. Does NOT stage.

```ts
writeFiles({
  'src/index.ts': 'export const app = {}\n',
  'README.md': '# My Project\n',
})
```

## `deleteFiles(...paths)`

Remove files from the working directory. Does NOT stage the deletion.

```ts
deleteFiles('src/old.ts', 'docs/deprecated.md')
```

## `renameFile(from, to)`

`git mv` — rename a tracked file. Stages the rename for rename-detection.

```ts
renameFile('src/old-name.ts', 'src/new-name.ts')
```

## `seededFiles({ files, seed })`

Write procedurally-generated content (seeded, byte-stable across runs). Useful for scenarios that need realistic-looking file content without hand-writing it.

```ts
seededFiles({
  files: [
    { path: 'src/widget.ts', tokens: 120 },
    { path: 'src/utils.ts', tokens: 80 },
  ],
  seed: 0xabc,
})
```
