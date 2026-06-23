---
title: Architecture
description: How git-scenarios is layered, why it's structured that way, and where each piece lives.
---

`@gfargo/git-scenarios` is a layered library. Each layer has a single responsibility and only depends on the layers below it. This page explains how the pieces fit together — useful for contributors and for anyone considering vendoring or extracting parts of the codebase.

## The layer cake

```
┌──────────────────────────────────────────────────────────────┐
│ Layer 5: Framework adapters (jest.ts, vitest.ts)             │
│   describeWithScenario / describeEachScenario wrappers       │
├──────────────────────────────────────────────────────────────┤
│ Layer 4: Public API (spinUpScenario, fromScenario, registry) │
│   The one-line entry points consumers reach for first        │
├──────────────────────────────────────────────────────────────┤
│ Layer 3: Scenarios (src/scenarios/)                          │
│   Curated, named repo states built from atoms                │
├──────────────────────────────────────────────────────────────┤
│ Layer 2: Atoms (src/atoms/)                                  │
│   Composable Step factories — addCommit, switchToBranch, ... │
├──────────────────────────────────────────────────────────────┤
│ Layer 1: TempGitRepo (tempGitRepo.ts)                        │
│   The on-disk git repo handle: { path, git, writeFile, ... } │
├──────────────────────────────────────────────────────────────┤
│ Layer 0: simple-git + Node.js stdlib                         │
│   External dependencies                                      │
└──────────────────────────────────────────────────────────────┘
```

**Dependency direction is strictly upward.** Layer N can import from N-1 through 0, but never from N+1. This rule keeps the atom layer extractable, the scenario layer testable in isolation, and the public API thin.

## Layer 1: TempGitRepo

`createTempGitRepo()` produces a fresh git repo on disk:

```ts
type TempGitRepo = {
  path: string                          // absolute fs path
  git: SimpleGit                        // simple-git instance
  writeFile: (path, content) => Promise<void>
  readFile: (path) => Promise<string>
  exists: (path) => Promise<boolean>
  commitAll: (message) => Promise<void>
  snapshot: () => Promise<RepoSnapshot>  // structured state, read-only
  cleanup: () => Promise<void>
}
```

**What it does:**
- `mkdtemp` a unique dir under `tmpdir()`
- `git init` + checkout `main`
- Set `user.name` / `user.email` / `commit.gpgsign=false` so commits work on CI runners without global git config
- Optionally register the dir for process-exit cleanup (autoCleanup)

**What it doesn't do:**
- No remotes (consumers add them via atoms or CLI flags)
- No commits (the next layer handles content)
- No assumptions about branch shape, file structure, or workflow

The `TempGitRepo` type is the universal currency of every layer above. Atoms take one and produce side effects on it; scenarios compose atoms over one; the public API returns one.

### `repo.snapshot()`

`snapshot()` captures a structured, read-only description of the repo's current state — the programmatic counterpart to the `git-scenarios inspect` CLI command. Use it to assert against a materialized scenario without hand-rolling `git` calls:

```ts
const repo = await spinUpScenario('mid-merge-conflict')
const snap = await repo.snapshot()

snap.head.branch     // current branch, or null when detached
snap.head.detached   // true when HEAD points at a commit
snap.head.sha        // short SHA, or null on an empty repo
snap.branches        // local branch names
snap.status.clean    // false here
snap.status.staged   // staged paths
snap.status.modified // unstaged tracked changes
snap.status.untracked
snap.status.ahead    // vs upstream (0 when no upstream)
snap.status.behind
snap.commitCount     // commits reachable from HEAD
snap.operation       // 'merge' | 'rebase' | 'cherry-pick' | 'revert' | 'bisect' | null
snap.conflicts       // unmerged paths — non-empty mid-conflict
snap.stashes         // stash entry count
snap.graph           // git log --graph --oneline --all lines
```

The same logic is exposed standalone as `snapshotRepo(git)` for use against any `simple-git` instance, and is the shared foundation the test matchers and `diff` / `doctor` CLI commands build on. Because every scenario is deterministic, a scenario's snapshot is byte-for-byte identical across runs.

## Layer 2: Atoms

An atom is a `Step`: `(repo: TempGitRepo) => Promise<void>`. Atoms compose via `chain(...)`:

```ts
const setup: Step = chain(
  addCommit({ message: 'init', files: { 'README.md': '#' } }),
  switchToBranch('feat/x'),
  addCommit({ message: 'feat', files: { 'src/x.ts': 'x' } }),
)
```

**Design rules:**
- Every atom is a factory: `addCommit({...})` returns a `Step`. The factory captures parameters; the returned function does the work.
- Atoms are pure side-effect functions. They mutate the repo and return nothing.
- Atoms must NOT import from `src/scenarios/` or `bin/`. The arrow points down only.
- Errors propagate. `chain` short-circuits on rejection.

**Categories** (see [Atoms Overview](/docs/atoms/overview) for the full catalog):
- Control flow: `chain`, `repeat`, `conditionally`
- Working tree: `writeFiles`, `deleteFiles`, `renameFile`, `seededFiles`
- Staging + commits: `stageFiles`, `unstageFiles`, `commit`, `addCommit`, `emptyCommit`, `amendCommit`, `bulkCommits`
- Branches, tags, remotes, upstream tracking, stash
- Operations: merge, rebase, cherry-pick, revert, bisect, reset (with abort + continue lifecycle atoms)
- Submodules, worktrees, sparse checkout, shallow repo, notes, hooks
- Scoping: `onBranch`, `insideSubmodule`, `withAuthor`, `withRemoteTracking`
- Utility: `gitClean`, `writeGitignore`, `writeGitattributes`

## Layer 3: Scenarios

A scenario is a named, validated `Setup`:

```ts
type Scenario = {
  name: string                 // kebab-case
  summary: string              // one-line
  description: string          // multi-line
  kind: 'branch' | 'worktree' | 'operation' | 'history' | 'stash' | 'submodule'
  tags?: string[]              // e.g. ['conflict', 'merge']
  setup: Step                  // typically chain(...)
  contracts?: string[]         // human-readable assertions
}
```

Scenarios are constructed via `defineScenario(...)` which validates the shape at module load time (kebab-case names, valid kinds, non-empty fields). Catches typos before they become runtime mysteries.

**Design rules:**
- One scenario per file: `src/scenarios/<kebab-name>.ts`
- Co-located test: `src/scenarios/<kebab-name>.test.ts`
- Setup uses `chain(...)` of atoms — no inline simple-git calls
- Deterministic: same setup → byte-identical state every run
- No remotes (consumers add their own; keeps scenarios offline-safe)

**Categories** (see [Scenarios Overview](/docs/scenarios/overview)):
- branch: feature-pr-ready, multi-commit-branch, branch-tracking-upstream, ...
- worktree: dirty-many-files, single-staged-file, partial-stage, monorepo-multi-package, ...
- operation: mid-merge-conflict, mid-bisect, mid-rebase-conflict, ...
- history: rich-history-graph, large-repo, merge-no-conflict, ...
- stash: stashed-changes, stash-with-untracked
- submodule: submodule-with-history

## Layer 4: Public API

Three entry points, increasingly inline:

### `spinUpScenario(name, options?)`

The one-line API. Creates a temp repo + runs the named scenario. ~95% of test consumers reach for this first.

```ts
const repo = await spinUpScenario('feature-pr-ready')
```

### `fromScenario(name, ...extraSteps)`

Scenario + custom atoms in one call. For when the registered scenario is *almost* what you need.

```ts
const repo = await fromScenario('feature-pr-ready',
  addCommit({ message: 'extra', files: { 'x.ts': 'x' } }),
)
```

### `createTempGitRepo()` + atoms

The most flexible path. Build inline from the primitives. For the rare case no scenario fits and you don't want to register a custom one.

```ts
const repo = await createTempGitRepo()
await chain(addCommit({...}), switchToBranch('feat/x'))(repo)
```

### Registry surface

`registerScenario(scenario)`, `findRegistered(name)`, etc. The mutable registry is the source of truth for scenario lookup. Both built-in scenarios and custom-registered ones live here. The CLI reads from this registry too.

Implementation: `Map<string, Scenario>` for O(1) name lookup. Insertion order preserved for stable list output.

### Error attribution

The internal `resolveScenario(name, origin)` helper produces consistent "Unknown scenario X. Available: ..." errors across all entry points. The `origin` label (e.g., `'spinUpScenario'`, `'describeWithScenario'`) appears in the error so callers know where the lookup happened.

## Layer 5: Framework adapters

Thin wrappers that bind a scenario lifecycle to a test framework's setup/teardown hooks.

```ts
// jest:
import { describeWithScenario } from '@gfargo/git-scenarios/jest'
// vitest:
import { describeWithScenario } from '@gfargo/git-scenarios/vitest'
```

The two adapters are nearly identical — Vitest's globals (`describe`, `beforeAll`, `afterAll`) are runtime-resolved through its own registry, so a separate file keeps the import shape clean.

## Assertion layer

A read-only layer that sits on top of `snapshotRepo()` (Layer 1) and is consumed by tests in any runner:

- **`assertRepo(source)`** — a fluent, runner-agnostic assertion chain. Checks queue synchronously and evaluate against a single snapshot when the chain is awaited (one chain → one snapshot), resolving to that snapshot. Throws `RepoAssertionError` (carrying `assertion` / `expected` / `actual`) on the first mismatch. Accepts a `TempGitRepo` or a raw `simple-git` instance.
- **`@gfargo/git-scenarios/matchers`** — `expect(...)` matchers for Jest and Vitest, each a thin translation of an `assertRepo` check into the `{ pass, message }` shape both runners accept. Consistent with the adapters, this takes **no** dependency on a test runner: Jest types ship via a `jest.Matchers` augmentation; Vitest users augment `Assertion` with the exported `GitScenariosMatchers` interface.

Because both build on the deterministic snapshot, the same assertions hold byte-for-byte across runs.

## CLI

`bin/cli.ts` is a thin wrapper around the same public API:

- `list` → `listRegistered()` → group by kind, optionally filter by `--kind` / `--tag`, optionally emit `--json`
- `describe` → `findRegistered(name)` → format human or JSON
- `inspect` → materialize ephemerally → print `repo.snapshot()` (graph, branches, status, contracts) → clean up
- `create` → `createTempGitRepo()` + `scenario.setup(repo)` + optional `--remote` / `--path` / `--run` / `--ephemeral`
- `capture` → read a real repo's shape → emit a `defineScenario(...)` module (or `--json`)
- `clean` → scan tmpdir for stale `git-scenarios-*` dirs, prune

The CLI uses the **mutable registry**, not the static built-in array, so custom-registered scenarios surface in `list` and `describe` too. This was a regression in v0.5 (the CLI had its own static lookup) and was fixed in v0.6.

## Build pipeline

`tsup` produces dual CJS + ESM output for every entry point:
- `dist/index.{cjs,js}` — public API
- `dist/atoms/index.{cjs,js}` — atom catalog
- `dist/scenarios/index.{cjs,js}` — scenario registry
- `dist/tempGitRepo.{cjs,js}` — low-level primitive
- `dist/jest.{cjs,js}` — Jest adapter
- `dist/vitest.{cjs,js}` — Vitest adapter
- `dist/bin/cli.cjs` — CLI binary (CJS only)

Source maps and `.d.ts` declarations ship for everything.

## Testing strategy

Tests live alongside source: every atom file has a corresponding `.test.ts`, every scenario has a co-located test verifying its contract assertions. The shared `withRepo` helper in atom tests handles `createTempGitRepo` + `cleanup` boilerplate:

```ts
async function withRepo(callback: (repo: TempGitRepo) => Promise<void>): Promise<void> {
  const repo = await createTempGitRepo()
  try { await callback(repo) } finally { await repo.cleanup() }
}
```

Coverage thresholds (in `jest.config.cjs`): 80% lines/statements, 70% functions/branches. Enforced by `prepublishOnly`.

## Determinism

Every scenario produces byte-identical state every run. This is non-trivial — git records timestamps, the working dir is randomly named, content can drift if generated naively. Pieces that enforce determinism:

- Author + committer dates pinned via `GIT_AUTHOR_DATE` / `GIT_COMMITTER_DATE` env vars (per-commit `date` option)
- `daysAgo(n)` helper — relative date stamping at noon UTC
- `seededFiles({ files, seed })` — procedurally-generated file content seeded by an explicit number, not a clock
- No use of `Math.random` anywhere in atom or scenario code
- `commit.gpgsign=false` on every temp repo so commits don't depend on a host GPG keyring

Tests asserting "this scenario produces N commits with subjects [a, b, c]" depend on this determinism — flaky output would surface as immediate test failures.

## See also

- [`ARCHITECTURE.md` in the repo](https://github.com/gfargo/git-scenarios/blob/main/ARCHITECTURE.md) — the source-of-truth markdown this page mirrors
- [Custom scenarios guide](/docs/guides/custom-scenarios) — how to extend the registry
- [Atoms overview](/docs/atoms/overview) — the full atom catalog
