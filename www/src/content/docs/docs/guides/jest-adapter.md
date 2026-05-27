---
title: Jest & Vitest Adapters
description: Zero-boilerplate scenario testing with the Jest or Vitest framework adapter.
---

The package ships two framework adapters with the same API. Pick the one that matches your test runner — the rest of your test code stays identical.

```ts
// Jest:
import { describeWithScenario } from '@gfargo/git-scenarios/jest'

// Vitest:
import { describeWithScenario } from '@gfargo/git-scenarios/vitest'
```

Both adapters are thin wrappers that handle scenario setup and teardown automatically — you write only the assertions.

## `describeWithScenario`

Wraps the test framework's `describe` with automatic `beforeAll` (spin up) and `afterAll` (cleanup):

```ts
import { describeWithScenario } from '@gfargo/git-scenarios/jest'  // or /vitest

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
import { describeEachScenario } from '@gfargo/git-scenarios/jest'  // or /vitest

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

## Vitest specifics

The Vitest adapter has the same surface as the Jest adapter — only the import path changes. Vitest's `describe` / `beforeAll` / `afterAll` globals are runtime-resolved through Vitest's own registry, so a separate adapter file keeps the imports clean.

You'll need `vitest` installed in your project (peer-style — the adapter doesn't bundle it):

```bash
npm install --save-dev vitest @gfargo/git-scenarios simple-git
```

Then enable globals in your `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
  },
})
```

Or import explicitly per file:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { describeWithScenario } from '@gfargo/git-scenarios/vitest'
```

## Why two adapters instead of one?

Jest and Vitest both provide `describe` / `beforeAll` / `afterAll` at runtime, but they resolve through different module registries — Jest's via `@jest/globals`, Vitest's via the `vitest` package. A single shared adapter would have to do runtime detection or carry both as dependencies.

Two thin adapter files keep:
- **Imports clean** — no `vitest` dependency for Jest users, no `jest` types for Vitest users.
- **Behavior aligned** — the surface is identical, so swapping frameworks in your project is one import-line change per test file.
- **Bundle size minimal** — each adapter is ~30 lines of glue.
