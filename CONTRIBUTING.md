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

> **Quick start:** Copy the template files and fill in the blanks:
> ```bash
> cp templates/scenario.template.ts src/scenarios/<your-name>.ts
> cp templates/scenario.test.template.ts src/scenarios/<your-name>.test.ts
> ```
> Then follow the checklist below. When opening your PR, use the
> **New Scenario** PR template (`.github/PULL_REQUEST_TEMPLATE/new_scenario.md`).

A copy-paste starting point lives in `templates/` at the repo root:

- `templates/scenario.template.ts` — scenario skeleton
- `templates/scenario.test.template.ts` — co-located test skeleton

Follow these steps:

1. **Copy the template**: `cp templates/scenario.template.ts src/scenarios/<kebab-name>.ts`
   - The import path in the template (`'../atoms'`) is already correct for `src/scenarios/`.
   - Fill in `name` (kebab-case), `summary`, `description`, `kind`, `tags`, `contracts`, and `setup`.

2. **Copy the test template**: `cp templates/scenario.test.template.ts src/scenarios/<kebab-name>.test.ts`
   - Update the import to point to your new file.
   - Write one `it()` per contract line — these become the acceptance checks.

3. **Register in `src/scenarios/index.ts`**:
   - Add an import at the top (in the appropriate kind group).
   - Add the scenario to the `allScenarios` array.
   - Add a named export at the bottom.

4. **Re-export from `src/index.ts`**: add your named export alongside the others.

5. **Determinism** — registering in `allScenarios` automatically enrolls your
   scenario in the property test at `src/__tests__/determinism.properties.test.ts`
   (Property 9), which runs every registered scenario twice and asserts identical
   commit hashes. `npm test` will catch any drift. To stay deterministic:
   - Never use `new Date()` or `Math.random()` in setup.
   - Let commit atoms pin dates via the monotonic commit clock automatically.
   - Use `seededFiles({ seed, files })` for generated file content.
   - Use `daysAgo(n)` or an explicit `date` only when a specific timeline is required.

6. **Regenerate website data** — the docs site (`www/`) renders a `scenarios.json`
   from the live registry. After your scenario is registered, regenerate it:
   ```bash
   npm run build              # build the parent package first (generator reads dist/)
   cd www && npm install && npm run gen:scenarios
   git add www/src/data/scenarios.json
   ```
   Commit the updated JSON alongside your scenario files.

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

> **Build before running e2e tests.**
> `bin/cli.e2e.test.ts` runs against the compiled `dist/bin/cli.cjs`.
> If `dist/` is absent the e2e suite skips silently — that's intentional
> for day-to-day unit/atom work.  If `dist/` is present but stale (e.g. a
> cached build from before the `mocks`, `mcp`, `matchers`, `playwright`, or
> `cypress` subpaths were added) the suite runs and a dedicated freshness
> test fails with an actionable message.
>
> Run `npm run build` once before the full suite, or any time you add/change
> a CLI command or export subpath.  `npm test` (the script in package.json)
> already calls `npm run build` as part of its pipeline — the skip path only
> surfaces when running jest directly (e.g. `npm run test:jest` or
> `npx jest --testPathPattern cli.e2e`).

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
- [ ] Determinism property test passes (`npm test` — Property 9 covers all registered scenarios automatically)
- [ ] `www/src/data/scenarios.json` regenerated and committed (`npm run build && cd www && npm run gen:scenarios`)
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
