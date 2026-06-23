---
title: Release Notes
description: Version history and changelog for @gfargo/git-scenarios.
---

The full changelog lives in [`CHANGELOG.md`](https://github.com/gfargo/git-scenarios/blob/main/CHANGELOG.md). This page summarizes recent releases.

## v1.1.0 — 2026-06-23

Tooling and trust. Two new CLI commands for working with scenarios interactively, plus a determinism fix that makes the "byte-identical every run" promise hold across **all** 32 scenarios — not just the few that pinned dates.

### Highlights

- **`git-scenarios inspect <name>`** — a read-only counterpart to `create`. Materializes a scenario in a throwaway temp repo, prints its commit graph, branches, and working-tree status, then cleans up. `--json` emits a structured `{ graph, branches, status, contracts }` payload. See a scenario's shape without leaving anything on disk.
- **`git-scenarios capture [path]`** — snapshot a real repository's shape into a reusable `defineScenario(...)` module. Reproduces the current branch, commit-graph shape, and working-tree dirty state; emits a ready-to-edit TypeScript module (or `--json` with file contents omitted). Read-only against the target repo. Programmatic helpers available from the new `@gfargo/git-scenarios/capture` subpath.
- **Full hash determinism across all 32 scenarios.** A new deterministic commit clock hands every commit a monotonic date from a fixed epoch, so every commit-creating path is reproducible. Previously only 3 date-pinning scenarios had stable hashes across runs; the rest stamped the wall clock and drifted. Commit hashes for existing scenarios change once with this fix — but since they were never stable before, nothing could have depended on specific values.

### Docs

- New [Testing Recipes](/docs/guides/recipes) guide covering all 5 runner adapters, merge-conflict assertions, staged/unstaged splits, custom scenarios, and graph snapshots.
- Scenario browser now shows each scenario's commit graph inline.

[Full release notes →](https://github.com/gfargo/git-scenarios/releases/tag/v1.1.0)

## v1.0.0 — 2026-05-29

The **stable release**. v1 is about trust, not new features — typed errors, cross-platform verification, determinism guarantees, and removing the last traces of the library's origin as a coco internal helper.

### Highlights

- **Exported error type hierarchy**: `GitScenariosError` base class with `ScenarioNotFoundError`, `GitCommandError`, and `InvalidArgumentError` subclasses. All errors carry a discriminating `code` field.
- **Precondition guards**: `switchToBranch`, `startMerge`, `cherryPick`, `startRebase`, `createBranch` throw `InvalidArgumentError` immediately on empty repos instead of failing deep inside git.
- **`withGitError` helper**: Wraps git command failures in `GitCommandError` with atom name traceability.
- **Async `exists()` fix**: `TempGitRepo.exists()` now uses `fs/promises.access` instead of blocking `existsSync`.
- **Branding cleanup**: Temp prefix `coco-git-test-` → `git-scenarios-`, identity `Coco Test` → `Git Scenarios Test`.
- **macOS CI**: 3 OS × 2 Node versions matrix.
- **Git version compatibility**: Documented minimum (≥2.25.0), CI job testing 2.25.0 + latest.
- **Cross-platform path hardening**: Audited all atoms, fixed `pinSubmodule`, added case-sensitivity docs.
- **11 property-based tests** (fast-check) covering error hierarchy, determinism, path normalization.
- **Determinism verification** for all 32 built-in scenarios.
- **`MIGRATION.md`** documenting all breaking changes with before/after examples.

### Breaking changes

See the [Migration Guide](https://github.com/gfargo/git-scenarios/blob/main/MIGRATION.md) for full details.

[Full release notes →](https://github.com/gfargo/git-scenarios/releases/tag/v1.0.0)

## v0.7.0 — 2026-05-28

The adapter-family release. Completes test-runner coverage across the TypeScript ecosystem.

### Highlights

- **Three new test-runner adapters** (five total):
  - `@gfargo/git-scenarios/node-test` — Node.js native test runner. Same `describeWithScenario` surface as Jest/Vitest, plus a re-exported `it`. No external dependencies.
  - `@gfargo/git-scenarios/mocha` — Mocha framework adapter. Uses runtime-injected globals with `this.timeout(ms)`.
  - `@gfargo/git-scenarios/ava` — AVA framework adapter. Different shape: `withScenario` returns a handle with `setup` / `cleanup` / `getRepo` for `test.before()` / `test.after.always()`.

### Complete adapter family

| Runner | Subpath | Shape |
|---|---|---|
| Jest | `./jest` | `describeWithScenario` + `describeEachScenario` |
| Vitest | `./vitest` | `describeWithScenario` + `describeEachScenario` |
| node:test | `./node-test` | `describeWithScenario` + `describeEachScenario` + `it` |
| Mocha | `./mocha` | `describeWithScenario` + `describeEachScenario` |
| AVA | `./ava` | `withScenario` + `withScenarios` |

[Full release notes →](https://github.com/gfargo/git-scenarios/releases/tag/v0.7.0)

## v0.6.0 — 2026-05-27

The audit-and-ship release. Lots of small wins, several bug fixes, two new framework-level capabilities.

### Highlights

- **5 new scenarios** (32 total, up from 27): `partial-stage`, `monorepo-multi-package`, `merge-no-conflict`, `orphan-branch`, `stash-with-untracked`
- **Lifecycle-completion atoms**: `unstageFiles`, `continueCherryPick`, `abortRevert`, `continueRevert`, `startMerge({ squash: true })`
- **Utility atoms**: `gitClean`, `writeGitignore`, `writeGitattributes`, `bulkCommits`
- **Vitest framework adapter** at `@gfargo/git-scenarios/vitest` — same API as the Jest adapter
- **CLI gets `--json` output** plus `--kind` and `--tag` filters for `list`
- **`spinUpScenario` options bag** (non-breaking): `autoCleanup`, `remote`
- **`TempGitRepo`** gains `readFile(path)` and `exists(path)` helpers
- **Tags on every scenario** plus `findRegisteredByTag()` for filtering the mutable registry
- **`ARCHITECTURE.md`** documenting the layered design

### Bug fixes

- The CLI was importing scenarios from the static built-in array, so custom-registered scenarios were invisible to `list` / `describe` / `create`. The CLI now uses the mutable registry and surfaces custom scenarios alongside the built-ins.
- `process.exit()` was truncating CLI stdout at the pipe buffer boundary (~8KB on Linux) when output was piped. The CLI now sets `process.exitCode` and lets Node drain buffers naturally before exiting.

### Refactors

- Shared `resolveScenario(name, origin)` helper for consistent error messages across `spinUpScenario`, `fromScenario`, and the framework adapters.
- `emptyCommit`/`amendCommit` moved out of `operations.ts` into `commits.ts`.
- Registry storage switched from array to `Map<string, Scenario>` for O(1) lookup.

[Full release notes →](https://github.com/gfargo/git-scenarios/releases/tag/v0.6.0)

## v0.5.0 — 2026-05-22

ESM dual-publish, Jest framework adapter, programmatic scenario registration, four new scenarios.

### Highlights

- **ESM + CJS dual-publish** via tsup. Both formats ship; `import` and `require` both work.
- **Jest framework adapter** (`@gfargo/git-scenarios/jest`) — `describeWithScenario`, `describeEachScenario`
- **Programmatic registration** — `registerScenario`, `registerScenarios`, `unregisterScenario`, `listRegistered`, `findRegistered`, `resetRegistry`
- **Four new scenarios**: `shallow-clone`, `multiple-worktrees`, `large-repo`, `mid-revert-conflict`

[Full release notes →](https://github.com/gfargo/git-scenarios/releases/tag/v0.5.0)

## v0.4.0 — 2026-05-22

Conflict scenarios for rebase + cherry-pick, sparse checkout / shallow / notes / hooks atoms, `fromScenario` API, scenario tags.

### Highlights

- **`mid-rebase-conflict`** and **`mid-cherry-pick-conflict`** scenarios
- **Sparse checkout atoms**: `enableSparseCheckout`, `disableSparseCheckout`
- **Shallow repo atoms**: `shallowAt`, `unshallow`
- **Git notes atoms**: `addNote`, `appendNote`, `removeNote`
- **Git hooks atoms**: `installHook`, `removeHook`
- **`fromScenario(name, ...extraSteps)`** — scenario + custom atoms in one call
- **`Scenario.tags`** field + **`findScenariosByTag`**

[Full release notes →](https://github.com/gfargo/git-scenarios/releases/tag/v0.4.0)

## v0.3.x — May 2026

Upstream tracking atoms, fork-workflow scenarios, detached-HEAD, signed-commits-required, branch-sync-showcase, chip-rendering-showcase, empty-repo.

[v0.3.3 release notes →](https://github.com/gfargo/git-scenarios/releases/tag/v0.3.3)

## v0.2.0 — 2026-05-18

Rebase atoms (`startRebase`, `abortRebase`, `continueRebase`), working-tree atoms (`deleteFiles`, `renameFile`), `conditionally` control flow.

[Full release notes →](https://github.com/gfargo/git-scenarios/releases/tag/v0.2.0)

## v0.1.0 — 2026-05-17

Initial public release. Eleven curated scenarios, the atom layer, the CLI, the programmatic API. Extracted from [`coco`](https://github.com/gfargo/coco) where the library lived as an internal test helper.

[Full release notes →](https://github.com/gfargo/git-scenarios/releases/tag/v0.1.0)
