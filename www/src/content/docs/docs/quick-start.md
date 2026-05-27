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

## Use the Jest or Vitest adapter

Even less boilerplate — the adapter handles `beforeAll` / `afterAll` for you:

```ts
// Jest:
import { describeWithScenario } from '@gfargo/git-scenarios/jest'
// Vitest:
import { describeWithScenario } from '@gfargo/git-scenarios/vitest'

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

## Use the CLI

Test any tool against a known git state:

```bash
# Launch lazygit against a mid-merge conflict
npx git-scenarios create mid-merge-conflict --run "lazygit"

# Open VS Code against a dirty worktree
npx git-scenarios create dirty-many-files --run "code -n"

# Just get the path
npx git-scenarios create feature-pr-ready
# → /var/folders/.../coco-git-test-xR2qwz
```

## Next steps

- [Browse all 32 scenarios →](/docs/scenarios/overview)
- [Learn the atom API →](/docs/atoms/overview)
- [Set up the Jest adapter →](/docs/guides/jest-adapter)
