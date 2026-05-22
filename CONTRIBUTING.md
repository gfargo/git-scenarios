# Contributing to `@gfargo/git-scenarios`

Thanks for your interest in contributing! This guide covers the
conventions and workflows for adding atoms, scenarios, and tests.

## Getting started

```bash
git clone https://github.com/gfargo/git-scenarios.git
cd git-scenarios
npm install
npm test          # run the full suite
npm run build     # compile TypeScript
```

## Project structure

```
src/
├── atoms/              # Building blocks — one atom per file
│   ├── index.ts        # Barrel export
│   └── *.ts            # Individual atoms
├── scenarios/          # Named, curated repo states
│   ├── index.ts        # Registry + lookup
│   ├── types.ts        # Scenario type definition
│   ├── shared/         # Shared utilities for scenarios
│   └── *.ts / *.test.ts  # Scenario + co-located test
├── __fixtures__/       # Vendored deterministic generators
├── index.ts            # Public API entry point
├── tempGitRepo.ts      # Low-level repo creation
├── spinUpScenario.ts   # One-shot scenario API
└── fromScenario.ts     # Scenario + extra steps helper
bin/
└── cli.ts              # CLI driver
```

## Adding a new atom

1. **Create the file**: `src/atoms/<name>.ts`
2. **Follow the `Step` contract**: Every atom returns `(repo: TempGitRepo) => Promise<void>`
3. **Add JSDoc**: Multi-line `/** ... */` with usage examples
4. **Export from barrel**: Add to `src/atoms/index.ts`
5. **Re-export from public API**: Add to `src/index.ts`
6. **Add tests**: Either in an existing test file (`atoms.test.ts`, `atomsAdvanced.test.ts`, `atomsExtras.test.ts`) or a new co-located test

### Atom design rules

- Atoms are pure side-effect functions — they mutate the repo, nothing else
- Atoms must NOT import from scenarios or CLI layers
- Use `execFileAsync` (child_process) when simple-git's API is insufficient
- Let errors propagate naturally (no try/catch unless cleanup is needed)
- Use `finally` blocks for cleanup of temp resources

### Example atom

```ts
import type { Step } from './types'

/**
 * Do something useful to the repo.
 *
 *   chain(
 *     addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
 *     myNewAtom('arg'),
 *   )
 */
export function myNewAtom(arg: string): Step {
  return async (repo) => {
    await repo.git.raw(['some-command', arg])
  }
}
```

## Adding a new scenario

1. **Create the file**: `src/scenarios/<kebab-name>.ts`
2. **Use `defineScenario`**: Validates name, kind, and required fields at import time
3. **Create the test**: `src/scenarios/<kebab-name>.test.ts`
4. **Register in the index**: Import + add to `allScenarios` array + add named export
5. **Re-export from `src/index.ts`**

### Scenario design rules

- Names are **kebab-case** (enforced by `defineScenario`)
- Kind must be one of: `'branch' | 'worktree' | 'operation' | 'history' | 'stash' | 'submodule'`
- Use `chain(...)` of atoms for the `setup` function
- Scenarios must be **deterministic** — same setup produces identical state every run
- Scenarios must NOT configure remotes (consumers add their own)
- Include a `contracts` array documenting expected post-setup state
- Optionally include `tags` for finer-grained filtering

### Scenario test pattern

```ts
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { myNewScenario } from './my-new-scenario'

describe('my-new-scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await myNewScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  // One test per contract line
  it('has the expected branch', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
  })
})
```

## Testing

### Running tests

```bash
npm test                    # full suite
npm run test:coverage       # with coverage report
npm run test:watch          # watch mode
npx jest path/to/file       # single file
```

### Test conventions

- Use `withRepo` helper for atom tests (creates + cleans up a `TempGitRepo`)
- Use `seedMain` helper when atoms need at least one commit
- Group related atoms in `describe` blocks
- Add explicit timeout for slow operations: `it('...', async () => {...}, 60_000)`
- Submodule tests should use `60_000` timeout
- Tests with 20+ sequential git operations should use `30_000`

### What to test

- DO test that atoms produce the expected repo state
- DON'T test simple-git itself or git behavior
- Prefer specific assertions over snapshots

## Code style

- **TypeScript strict mode** — no `any`, no implicit returns
- **`type` imports** for type-only references
- **Named exports** over default exports
- **JSDoc** on all public functions
- **One atom per file**, one scenario per file

### Import order

1. Node stdlib (`fs`, `path`, `child_process`)
2. External packages (`simple-git`)
3. Internal relative imports

## Pull request checklist

- [ ] New atoms have JSDoc with usage examples
- [ ] New scenarios have co-located tests verifying all contracts
- [ ] New exports added to barrel files (`atoms/index.ts`, `src/index.ts`)
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] CHANGELOG.md updated (under `[Unreleased]`)

## Release process

Releases are cut from `main`. The maintainer:

1. Updates `[Unreleased]` in CHANGELOG.md to the new version
2. Bumps `version` in package.json
3. Commits, tags, pushes
4. `npm publish` (runs `prepublishOnly` gate: clean + build + test + lint)
