# Changelog

All notable changes to `@gfargo/git-scenarios` are documented here. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [semver](https://semver.org/).

## [Unreleased]

(none)

## [0.6.0] — 2026-05-27

### Added

- **Five new scenarios** (32 total):
  - `partial-stage` (worktree) — 2 staged + 2 unstaged + 1 untracked.
    The "I want to commit half my changes" shape that tools render
    with separate Staged / Unstaged sections.
  - `monorepo-multi-package` (worktree) — workspaces monorepo with
    three packages in distinct states: `app` clean, `lib` staged,
    `cli` unstaged. For workspace-aware tooling.
  - `merge-no-conflict` (history) — completed `--no-ff` merge
    sitting at HEAD with two parents. Distinct from
    `mid-merge-conflict` (in-progress) and from fast-forward merges.
  - `orphan-branch` (branch) — `main` + `gh-pages` with no shared
    history. Surfaces tools that assume all branches share a root.
  - `stash-with-untracked` (stash) — single stash containing both
    modified tracked and untracked new files. Distinct from
    `stashed-changes` (3 stashes, all tracked-edits-only).

- **Lifecycle-completion atoms** — closes asymmetric gaps where some
  operations had abort but not continue:
  - `unstageFiles(...paths)` — inverse of `stageFiles`. With no args
    uses `git reset` (works on initial commit); with paths uses
    `git restore --staged`. Enables partial-stage scenarios.
  - `continueCherryPick()` — paired with `abortCherryPick`.
  - `abortRevert()` / `continueRevert()` — revert previously had no
    lifecycle atoms at all.
  - `startMerge({ squash: true })` — squash-merge support. Squash
    merges leave changes staged without a merge commit.

- **Utility atoms**:
  - `gitClean({ directories?, force?, ignored? })` — wraps
    `git clean` for removing untracked files.
  - `writeGitignore(patterns)` — convenience over `writeFiles`.
  - `writeGitattributes(rules)` — same shape for `.gitattributes`.
  - `bulkCommits(specs)` — produces N commits in a tight loop, ~30%
    faster than `chain(...specs.map(addCommit))` for 50+ commit
    scenarios.

- **TempGitRepo helpers**:
  - `repo.readFile(path)` — read utf-8 content from a repo-relative
    path. Symmetric with the existing `writeFile`.
  - `repo.exists(path)` — check whether a file or directory exists.

- **`spinUpScenario` options bag** (non-breaking):
  - `autoCleanup` — process-exit cleanup safety net.
  - `remote` — adds an `origin` remote after setup, mirroring the
    CLI's `--remote` flag.

- **CLI flags**:
  - `list --kind <k>` filters by scenario kind.
  - `list --tag <t>` filters by tag inclusion. Combines with
    `--kind` (AND).
  - `list --json` and `describe --json` emit machine-readable JSON.
  - `describe` output now includes the Tags line.

- **Vitest framework adapter** — new subpath export
  `@gfargo/git-scenarios/vitest`:
  - `describeWithScenario(name, fn, opts?)`
  - `describeEachScenario(names, fn, opts?)`
  - Same surface as the Jest adapter; routes through Vitest's
    runtime globals.

- **Tags on every scenario** — every one of the 32 scenarios now
  carries a `tags` field, making `findScenariosByTag` and the new
  CLI `--tag` flag broadly useful.

- **`findRegisteredByTag(tags, match?)`** — filter the mutable
  registry (built-in + custom) by tag.

- **`ARCHITECTURE.md`** — documents the layered design
  (TempGitRepo → atoms → scenarios → public API → adapters → CLI),
  dependency rules, build pipeline, testing strategy, determinism.

### Changed

- **CLI now uses the mutable registry** (bug fix). The CLI was
  importing `findScenario`/`allScenarios` from `scenarios/index.ts`
  (built-ins only), so custom-registered scenarios were invisible
  to `list`, `describe`, and `create`. Fixed to use
  `findRegistered`/`listRegistered`.
- **Registry storage switched to `Map<string, Scenario>`** for O(1)
  name lookup (was O(n) array scan). Insertion order preserved.
- **`emptyCommit` and `amendCommit` moved to `src/atoms/commits.ts`**
  (out of `operations.ts`). Public exports unchanged.
- **Shared `resolveScenario(name, origin)` helper** — the
  "find or throw with available names" pattern was duplicated across
  `spinUpScenario`, `fromScenario`, and the Jest adapter. Now lives
  in one place with a consistent error format.

### Fixed

- CLI `process.exit()` was truncating stdout at the pipe buffer
  boundary (~8KB on Linux) when output was piped to another command.
  `main()` now sets `process.exitCode` instead, letting Node drain
  buffers naturally before exiting.

## [0.5.0] — 2026-05-22

### Added

- **ESM dual-publish via tsup** — Package now ships both CJS (`.cjs`)
  and ESM (`.js`) for all entry points. Added `"type": "module"` to
  package.json. Exports map uses conditional `import`/`require`
  resolution. Unblocks ESM-only consumers (Deno, modern bundlers).

- **Four new scenarios** (27 total):
  - `shallow-clone` — repo with `.git/shallow`, only 4 of 10 commits
    reachable. For testing tools that detect shallow repos.
  - `multiple-worktrees` — primary worktree on `main` + 3 linked
    worktrees on `feat/alpha`, `feat/beta`, `hotfix/urgent`.
  - `large-repo` — 115 commits across 3 branches with 3 tags
    (`v0.1.0`, `v0.5.0`, `v1.0.0`). For pagination/performance testing.
  - `mid-revert-conflict` — in-progress revert with `REVERT_HEAD` set
    and one conflicted file.

- **Programmatic scenario registration**:
  - `registerScenario(scenario)` — add custom scenarios to the registry
  - `registerScenarios(scenarios)` — batch registration
  - `unregisterScenario(name)` — remove by name
  - `listRegistered()` / `findRegistered(name)` — query the full registry
  - `resetRegistry()` — restore to built-in-only state (test teardown)
  - `spinUpScenario()` and `fromScenario()` now search the full registry

- **Jest framework adapter** — new subpath export
  `@gfargo/git-scenarios/jest`:
  - `describeWithScenario(name, fn, opts?)` — auto setup/teardown
    wrapper around Jest's `describe`
  - `describeEachScenario(names, fn, opts?)` — run tests against
    multiple scenarios in one call
  - Supports `extraSteps` for extending base scenarios
  - Configurable `timeout` for slow scenarios

### Changed

- Build system switched from `tsc` to `tsup` (dual CJS/ESM output).
- `spinUpScenario()` and `fromScenario()` now use the mutable registry
  instead of the static `allScenarios` array directly.

## [0.4.0] — 2026-05-22

### Added

- **New scenarios — `mid-rebase-conflict` and `mid-cherry-pick-conflict`**
  (kind: `operation`). Two new conflict-state scenarios that complement
  the existing `mid-merge-conflict`:
  - `mid-rebase-conflict` — repo mid-rebase with `.git/rebase-merge/`
    and `REBASE_HEAD` set, one conflicted file (`src/config.ts`).
  - `mid-cherry-pick-conflict` — repo mid-cherry-pick with
    `CHERRY_PICK_HEAD` set, one conflicted file (`src/utils.ts`).

  Tools render these three conflict types differently (different `.git`
  state files, different resolution flows), so each deserves its own
  scenario. Registry now contains **23 scenarios**.

- **New atoms — Sparse checkout**: `enableSparseCheckout(paths, { cone? })`
  and `disableSparseCheckout()`. Configure sparse checkout for testing
  tools that need to detect or handle monorepo sparse-checkout mode.

- **New atoms — Shallow repo simulation**: `shallowAt(depth)` and
  `unshallow()`. Simulate `git clone --depth N` by writing
  `.git/shallow` directly. For testing tools that behave differently
  against shallow repositories.

- **New atoms — Git notes**: `addNote(message, { ref?, namespace? })`,
  `appendNote(message, { ref?, namespace? })`, and
  `removeNote({ ref?, namespace? })`. For testing tools that display
  or process git notes (code review metadata, CI annotations).

- **New atoms — Git hooks**: `installHook(name, script)` and
  `removeHook(name)`. Write executable hook scripts into `.git/hooks/`
  for testing tools that detect, skip, or honor git hooks.

- **New API — `fromScenario(name, ...extraSteps)`**: One-liner to spin
  up a named scenario and apply additional atoms on top. Saves the
  common `spinUpScenario` → manual `chain(...)` dance.

- **New API — `findScenariosByTag(tags, match?)`**: Filter scenarios by
  tag with `'any'` (OR, default) or `'all'` (AND) matching. Enables
  consumers to run subsets of scenarios programmatically.

- **New type field — `Scenario.tags?: string[]`**: Optional finer-grained
  tags for filtering scenarios beyond `kind`. Tags added to all three
  conflict scenarios: `['conflict', 'merge']`, `['conflict', 'rebase']`,
  `['conflict', 'cherry-pick']`.

- **CLI smoke tests** (`bin/cli.test.ts`): New test file validating the
  scenario registry (field validation, uniqueness, lookup) and
  integration tests for the create/cleanup flow.

- **`CONTRIBUTING.md`**: Full contributor guide covering project
  structure, how to add atoms/scenarios, test conventions, code style,
  PR checklist, and release process.

- **Coverage reporting**: Jest config now includes `collectCoverageFrom`
  and `coverageThreshold` (80% lines/functions/statements, 70%
  branches). New `test:coverage` npm script.

- **Windows CI**: GitHub Actions matrix now includes `windows-latest`
  alongside `ubuntu-latest`. Tests run with `--coverage` in CI.

### Changed

- Jest `roots` expanded to include `bin/` directory for CLI tests.
- `allScenarios` array updated with the two new conflict scenarios.

## [0.3.3] — 2026-05-19

### Added

- **New scenario — `branch-sync-showcase`** (kind: `branch`). A single
  repo with **five** local branches, each in a different sync state
  relative to its `origin/` upstream:
  - `main` (CHECKED OUT) — 2 commits BEHIND `origin/main`
  - `feat/ahead-only` — 3 commits AHEAD of `origin/feat/ahead-only`
  - `feat/diverged` — 2 ahead + 2 behind `origin/feat/diverged`
  - `feat/synced` — at the same commit as `origin/feat/synced`
  - `local-only` — no upstream configured

  HEAD is on `main` (the behind branch) so the history / status
  surfaces also exercise the "remote is ahead of local" affordance
  alongside the branch-list rendering. Designed for TUIs that show
  upstream sync state in a sidebar / branch list: every sync class is
  visible at once.

  Registry now contains **21 scenarios**.

## [0.3.2] — 2026-05-18

### Added

- **New scenario — `empty-repo`** (kind: `branch`). A freshly-`git
  init`'d repo with no commits, no files, no remotes. HEAD on
  `main` but unborn. The "what does your tool do on a brand-new
  repo?" edge case that's easy to forget. Setup is a no-op because
  `createTempGitRepo` already produces this state — the scenario
  exists so consumers can name and target it via the registry
  alongside the rest.

  Registry now contains **20 scenarios**.

## [0.3.1] — 2026-05-18

### Added

- **New scenario — `chip-rendering-showcase`** (kind: `history`). Six
  commits on `main` where each row in the history view exercises a
  different branch-tip-chip code path — HEAD, plain local
  (`develop`), slashy local (`feat/widgets`), remote-tracking via
  `origin/main`, remote-tracking via `upstream/main`, and a root
  commit tagged `v0.1.0` (tag-in-trailing-list case). `main` is
  configured to track `origin/main` so `git status` also reports
  the "1 ahead" tracking signal alongside the chips.

  Useful for visual regression checks on TUIs that colour-code chip
  kinds, and as a regression fixture for tools that classify refs
  using "ref contains a slash" — `feat/widgets` must read as local,
  not remote.

  Registry now contains **19 scenarios**.

## [0.3.0] — 2026-05-18

### Added

- **New atoms — Upstream tracking**:
  - `setUpstream(localBranch, remote, remoteBranch?)` writes the
    `branch.<X>.remote` + `branch.<X>.merge` config so `git status`
    reports ahead/behind counts.
  - `setRemoteRef(remote, branch, sha)` directly writes
    `refs/remotes/<remote>/<branch>` via `git update-ref`. Low-level
    primitive for fabricating remote-tracking refs without a fetch.
- **New atom — Scoping**: `withRemoteTracking(remote, branch, step)`
  runs a step against a temporary clone, then fetches the clone's
  resulting branch tip back into the parent as
  `refs/remotes/<remote>/<branch>`. The clone-and-fetch pattern that
  lets you compose "the upstream has commits we don't" scenarios with
  the regular atom layer (`addCommit`, `chain`, etc.) inside.
- **Seven new registered scenarios** for upstream-tracking, detached
  HEAD, and signed-commit states:
  - `branch-tracking-upstream` — `main` tracks `origin/main`, both at
    the same commit, clean worktree.
  - `branch-ahead-of-upstream` — `main` is 3 commits ahead of
    `origin/main`.
  - `branch-behind-upstream` — `main` is 3 commits behind
    `origin/main` (built with `withRemoteTracking`).
  - `branch-diverged` — `main` is 2 ahead AND 2 behind `origin/main`.
  - `multi-remote-with-tracking` — fork-workflow baseline: `origin` +
    `upstream` remotes, `main` tracks `upstream/main`, `feat/fork-work`
    tracks `origin/feat/fork-work`.
  - `detached-head` — HEAD detached at `main~2`, `main` still at its
    original tip.
  - `signed-commits-required` — `commit.gpgsign=true` +
    `user.signingkey` set (commits in the scenario itself remain
    unsigned, since CI lacks a real GPG key).
- Catch-up unit tests for v0.2.0 atoms that shipped without dedicated
  coverage: `startRebase`, `abortRebase`, `continueRebase`,
  `deleteFiles`, `renameFile`, and `conditionally`.

### Notes

- `withRemoteTracking` shells out via `child_process` so the
  `-c protocol.file.allow=always` config can be passed (required on
  git ≥ 2.38 for file-protocol URLs — CVE-2022-39253).

## [0.2.0] — 2026-05-18

### Added

- **New atoms — Rebase**: `startRebase(onto, { allowConflict? })`,
  `abortRebase()`, `continueRebase()`. Same conflict-tolerant pattern
  as `startMerge` — conflicts leave the repo mid-rebase by default.
- **New atoms — Working tree**: `deleteFiles(...paths)` removes files
  from the worktree (does not stage); `renameFile(from, to)` wraps
  `git mv` for rename-detection scenarios.
- **New atom — Control flow**: `conditionally(condition, step)` runs a
  step only when a boolean or async predicate is true. Avoids awkward
  ternaries inside `chain(...)`.
- README badges activated (npm version, license, types, CI).
- New cookbook entries: mid-rebase conflict, rename detection.
- Kiro steering documents added (`.kiro/steering/`).

### Fixed

- `insideSubmodule` test no longer times out — added 60s timeout
  matching the other submodule tests in the suite.

## [0.1.1] — 2026-05-18

### Fixed

- `addSubmodule` now configures `user.name` / `user.email` /
  `commit.gpgsign` on the freshly-cloned submodule. Without this,
  subsequent commits made inside the submodule via
  `insideSubmodule(path, addCommit(...))` would fail with `Author
  identity unknown` on environments without a global git config
  (notably CI runners). Local dev tended to work because the global
  git config rescued it.
- Affected `insideSubmodule(path, …)` whenever the inner step
  produced commits. `addSubmodule` itself + `pinSubmodule` were
  unaffected since neither creates commits inside the submodule
  clone.

## [0.1.0] — 2026-05-17

Initial public release. Shadow-extracted from the
[`coco`](https://github.com/gfargo/coco) monorepo where it lived at
`src/lib/testUtils/` from coco v0.43.0 onward.

### Features

- **Eleven curated scenarios** covering common git states: feature
  branches (ready-to-PR, one-commit, two-commit, multi-commit), dirty
  worktrees (single staged, many files), in-progress operations
  (mid-bisect, mid-merge-conflict), stash state, multi-branch history
  graphs, and submodule history. See the README's *Available
  scenarios* table for the full list.
- **Atom layer** — composable Step factories (`(repo: TempGitRepo) =>
  Promise<void>`) for building scenarios inline or registering custom
  ones:
  - **Control flow**: `chain`, `repeat`
  - **Working tree**: `writeFiles`, `seededFiles`
  - **Staging + commits**: `stageFiles`, `commit`, `addCommit`,
    `emptyCommit`, `amendCommit` (with optional `date` pinning on
    every commit-producing atom)
  - **Branches**: `switchToBranch`, `checkoutBranch`, `createBranch`,
    `deleteBranch`
  - **Tags**: `createTag` (annotated / lightweight / on specific sha),
    `deleteTag`
  - **Remotes**: `addRemote`, `removeRemote`, `renameRemote` —
    multi-remote scenarios fully supported
  - **Stash**: `stashChanges`, `applyStash`, `popStash`, `dropStash`
  - **Operations**: `startMerge` (with `allowConflict` / `noFastForward`
    / `message` / `date`), `abortMerge`, `cherryPick`, `abortCherryPick`,
    `revert`, `startBisect`, `bisectStep`, `resetBisect`, `resetTo`
  - **Submodules**: `addSubmodule` (with `setup` as a Step), `pinSubmodule`
  - **Linked worktrees**: `addWorktree`, `removeWorktree`
  - **Config**: `setConfig` (set or unset local config keys)
  - **Scoping**: `onBranch(name, step)`, `insideSubmodule(path, step)`,
    `withAuthor({ name, email, date? }, step)`
  - **Time helpers**: `daysAgo(n)` for deterministic relative dates
  - **Validation**: `defineScenario` validates kebab-case names, kind
    enum, non-empty summary / description / contracts at module load
    time
- **CLI** (`git-scenarios`): `list` / `describe` / `create` with
  `--path`, `--run <cmd>` (tool-agnostic launcher), `--remote`, and
  `--ephemeral` flags.
- **Programmatic API**: `spinUpScenario(name)` returns a fully-built
  `TempGitRepo` for tests; `createTempGitRepo()` exposes the raw
  primitive for the rare case no scenario fits.

### Testing

100+ unit tests across the atom layer, every scenario's contract
assertions, and a generators-parity test ensuring the vendored content
generators stay byte-identical with the coco-side copy until the
duplication is resolved post-publish.

### Notes

- `peerDependencies`: `simple-git ^3.0.0`
- Node: `^22.22.2 || ^24.15.0 || >=26.0.0`
- License: MIT

[Unreleased]: https://github.com/gfargo/git-scenarios/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/gfargo/git-scenarios/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/gfargo/git-scenarios/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/gfargo/git-scenarios/compare/v0.3.3...v0.4.0
[0.3.3]: https://github.com/gfargo/git-scenarios/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/gfargo/git-scenarios/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/gfargo/git-scenarios/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/gfargo/git-scenarios/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/gfargo/git-scenarios/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/gfargo/git-scenarios/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/gfargo/git-scenarios/releases/tag/v0.1.0
