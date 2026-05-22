---
title: Atoms Overview
description: The composable building blocks for any git state.
---

Every registered scenario is built from small, single-purpose **atoms** — functions that take a `TempGitRepo` and apply one side-effect. The atom signature is uniform:

```ts
type Step = (repo: TempGitRepo) => Promise<void>
```

Atoms compose via `chain(...)`:

```ts
import { chain, addCommit, switchToBranch, startMerge } from '@gfargo/git-scenarios'

const setup = chain(
  addCommit({ message: 'base', files: { 'x.ts': 'base\n' } }),
  switchToBranch('feat/theirs'),
  addCommit({ message: 'theirs', files: { 'x.ts': 'theirs\n' } }),
  switchToBranch('main'),
  addCommit({ message: 'ours', files: { 'x.ts': 'ours\n' } }),
  startMerge('feat/theirs'),
)

// Use it:
const repo = await createTempGitRepo()
await setup(repo)
```

## Atom categories

| Category | Atoms |
|---|---|
| [Control Flow](/docs/atoms/control-flow) | `chain`, `repeat`, `conditionally` |
| [Working Tree](/docs/atoms/working-tree) | `writeFiles`, `deleteFiles`, `renameFile`, `seededFiles` |
| [Commits & Staging](/docs/atoms/commits) | `stageFiles`, `commit`, `addCommit`, `emptyCommit`, `amendCommit` |
| [Branches & Tags](/docs/atoms/branches-tags) | `switchToBranch`, `checkoutBranch`, `createBranch`, `deleteBranch`, `createTag`, `deleteTag` |
| [Remotes & Tracking](/docs/atoms/remotes) | `addRemote`, `removeRemote`, `renameRemote`, `setUpstream`, `setRemoteRef` |
| [Operations](/docs/atoms/operations) | `startMerge`, `cherryPick`, `revert`, `startRebase`, `startBisect`, `resetTo`, ... |
| [Scoping](/docs/atoms/scoping) | `onBranch`, `insideSubmodule`, `withAuthor`, `withRemoteTracking` |
| [Utilities](/docs/atoms/utilities) | `enableSparseCheckout`, `shallowAt`, `addNote`, `installHook`, `setConfig`, `daysAgo` |

## Writing custom atoms

Any function that returns a `Step` is an atom:

```ts
import type { Step } from '@gfargo/git-scenarios'

function myCustomAtom(arg: string): Step {
  return async (repo) => {
    await repo.git.raw(['some-command', arg])
  }
}

// Use it alongside built-in atoms:
await chain(
  addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
  myCustomAtom('value'),
)(repo)
```
