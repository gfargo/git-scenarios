---
title: Quick Start
description: Get up and running with git-scenarios in 2 minutes.
---

## Use a curated scenario

The fastest path — spin up a named scenario and test against it:

```ts
import { spinUpScenario, type TempGitRepo } from '@gfargo/git-scenarios'

describe('my tool against a PR-ready branch', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await spinUpScenario('feature-pr-ready')
  })

  afterAll(async () => {
    await repo.cleanup()
  })

  it('detects the feature branch', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('feat/widget-v2')
  })
})
```

`spinUpScenario` accepts an optional options bag for common needs:

```ts
const repo = await spinUpScenario('feature-pr-ready', {
  // Add a remote so gh-aware tools detect one
  remote: 'git@github.com:org/repo.git',
  // Process-exit cleanup safety net (in addition to your explicit cleanup)
  autoCleanup: true,
})
```

## Use a framework adapter

Even less boilerplate — the adapter handles `beforeAll` / `afterAll` for you:

```ts
// Jest:
import { describeWithScenario } from '@gfargo/git-scenarios/jest'
// Vitest:
import { describeWithScenario } from '@gfargo/git-scenarios/vitest'
// node:test:
import { describeWithScenario } from '@gfargo/git-scenarios/node-test'
// Mocha:
import { describeWithScenario } from '@gfargo/git-scenarios/mocha'
// AVA (different shape — no describe blocks):
import { withScenario } from '@gfargo/git-scenarios/ava'

describeWithScenario('feature-pr-ready', (getRepo) => {
  it('detects the feature branch', async () => {
    const repo = getRepo()
    const status = await repo.git.status()
    expect(status.current).toBe('feat/widget-v2')
  })
})
```

## Compose inline

Build any state from atoms when no curated scenario fits:

```ts
import { createTempGitRepo, chain, addCommit, switchToBranch, startMerge } from '@gfargo/git-scenarios'

const repo = await createTempGitRepo()
await chain(
  addCommit({ message: 'base', files: { 'src/app.ts': 'base\n' } }),
  switchToBranch('feat/theirs'),
  addCommit({ message: 'theirs', files: { 'src/app.ts': 'theirs\n' } }),
  switchToBranch('main'),
  addCommit({ message: 'ours', files: { 'src/app.ts': 'ours\n' } }),
  startMerge('feat/theirs'),
)(repo)
// repo is now mid-merge with src/app.ts conflicted
```

## Extend a scenario

Start from a baseline and add more on top:

```ts
import { fromScenario, addCommit, writeFiles } from '@gfargo/git-scenarios'

const repo = await fromScenario('feature-pr-ready',
  addCommit({ message: 'one more commit', files: { 'extra.ts': 'x\n' } }),
  writeFiles({ 'dirty.ts': 'uncommitted\n' }),
)
// feature-pr-ready + extra commit + dirty file
```

## Assert against the state

Read the repo's state as one structured object, or assert against it without hand-rolling `git` calls:

```ts
import { spinUpScenario, assertRepo } from '@gfargo/git-scenarios'

const repo = await spinUpScenario('feature-pr-ready')

// One structured snapshot…
const snap = await repo.snapshot()
snap.head.branch     // 'feat/widget-v2'
snap.status.clean    // true
snap.operation       // null

// …or a fluent assertion chain (throws on the first mismatch)
await assertRepo(repo).onBranch('feat/widget-v2').cleanWorktree().commitCount(7)
```

In Jest or Vitest you can register `expect(...)` matchers instead:

```ts
import { matchers } from '@gfargo/git-scenarios/matchers'
expect.extend(matchers)

await expect(repo).toBeMidMerge()
await expect(repo).toHaveConflictIn('src/widget.ts')
```

See the [Testing Recipes guide](/docs/guides/recipes#assert-in-one-line-assertrepo-and-expect-matchers) for the full set.

## Use the CLI

Test any tool against a known git state:

```bash
# Launch lazygit against a mid-merge conflict
npx git-scenarios create mid-merge-conflict --run "lazygit"

# Open VS Code against a dirty worktree
npx git-scenarios create dirty-many-files --run "code -n"

# Just get the path
npx git-scenarios create feature-pr-ready
# → /var/folders/.../git-scenarios-xR2qwz
```

## Next steps

- [Browse all 46 scenarios →](/docs/scenarios/browse)
- [Learn the atom API →](/docs/atoms/overview)
- [Set up the Jest adapter →](/docs/guides/jest-adapter)
