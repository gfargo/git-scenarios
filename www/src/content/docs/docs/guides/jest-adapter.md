---
title: Test Runner Adapters
description: Zero-boilerplate scenario testing with Jest, Vitest, node:test, Mocha, AVA, Playwright, or Cypress.
---

The package ships adapters for every major TypeScript test runner and E2E framework. Each provides zero-boilerplate scenario setup with automatic cleanup — pick the one matching your runner.

## Quick comparison

| Runner | Import | API shape |
|---|---|---|
| Jest | `@gfargo/git-scenarios/jest` | `describeWithScenario` + `describeEachScenario` |
| Vitest | `@gfargo/git-scenarios/vitest` | `describeWithScenario` + `describeEachScenario` + `repoFixture` |
| node:test | `@gfargo/git-scenarios/node-test` | `describeWithScenario` + `describeEachScenario` + `it` |
| Mocha | `@gfargo/git-scenarios/mocha` | `describeWithScenario` + `describeEachScenario` |
| AVA | `@gfargo/git-scenarios/ava` | `withScenario` + `withScenarios` |
| Playwright | `@gfargo/git-scenarios/playwright` | `test.extend` fixture |
| Cypress | `@gfargo/git-scenarios/cypress` | `cy.task` registration |

The first four share the same `describeWithScenario` pattern. AVA uses a different shape because it has no `describe` blocks. Vitest additionally exports `repoFixture` for the idiomatic `test.extend` fixture pattern.

## Jest / Vitest / node:test / Mocha

All four use the same API — only the import path changes:

```ts
// Pick your runner:
import { describeWithScenario } from '@gfargo/git-scenarios/jest'
// import { describeWithScenario } from '@gfargo/git-scenarios/vitest'
// import { describeWithScenario } from '@gfargo/git-scenarios/node-test'
// import { describeWithScenario } from '@gfargo/git-scenarios/mocha'

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

### Options

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

### `describeEachScenario`

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

### Vitest: `test.extend` fixture

Vitest users can also use `repoFixture` — a factory that returns a `test.extend`-compatible fixture map. Each test gets a fresh repo; cleanup is automatic after every test.

```ts
import { test as base, expect } from 'vitest'
import { repoFixture } from '@gfargo/git-scenarios/vitest'

const test = base.extend(repoFixture('feature-pr-ready'))

test('on feature branch', async ({ repo }) => {
  const status = await repo.git.status()
  expect(status.current).toBe('feat/widget-v2')
})
```

Compose it with your own fixtures:

```ts
const test = base.extend({
  ...repoFixture('feature-pr-ready'),
  myFixture: [async ({}, use) => { await use('value') }, { auto: false }],
})
```

See [Testing Recipes — Vitest `test.extend` fixture](/docs/guides/recipes#vitest-testextend-fixture) for more examples.

### Runner-specific notes

**node:test** — also re-exports `it` for single-import convenience:

```ts
import { describeWithScenario, it } from '@gfargo/git-scenarios/node-test'
import assert from 'node:assert/strict'

describeWithScenario('feature-pr-ready', (getRepo) => {
  it('is on a feature branch', async () => {
    const repo = getRepo()
    const status = await repo.git.status()
    assert.notStrictEqual(status.current, 'main')
  })
})
```

Run with: `node --import tsx --test src/**/*.test.ts`

**Mocha** — timeout is set via `this.timeout(ms)` internally (Mocha's convention). Pass `timeout` in options and the adapter handles it:

```ts
describeWithScenario('large-repo', (getRepo) => {
  // ...
}, { timeout: 120_000 })
```

## AVA

AVA doesn't have `describe` blocks — tests are flat. The adapter exports `withScenario` which returns a handle for use with AVA's `test.before()` and `test.after.always()`:

```ts
import test from 'ava'
import { withScenario } from '@gfargo/git-scenarios/ava'

const scenario = withScenario('feature-pr-ready')

test.before(scenario.setup)
test.after.always(scenario.cleanup)

test('is on a feature branch', async (t) => {
  const repo = scenario.getRepo()
  const status = await repo.git.status()
  t.not(status.current, 'main')
})

test('has a clean worktree', async (t) => {
  const repo = scenario.getRepo()
  const status = await repo.git.status()
  t.true(status.isClean())
})
```

### With extra steps

```ts
import { withScenario } from '@gfargo/git-scenarios/ava'
import { writeFiles } from '@gfargo/git-scenarios/atoms'

const scenario = withScenario('mid-merge-conflict', {
  extraSteps: [writeFiles({ 'extra.ts': 'extra\n' })],
})
```

### Multiple scenarios (`withScenarios`)

```ts
import test from 'ava'
import { withScenarios } from '@gfargo/git-scenarios/ava'

const scenarios = withScenarios(['feature-pr-ready', 'two-commit-feature'])

for (const [name, scenario] of Object.entries(scenarios)) {
  test.before(scenario.setup)
  test.after.always(scenario.cleanup)

  test(`${name}: has a clean worktree`, async (t) => {
    const repo = scenario.getRepo()
    const status = await repo.git.status()
    t.true(status.isClean())
  })
}
```

### Concurrency note

AVA runs tests concurrently by default. Since all tests in a `withScenario` group share a single repo instance, use `test.serial` if your tests mutate the repo state. If tests are read-only (status checks, log queries), concurrent is fine.

## Assertion matchers (Jest & Vitest)

Alongside the lifecycle wrappers, the library ships `expect(...)` matchers for asserting repo state directly — register them once in your setup file:

```ts
import { matchers } from '@gfargo/git-scenarios/matchers'
expect.extend(matchers)
```

```ts
await expect(repo).toBeOnBranch('feat/widget-v2')
await expect(repo).toHaveCleanWorktree()
await expect(repo).toBeMidMerge()
await expect(repo).toHaveConflictIn('src/widget.ts')
await expect(repo).toBeAheadBy(2)
await expect(repo).not.toHaveDirtyWorktree()
```

Jest types ship automatically. Vitest users add a 4-line `Assertion` augmentation (no `vitest` dependency required of this package) — see the [Testing Recipes guide](/docs/guides/recipes#assert-in-one-line-assertrepo-and-expect-matchers) for the snippet, the full matcher list, and the `assertRepo(...)` fluent API that the other three runners (node:test, Mocha, AVA) use instead.

## Custom scenarios

All adapters search the full mutable registry, so custom-registered scenarios work everywhere:

```ts
import { registerScenario, defineScenario, chain, addCommit } from '@gfargo/git-scenarios'

registerScenario(defineScenario({
  name: 'my-custom',
  summary: 'custom state',
  description: '...',
  kind: 'branch',
  setup: chain(addCommit({ message: 'custom', files: { 'x.ts': 'x\n' } })),
}))

// Now works in any adapter:
describeWithScenario('my-custom', (getRepo) => { /* ... */ })
// or:
const scenario = withScenario('my-custom')
```

## Playwright

The Playwright adapter uses `test.extend` to provide a `scenarioRepo` fixture that materializes a scenario per test and cleans up automatically:

```ts
import { createScenarioTest } from '@gfargo/git-scenarios/playwright'

const test = createScenarioTest('mid-merge-conflict')

test('my git GUI shows conflict markers', async ({ scenarioRepo, page }) => {
  // scenarioRepo.path — path to the materialized repo
  // scenarioRepo.git — simple-git instance
  // Use page to drive your web-based git tool against the repo
  await page.goto(`http://localhost:3000?repo=${scenarioRepo.path}`)
  await expect(page.locator('.conflict-marker')).toBeVisible()
})
```

Each test gets its own isolated repo instance. Cleanup runs automatically after the test completes.

## Cypress

The Cypress adapter registers scenario materialization as a `cy.task`:

```ts
// cypress.config.ts
import { registerScenarioTasks } from '@gfargo/git-scenarios/cypress'

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      registerScenarioTasks(on)
      return config
    },
  },
})
```

Then in your tests:

```ts
describe('git tool against merge conflict', () => {
  let repoPath: string

  before(() => {
    cy.task('createScenario', 'mid-merge-conflict').then((path) => {
      repoPath = path as string
    })
  })

  after(() => {
    cy.task('cleanupScenario', repoPath)
  })

  it('shows the conflict file', () => {
    cy.visit(`/?repo=${repoPath}`)
    cy.get('.conflict-indicator').should('exist')
  })
})
```

Tasks: `createScenario` (returns path), `cleanupScenario` (removes the dir).
