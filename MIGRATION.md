# Migrating to v1.0.0

This guide covers all breaking changes from v0.x to v1.0.0 and how to update your code.

## Breaking Changes

### 1. Temp directory prefix changed

Temporary directories now use the `git-scenarios-` prefix instead of `coco-git-test-`.

- **Before:** `coco-git-test-XXXXXX`
- **After:** `git-scenarios-XXXXXX`
- **Impact:** Cleanup scripts or CI teardown steps that match the old prefix need updating.

The CLI `clean` command handles both prefixes automatically — legacy directories are labeled `(legacy)` in output.

#### Before

```typescript
// Custom cleanup script matching old prefix
import { readdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const dirs = readdirSync(tmpdir()).filter((d) => d.startsWith('coco-git-test-'))
for (const dir of dirs) {
  rmSync(join(tmpdir(), dir), { recursive: true, force: true })
}
```

#### After

```typescript
// Update prefix match — or just use the CLI
import { readdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const dirs = readdirSync(tmpdir()).filter(
  (d) => d.startsWith('git-scenarios-') || d.startsWith('coco-git-test-')
)
for (const dir of dirs) {
  rmSync(join(tmpdir(), dir), { recursive: true, force: true })
}

// Or simply run:
// npx git-scenarios clean
```

---

### 2. Default test identity changed

The git user identity configured in temporary repos now reflects the package name.

- **Before:** `Coco Test <coco@example.com>`
- **After:** `Git Scenarios Test <test@git-scenarios.dev>`
- **Impact:** Tests asserting on commit author or email need updating.

#### Before

```typescript
const repo = await createTempGitRepo()
await repo.commitAll('initial')

const log = await repo.git.log()
expect(log.latest?.author_name).toBe('Coco Test')
expect(log.latest?.author_email).toBe('coco@example.com')
```

#### After

```typescript
const repo = await createTempGitRepo()
await repo.commitAll('initial')

const log = await repo.git.log()
expect(log.latest?.author_name).toBe('Git Scenarios Test')
expect(log.latest?.author_email).toBe('test@git-scenarios.dev')
```

---

### 3. Typed error classes

The library now exports typed error classes instead of throwing plain `Error` instances.

- **Before:** Untyped `Error` throws with string messages
- **After:** `ScenarioNotFoundError`, `GitCommandError`, `InvalidArgumentError`
- **Impact:** `catch` blocks checking `error.message` can now use `instanceof` for cleaner branching.

All error classes extend a common `GitScenariosError` base class with a `code` property.

#### Before

```typescript
import { spinUpScenario } from '@gfargo/git-scenarios'

try {
  await spinUpScenario('nonexistent-scenario')
} catch (err) {
  if (err instanceof Error && err.message.includes('not found')) {
    console.log('Scenario does not exist')
  }
}
```

#### After

```typescript
import { spinUpScenario, ScenarioNotFoundError } from '@gfargo/git-scenarios'

try {
  await spinUpScenario('nonexistent-scenario')
} catch (err) {
  if (err instanceof ScenarioNotFoundError) {
    console.log(`Unknown scenario: "${err.scenarioName}"`)
    console.log(`Available: ${err.availableScenarios.join(', ')}`)
  }
}
```

#### Catching git command failures

```typescript
import { GitCommandError } from '@gfargo/git-scenarios'

try {
  await someAtom(repo)
} catch (err) {
  if (err instanceof GitCommandError) {
    console.error(`Command failed: ${err.command}`)
    console.error(`Exit code: ${err.exitCode}`)
    console.error(`Stderr: ${err.stderr}`)
    console.error(`Atom: ${err.atomName}`)
  }
}
```

#### Catching invalid arguments

```typescript
import { InvalidArgumentError } from '@gfargo/git-scenarios'

try {
  await switchToBranch('feature')(repo) // repo has no commits
} catch (err) {
  if (err instanceof InvalidArgumentError) {
    console.error(`Invalid "${err.parameterName}": ${err.constraint}`)
  }
}
```

#### Catching any library error

```typescript
import { GitScenariosError } from '@gfargo/git-scenarios'

try {
  await spinUpScenario('some-scenario')
} catch (err) {
  if (err instanceof GitScenariosError) {
    console.error(`[${err.code}] ${err.message}`)
  }
}
```

---

### 4. `TempGitRepo.exists()` is now truly async

The `exists()` helper previously used `existsSync` internally, blocking the event loop. It now uses `fs/promises.access`.

- **Before:** Used `existsSync` internally (blocked event loop)
- **After:** Uses `fs/promises.access` (non-blocking)
- **Impact:** No API change — the signature was already `(filePath: string) => Promise<boolean>`. If you were already `await`-ing the result, no code changes are needed.

#### Before (internal implementation)

```typescript
// Old internal implementation — blocked the event loop
const exists = async (filePath: string) => {
  return existsSync(join(path, filePath))
}
```

#### After (internal implementation)

```typescript
// New internal implementation — truly non-blocking
const exists = async (filePath: string): Promise<boolean> => {
  try {
    await access(join(path, filePath), constants.F_OK)
    return true
  } catch {
    return false
  }
}
```

#### Usage (unchanged)

```typescript
const repo = await createTempGitRepo()
await repo.writeFile('src/index.ts', 'export {}')

// This worked before and still works — no changes needed
const fileExists = await repo.exists('src/index.ts') // true
const missing = await repo.exists('nope.txt') // false
```

---

## Summary of exports

New exports added in v1.0.0:

```typescript
import {
  // Error classes (NEW)
  GitScenariosError,
  ScenarioNotFoundError,
  GitCommandError,
  InvalidArgumentError,

  // Everything else (unchanged)
  spinUpScenario,
  fromScenario,
  createTempGitRepo,
  chain,
  // ... all atoms
} from '@gfargo/git-scenarios'
```

## Need help?

If you run into issues migrating, please [open an issue](https://github.com/gfargo/git-scenarios/issues) with the `migration` label.
