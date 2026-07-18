---
title: Custom Scenarios
description: Define and register your own scenarios.
---

## Defining a scenario

Use `defineScenario` to create a validated scenario:

```ts
import { defineScenario, chain, addCommit, writeFiles } from '@gfargo/git-scenarios'

export const myScenario = defineScenario({
  name: 'my-monorepo-dirty',           // must be kebab-case
  summary: 'monorepo with dirty lib',   // one-line for CLI list
  description: 'Two workspace packages on main; uncommitted edits in packages/lib.',
  kind: 'worktree',                     // branch | worktree | operation | history | stash | submodule
  tags: ['monorepo', 'dirty'],          // optional, for findScenariosByTag
  contracts: [                          // optional, documents expected state
    'main has 2 commits',
    'packages/lib/src/foo.ts is unstaged',
  ],
  setup: chain(
    addCommit({
      message: 'chore: scaffold',
      files: { 'packages/lib/src/foo.ts': 'export const foo = 1\n' },
    }),
    addCommit({
      message: 'feat: lib baseline',
      files: { 'packages/app/src/index.ts': 'import { foo } from "lib"\n' },
    }),
    writeFiles({ 'packages/lib/src/foo.ts': 'export const foo = 2\n' }),
  ),
})
```

`defineScenario` validates at module load time:
- Name must be kebab-case
- Kind must be a valid enum value
- Summary and description must be non-empty
- Contracts (if present) must be non-empty strings

## Using without registration

You can use a scenario directly without registering it:

```ts
import { createTempGitRepo } from '@gfargo/git-scenarios'
import { myScenario } from './my-scenario'

const repo = await createTempGitRepo()
await myScenario.setup(repo)
// ... test against repo ...
await repo.cleanup()
```

## Registering for global access

Register so it works with `spinUpScenario`, `fromScenario`, and the CLI:

```ts
import { registerScenario } from '@gfargo/git-scenarios'
import { myScenario } from './my-scenario'

registerScenario(myScenario)

// Now available everywhere:
const repo = await spinUpScenario('my-monorepo-dirty')
```

### Registry API

| Function | Description |
|---|---|
| `registerScenario(scenario)` | Add one. Throws on duplicate names. |
| `registerScenarios([...])` | Add multiple. |
| `unregisterScenario(name)` | Remove by name. Returns boolean. |
| `listRegistered()` | All scenarios (built-in + custom). |
| `findRegistered(name)` | Lookup by name. O(1). |
| `findRegisteredByTag(tags, match?)` | Filter by tag. Searches built-in + custom. |
| `resetRegistry()` | Restore to built-in-only. |

### Test isolation

Call `resetRegistry()` in `afterEach` to prevent custom registrations from leaking between tests:

```ts
import { registerScenario, resetRegistry } from '@gfargo/git-scenarios'

afterEach(() => {
  resetRegistry()
})
```

## Filtering by tag

Both built-in scenarios and your custom-registered ones can be filtered by tag.

```ts
import { findScenariosByTag, findRegisteredByTag } from '@gfargo/git-scenarios'

// Built-ins only:
const conflicts = findScenariosByTag(['conflict'])

// Built-ins + custom-registered:
const allConflicts = findRegisteredByTag(['conflict'])

// Scenarios matching ALL tags
const dirtyMonorepos = findRegisteredByTag(['monorepo', 'dirty'], 'all')
```

Use the registry-aware variant (`findRegisteredByTag`) when your test suite registers custom scenarios at startup and you want to query the full surface uniformly.

## Caching custom scenarios

`spinUpScenario(name, { cache: true })` and `fromScenario(name, { cache: true }, ...)` materialize built-in scenarios from an on-disk template cache, keyed by the installed package version — safe, because a built-in's `setup` only changes when the package bumps.

That key isn't safe for a custom scenario: its `setup` can change at any time without a package version bump, so **custom scenarios are always freshly replayed and never cached by default**, even when `{ cache: true }` is passed. This avoids silently serving a stale materialized repo after you edit a scenario's `setup`.

If you want caching for a custom scenario, opt in with an explicit `version`:

```ts
export const myScenario = defineScenario({
  name: 'my-monorepo-dirty',
  // ...
  version: '2', // bump this every time `setup` changes
  setup: chain(/* ... */),
})
```

Bumping `version` produces a new cache key, so the old (now-stale) template is never reused. Omit `version` if you'd rather always get a correctness-guaranteed cold replay.
