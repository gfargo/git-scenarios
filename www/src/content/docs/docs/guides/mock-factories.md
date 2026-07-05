---
title: Mock Factories
description: In-memory mock objects matching simple-git's types for blazing-fast unit tests — no disk, no git, under 1ms.
sidebar:
  order: 5
---

`@gfargo/git-scenarios` offers two complementary testing modes. The **real repo** path (via `spinUpScenario`) creates actual git repositories on disk for integration tests that verify multi-step workflows. The **mock factory** path (via `@gfargo/git-scenarios/mocks`) constructs typed in-memory objects matching `simple-git`'s response shapes — perfect for unit tests where you need a `StatusResult` or `LogResult` without waiting for disk I/O or requiring git to be installed.

## Why Mock?

| | Real Repos | Mock Factories |
|---|---|---|
| **Speed** | ~200–500ms per scenario | <1ms per call |
| **Disk I/O** | Creates temp directories, writes files | None — pure memory |
| **Git dependency** | Requires `git` installed on host | No runtime deps |
| **Fidelity** | Byte-identical to real git state | Structurally identical types |
| **Use case** | Integration tests, workflow verification | Unit tests, UI rendering, error paths |

Mock factories produce objects that are structurally identical to what `simple-git` returns at runtime. The `StatusResult` includes a working `isClean()` method, `LogResult` has proper `latest`/`total` fields, and `BranchSummary` maintains its `all`/`branches` consistency invariant.

## When to Use Each

**Use real repos** when you need to:

- Test multi-step git workflows (commit → branch → merge → resolve)
- Verify actual git behavior (e.g., "does a cherry-pick produce the right diff?")
- Validate that your tool correctly shells out to git
- Run integration or end-to-end tests

**Use mock factories** when you need to:

- Test UI rendering against various git states (dirty tree, conflicts, detached HEAD)
- Test status parsing logic or display formatting
- Test error handling paths (what happens when there are conflicts?)
- Run fast unit tests in CI without git installed
- Test in environments where disk access is limited or slow

## Installation

```ts
import { mockStatus, mockSimpleGit } from '@gfargo/git-scenarios/mocks'
```

The `./mocks` subpath has **zero runtime dependencies**. It uses only type imports from `simple-git` — you don't need `simple-git` installed if you're only using mocks. This makes it ideal for lightweight unit test setups where you want typed git state objects without any heavy dependencies.

## API: Functional Factories

Each factory returns a complete, properly-typed object. Pass no arguments for clean defaults, or provide partial overrides for the fields you care about.

### `mockStatusResult(options?)`

```ts
import { mockStatusResult } from '@gfargo/git-scenarios/mocks'

// Clean status on main — all arrays empty, isClean() returns true
const clean = mockStatusResult()

// Dirty status with specific files
const dirty = mockStatusResult({
  current: 'feature/auth',
  staged: ['src/auth.ts', 'src/login.ts'],
  modified: ['src/utils.ts'],
  not_added: ['scratch.md'],
  ahead: 2,
})

// Conflict scenario
const conflicted = mockStatusResult({
  conflicted: ['src/merge-target.ts', 'src/shared.ts'],
  current: 'main',
})

// Check cleanliness
dirty.isClean()      // false
clean.isClean()      // true
```

### `mockLogResult(options?)`

```ts
import { mockLogResult } from '@gfargo/git-scenarios/mocks'

// 5 commits with deterministic hashes and dates
const log = mockLogResult({ count: 5 })
log.total   // 5
log.latest  // first entry in log.all
log.all[0].hash  // '0000000000000000000000000000000000000001'

// Custom commit entries
const custom = mockLogResult({
  commits: [
    { message: 'feat: add authentication', author_name: 'Alice' },
    { message: 'chore: initial commit', author_name: 'Bob' },
  ],
})
```

### `mockBranchSummary(options?)`

```ts
import { mockBranchSummary } from '@gfargo/git-scenarios/mocks'

// Default: single branch "main"
const simple = mockBranchSummary()

// Multiple branches
const multi = mockBranchSummary({
  current: 'develop',
  branches: ['main', 'develop', 'feature/auth'],
})
multi.all        // ['main', 'develop', 'feature/auth']
multi.current    // 'develop'
multi.detached   // false

// Detached HEAD
const detached = mockBranchSummary({
  detached: true,
  current: 'abc1234',
  branches: ['main'],
})
```

### `mockDiffResult(options?)`

```ts
import { mockDiffResult } from '@gfargo/git-scenarios/mocks'

const diff = mockDiffResult({
  files: [
    { file: 'src/auth.ts', insertions: 42, deletions: 8 },
    { file: 'src/utils.ts', insertions: 5, deletions: 3 },
  ],
})
diff.changed     // 2 (number of files)
diff.insertions  // 47 (sum of all insertions)
diff.deletions   // 11 (sum of all deletions)
```

## API: Fluent Builders

Builders let you construct mock objects incrementally with chainable method calls. They're especially useful in test helpers where you build up state piece by piece.

### Status Builder

```ts
import { mockStatus } from '@gfargo/git-scenarios/mocks'

const status = mockStatus()
  .onBranch('feature/auth')
  .staged('src/auth.ts', 'src/login.ts')
  .modified('src/utils.ts')
  .untracked('scratch.md')
  .ahead(2)
  .behind(1)
  .build()

status.current       // 'feature/auth'
status.staged        // ['src/auth.ts', 'src/login.ts']
status.modified      // ['src/utils.ts']
status.not_added     // ['scratch.md']
status.isClean()     // false
```

When the same path is added to multiple buckets, the builder merges them into a single `FileStatusResult` entry with the correct XY codes:

```ts
// File is both staged AND has unstaged modifications
const mixed = mockStatus()
  .staged('src/app.ts')
  .modified('src/app.ts')
  .build()

mixed.files[0].index        // 'M' (staged modification)
mixed.files[0].working_dir  // 'M' (unstaged modification)
```

Available builder methods: `.onBranch(name)`, `.tracking(upstream)`, `.detached(sha)`, `.ahead(n)`, `.behind(n)`, `.staged(...paths)`, `.modified(...paths)`, `.untracked(...paths)`, `.conflicted(...paths)`, `.created(...paths)`, `.deleted(...paths)`, `.renamed(from, to)`.

### Log Builder

```ts
import { mockLog } from '@gfargo/git-scenarios/mocks'

const log = mockLog()
  .commit({ message: 'feat: add OAuth support' })
  .commit({ message: 'fix: handle token expiry' })
  .commit({ message: 'chore: initial commit' })
  .build()

log.total        // 3
log.latest.message  // 'feat: add OAuth support'
```

### Branch Builder

```ts
import { mockBranches } from '@gfargo/git-scenarios/mocks'

const branches = mockBranches()
  .branch('main', { current: true })
  .branch('develop')
  .branch('feature/auth')
  .build()

branches.all      // ['main', 'develop', 'feature/auth']
branches.current  // 'main'
```

## API: Scenario-Derived Mocks

If you already use named scenarios for integration tests, you can derive matching mock objects for your unit tests — same logical state, zero disk I/O:

```ts
import { mockFromScenario } from '@gfargo/git-scenarios/mocks'

const { status, log, branches } = mockFromScenario('partial-stage')

// Mock objects reflect the scenario's documented contracts:
// "exactly 2 staged files" → status.staged.length === 2
// "main has 5 commits" → log.total === 5
```

`mockFromScenario` parses the scenario's `contracts` array — the same human-readable strings that document what `spinUpScenario` produces — and translates them into factory calls. This means your unit tests stay in sync with your integration tests without manual maintenance.

When a scenario's contracts don't specify a particular field (e.g., no commit count mentioned), sensible defaults are used. If a scenario has no parseable contracts at all, an `InvalidArgumentError` is thrown explaining the issue.

## API: Full SimpleGit Mock

For tests that need an entire `SimpleGit` instance (e.g., testing a service that accepts a `SimpleGit` dependency), use `mockSimpleGit` to create a Proxy-based mock with all methods stubbed:

### Jest

```ts
import { mockSimpleGit, mockStatus } from '@gfargo/git-scenarios/mocks'

const git = mockSimpleGit({
  createMockFn: jest.fn,
  overrides: {
    status: mockStatus().staged('src/auth.ts').conflicted('merge.ts').build(),
    log: mockLogResult({ count: 10 }),
  },
})

// Use in your test
const status = await git.status()
expect(status.staged).toContain('src/auth.ts')
expect(status.conflicted).toContain('merge.ts')

// Unconfigured methods return type-safe defaults
const branches = await git.branch()
// Returns empty BranchSummary (not undefined)
```

### Vitest

```ts
import { mockSimpleGit, mockStatus } from '@gfargo/git-scenarios/mocks'
import { vi, expect } from 'vitest'

const git = mockSimpleGit({
  createMockFn: vi.fn,
  overrides: {
    status: mockStatus().modified('README.md').build(),
  },
})

const status = await git.status()
expect(status.isClean()).toBe(false)
expect(status.modified).toContain('README.md')
```

The `createMockFn` parameter keeps the mock factory framework-agnostic — no Jest or Vitest dependency in the library itself. Pass whatever mock function factory your test framework provides.

**Default behavior for unconfigured methods:**

- `status()` → clean StatusResult
- `log()` → empty LogResult (total: 0)
- `branch()` / `branchLocal()` → single-branch BranchSummary on main
- `diffSummary()` → empty DiffResult
- `raw(...)` → resolves to `''`
- Any other method → resolves to `undefined`

## Debugging

When a test fails and you need to understand what state a mock represents, use the pretty-printers:

### `printMockStatus(status)`

Formats a `StatusResult` as `git status --porcelain=v1` output:

```ts
import { mockStatus, printMockStatus } from '@gfargo/git-scenarios/mocks'

const status = mockStatus()
  .onBranch('feature/auth')
  .staged('src/auth.ts')
  .modified('src/utils.ts')
  .untracked('notes.md')
  .build()

console.log(printMockStatus(status))
// ## feature/auth...origin/feature/auth
// M  src/auth.ts
//  M src/utils.ts
// ?? notes.md
```

### `printMockLog(log)`

Formats a `LogResult` as `git log --oneline` output:

```ts
import { mockLog, printMockLog } from '@gfargo/git-scenarios/mocks'

const log = mockLog()
  .commit({ message: 'feat: add OAuth' })
  .commit({ message: 'initial commit' })
  .build()

console.log(printMockLog(log))
// 0000000 feat: add OAuth
// 0000000 initial commit
```

## XY Code Reference

For consumers who need to understand how `simple-git` categorizes files internally, here's the mapping between porcelain XY codes and the bucket arrays they populate:

| XY | `staged` | `modified` | `not_added` | `conflicted` | `created` | `deleted` | `renamed` |
|------|----------|-----------|-------------|--------------|-----------|-----------|-----------|
| `??` | | | ✓ | | | | |
| `M ` | ✓ | | | | | | |
| ` M` | | ✓ | | | | | |
| `MM` | ✓ | ✓ | | | | | |
| `A ` | ✓ | | | | ✓ | | |
| `AM` | ✓ | ✓ | | | ✓ | | |
| `D ` | ✓ | | | | | ✓ | |
| ` D` | | ✓ | | | | | |
| `R ` | ✓ | | | | | | ✓ |
| `UU` | | | | ✓ | | | |
| `AA` | | | | ✓ | | | |
| `DD` | | | | ✓ | | | |

The `mapXYToBuckets` and `bucketsToXY` functions are exported from `@gfargo/git-scenarios/mocks` for advanced use cases like custom parsers or property-based testing.

```ts
import { mapXYToBuckets, bucketsToXY } from '@gfargo/git-scenarios/mocks'

// What buckets does "MM" (staged + unstaged modification) map to?
const placement = mapXYToBuckets('M', 'M')
// { staged: true, modified: true, not_added: false, conflicted: false, ... }

// What XY code represents a file that's only staged?
const { x, y } = bucketsToXY({ staged: true, modified: false, not_added: false, conflicted: false, created: false, deleted: false, renamed: false })
// x === 'M', y === ' '
```
