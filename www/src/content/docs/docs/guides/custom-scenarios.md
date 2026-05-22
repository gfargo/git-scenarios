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
| `findRegistered(name)` | Lookup by name. |
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

```ts
import { findScenariosByTag } from '@gfargo/git-scenarios'

// All conflict scenarios
const conflicts = findScenariosByTag(['conflict'])

// Scenarios matching ALL tags
const dirtyMonorepos = findScenariosByTag(['monorepo', 'dirty'], 'all')
```
