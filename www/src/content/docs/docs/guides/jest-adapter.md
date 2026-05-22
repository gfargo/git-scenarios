---
title: Jest Adapter
description: Zero-boilerplate scenario testing with the Jest framework adapter.
---

The `@gfargo/git-scenarios/jest` subpath export provides helpers that handle scenario setup and teardown automatically.

## `describeWithScenario`

Wraps Jest's `describe` with automatic `beforeAll` (spin up) and `afterAll` (cleanup):

```ts
import { describeWithScenario } from '@gfargo/git-scenarios/jest'

describeWithScenario('feature-pr-ready', (getRepo) => {
  it('is on a feature branch', async () => {
    const repo = getRepo()
    const status = await repo.git.status()
    expect(status.current).toBe('feat/widget-v2')
  })

  it('has a clean worktree', async () => {
    const repo = getRepo()
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
```

The `getRepo()` accessor returns the live `TempGitRepo` instance. Call it inside `it()` blocks.

## Options

```ts
describeWithScenario('submodule-with-history', (getRepo) => {
  // tests...
}, {
  timeout: 60_000,  // increase for slow scenarios (submodules, large repos)
  extraSteps: [     // apply additional atoms after the scenario setup
    writeFiles({ 'extra.ts': 'extra\n' }),
  ],
})
```

## `describeEachScenario`

Run the same tests against multiple scenarios:

```ts
import { describeEachScenario } from '@gfargo/git-scenarios/jest'

describeEachScenario(
  ['feature-pr-ready', 'two-commit-feature', 'multi-commit-branch'],
  (getRepo, scenarioName) => {
    it(`has a clean worktree in ${scenarioName}`, async () => {
      const repo = getRepo()
      const status = await repo.git.status()
      expect(status.isClean()).toBe(true)
    })
  },
)
```

This creates a separate `describe` block for each scenario, with independent setup/teardown.

## Custom scenarios

The adapter searches the full registry, so custom-registered scenarios work too:

```ts
import { registerScenario, defineScenario, chain, addCommit } from '@gfargo/git-scenarios'
import { describeWithScenario } from '@gfargo/git-scenarios/jest'

registerScenario(defineScenario({
  name: 'my-custom',
  summary: 'custom state',
  description: '...',
  kind: 'branch',
  setup: chain(addCommit({ message: 'custom', files: { 'x.ts': 'x\n' } })),
}))

describeWithScenario('my-custom', (getRepo) => {
  it('works', async () => {
    const repo = getRepo()
    const log = await repo.git.log()
    expect(log.latest?.message).toBe('custom')
  })
})
```
