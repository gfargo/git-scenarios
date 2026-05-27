---
title: Release Notes
description: Version history and changelog for @gfargo/git-scenarios.
---

The full changelog lives in [`CHANGELOG.md`](https://github.com/gfargo/git-scenarios/blob/main/CHANGELOG.md). This page summarizes recent releases.

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
