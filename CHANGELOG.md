# Changelog

All notable changes to `@gfargo/git-scenarios` are documented here. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [semver](https://semver.org/).

## [1.4.0](https://github.com/gfargo/git-scenarios/compare/v1.3.3...v1.4.0) (2026-08-11)


### Features

* add spinUpAll() for parallel scenario materialization ([f245e07](https://github.com/gfargo/git-scenarios/commit/f245e0750813b23e7ba544d87c97e5ee8f49f428))
* add spinUpAll() for parallel scenario materialization ([3a295f1](https://github.com/gfargo/git-scenarios/commit/3a295f1c18409968e4fb49e5ee76209d5a39d1ca)), closes [#42](https://github.com/gfargo/git-scenarios/issues/42)
* add verifyContracts() for executable scenario contracts ([86acd88](https://github.com/gfargo/git-scenarios/commit/86acd88949b607f1faf2ec85d9545019042f4cea))
* add verifyContracts() for machine-verifying scenario contracts ([db2fb56](https://github.com/gfargo/git-scenarios/commit/db2fb56b4755cd6ab18ac81de2f7f5c811e6e6b5)), closes [#36](https://github.com/gfargo/git-scenarios/issues/36)
* **cli:** add `git-scenarios init` command ([4b07bc2](https://github.com/gfargo/git-scenarios/commit/4b07bc26614b17d60c7ffb9cd1096358d232ee4d))
* **cli:** add `git-scenarios init` command to scaffold custom scenarios ([7c06643](https://github.com/gfargo/git-scenarios/commit/7c06643fc0acb8469ffb729983fc4e6ab56a106d))
* **scenarios:** add sparse-checkout-monorepo and multi-remote-fetch-conflict ([c58a4c9](https://github.com/gfargo/git-scenarios/commit/c58a4c90be8dcc76c9e600e338174db06e6679fb))
* **scenarios:** add sparse-checkout-monorepo and multi-remote-fetch-conflict ([02ea920](https://github.com/gfargo/git-scenarios/commit/02ea9204000b3a375252ca59f07205b06bb8cf57))
* **vitest:** add scenarioTest() convenience for test.extend fixture ([605b32e](https://github.com/gfargo/git-scenarios/commit/605b32ede8577d11db028704de194b112b268955)), closes [#55](https://github.com/gfargo/git-scenarios/issues/55)
* **vitest:** add scenarioTest() for test.extend fixture API ([dff64ec](https://github.com/gfargo/git-scenarios/commit/dff64eccd26abf6363834d8fb6ad7781f406c2d6))
* **www:** add sitemap, Starlight i18n scaffold, and CJK font fallback ([1faa517](https://github.com/gfargo/git-scenarios/commit/1faa5171fe9e07a11db10100849be39c3db62b74))
* **www:** extract hardcoded UI strings into a translation dictionary ([54ffc9b](https://github.com/gfargo/git-scenarios/commit/54ffc9b0805aff3b323524f78de281124ad1414c))
* **www:** wire remaining components through the i18n translation dictionary ([43fcb99](https://github.com/gfargo/git-scenarios/commit/43fcb9900fae69f70c7e6d301d190f75a5838f1b))


### Bug Fixes

* **assert:** inSyncWithUpstream fails when no upstream configured ([#134](https://github.com/gfargo/git-scenarios/issues/134)) ([3ab0ac4](https://github.com/gfargo/git-scenarios/commit/3ab0ac483858130c37cb1b9ec13d1450467c1f53))
* **atoms:** make commit() throw when nothing is staged ([#135](https://github.com/gfargo/git-scenarios/issues/135)) ([2363e14](https://github.com/gfargo/git-scenarios/commit/2363e14512edc81cfe56b14976f7841f6a947bfb))
* **atoms:** make stashChanges throw instead of silently no-op ([#137](https://github.com/gfargo/git-scenarios/issues/137)) ([3949c24](https://github.com/gfargo/git-scenarios/commit/3949c2424a18ae53d181148624bd8d7056cd54b0))
* **atoms:** merge git environment instead of replacing it ([41ea956](https://github.com/gfargo/git-scenarios/commit/41ea95642b109ad98e1e910bffcd1ecc17e18b5e))
* **atoms:** merge git environment instead of replacing it ([b4dc6d5](https://github.com/gfargo/git-scenarios/commit/b4dc6d56a13c7586853e142802131a670e8df852))
* **atoms:** resolve git-dir paths via rev-parse instead of hardcoded .git ([#140](https://github.com/gfargo/git-scenarios/issues/140)) ([06e8022](https://github.com/gfargo/git-scenarios/commit/06e8022cde8f94f64be70c4dbd77889e691e0986))
* **atoms:** restore detached HEAD in onBranch ([#136](https://github.com/gfargo/git-scenarios/issues/136)) ([f2ac185](https://github.com/gfargo/git-scenarios/commit/f2ac185366a525bb493adf51367dbe570b98c303))
* **ci:** grant pull-requests: write to the benchmark job ([53de36f](https://github.com/gfargo/git-scenarios/commit/53de36fbc9d595a7c6e366d1ff81a6cd612261a1))
* **ci:** grant pull-requests: write to the benchmark job ([91c7351](https://github.com/gfargo/git-scenarios/commit/91c7351d4e4aeff6ab43077051a4039f2ec418b6))
* **cli:** replace spawnSync('mv') with cross-platform fs move for create --path ([#138](https://github.com/gfargo/git-scenarios/issues/138)) ([16ed006](https://github.com/gfargo/git-scenarios/commit/16ed00611bff12acdd4870fd12b2c1ed9451c413))
* prevent temp repo leaks in core API + fix flaky e2e test ([6c7948b](https://github.com/gfargo/git-scenarios/commit/6c7948b7cab4870747d333781c69b42c8a6bc462))
* prevent temp repo leaks in spinUpScenario/fromScenario + fix flaky e2e test ([c3747a9](https://github.com/gfargo/git-scenarios/commit/c3747a9e4ef38841c30d86cb2cf14a6bb3a89c18))
* regenerate scenarios-index API report for new scenario exports ([bc0b443](https://github.com/gfargo/git-scenarios/commit/bc0b443f47c4f9056dfdf10d78fbfe065878e7fa))
* replace flaky temp-dir count assertion with behavioral check ([a2e5f3c](https://github.com/gfargo/git-scenarios/commit/a2e5f3ca39388700f8349b630db95158a9e5f6e2))
* resolve lint errors and regenerate vitest API report ([f77a84c](https://github.com/gfargo/git-scenarios/commit/f77a84c7fe9872f94cd1666f836af982c0f75479))
* update etc/index.api.md for new verifyContracts exports ([1ec8b1e](https://github.com/gfargo/git-scenarios/commit/1ec8b1e5e6d0a928858dbba9ff0553a59b5596f1))


### Performance

* add spinUpAll serial vs parallel benchmark ([9be50e0](https://github.com/gfargo/git-scenarios/commit/9be50e0e7044ebb5a8d68a0e191d8e76d8ba65c8))
* add spinUpAll serial vs parallel benchmark ([96c7010](https://github.com/gfargo/git-scenarios/commit/96c70109795748758193ffc57afec6852a10b2a7))


### Documentation

* add new-scenario contribution template & checklist ([7bf7374](https://github.com/gfargo/git-scenarios/commit/7bf7374d93f0fd38b15254102ff1e8740a31d852))
* add new-scenario contribution template & checklist ([040e7bb](https://github.com/gfargo/git-scenarios/commit/040e7bbb2ae796525c36b8aa3807ebb109fa93da)), closes [#60](https://github.com/gfargo/git-scenarios/issues/60)
* add README sections for new APIs (verifyContracts, spinUpAll, scenarioTest) ([f8f6f53](https://github.com/gfargo/git-scenarios/commit/f8f6f53a8807efc03b44b2c070d5c8aa78c8edbc))
* add README sections for verifyContracts, spinUpAll, scenarioTest ([6220274](https://github.com/gfargo/git-scenarios/commit/62202749dbcbb6e93bd6b53aadf1490457670a3f))

## [1.3.3](https://github.com/gfargo/git-scenarios/compare/v1.3.2...v1.3.3) (2026-07-18)


### Bug Fixes

* **atoms:** correct shallowAt(depth) off-by-one boundary ([#111](https://github.com/gfargo/git-scenarios/issues/111)) ([e48049a](https://github.com/gfargo/git-scenarios/commit/e48049a81be85f73725dfe7318dbb4eeffb57cf9))
* **atoms:** pin tagger date on annotated tags for replay determinism ([#113](https://github.com/gfargo/git-scenarios/issues/113)) ([a7fc4ce](https://github.com/gfargo/git-scenarios/commit/a7fc4cecb02871330d468e1b37ea9769e9811413))
* prevent temp repo leaks when scenario setup throws ([#110](https://github.com/gfargo/git-scenarios/issues/110)) ([174c271](https://github.com/gfargo/git-scenarios/commit/174c271794f8a98377592ba1c2df073985bd722c))
* **scenarioCache:** never serve stale templates for custom scenarios ([#114](https://github.com/gfargo/git-scenarios/issues/114)) ([b77f912](https://github.com/gfargo/git-scenarios/commit/b77f912b79ce9a50b16d0095ac79b47380de941d))
* **scopes:** continue parent commit clock for all atoms inside withRemoteTracking ([#112](https://github.com/gfargo/git-scenarios/issues/112)) ([b0af5d3](https://github.com/gfargo/git-scenarios/commit/b0af5d33eb43b4dada21899eb0a03639a0d60bab))

## [1.3.2](https://github.com/gfargo/git-scenarios/compare/v1.3.1...v1.3.2) (2026-07-13)


### Bug Fixes

* bucket four low-severity mock/snapshot/docs bugs ([988583b](https://github.com/gfargo/git-scenarios/commit/988583b6f81d5c7e9aa2e6827b485524a98ad3a7))
* bucket of four low-severity mock/snapshot/docs bugs ([04fee13](https://github.com/gfargo/git-scenarios/commit/04fee137df816969d47cc6e89d81a4bc9b3b3867))
* correct the git-scenarios-mcp npx invocation in docs ([#103](https://github.com/gfargo/git-scenarios/issues/103)) ([988583b](https://github.com/gfargo/git-scenarios/commit/988583b6f81d5c7e9aa2e6827b485524a98ad3a7))
* mocks bucket mapping now reports unstaged deletes as `deleted`, ([988583b](https://github.com/gfargo/git-scenarios/commit/988583b6f81d5c7e9aa2e6827b485524a98ad3a7))
* mocks commitCount contract regex now matches slashed/dashed ([988583b](https://github.com/gfargo/git-scenarios/commit/988583b6f81d5c7e9aa2e6827b485524a98ad3a7))
* staged renames report the new path, not the raw "old -&gt; new" ([988583b](https://github.com/gfargo/git-scenarios/commit/988583b6f81d5c7e9aa2e6827b485524a98ad3a7))

## [1.3.1](https://github.com/gfargo/git-scenarios/compare/v1.3.0...v1.3.1) (2026-07-12)


### Bug Fixes

* boolean CLI flags no longer swallow the following positional ([#93](https://github.com/gfargo/git-scenarios/issues/93)) ([b0d1fef](https://github.com/gfargo/git-scenarios/commit/b0d1fefbbebb00506a951e3a4c7c1965a6a48b3a))
* CLI flag-before-positional parsing and engines.node range ([9890413](https://github.com/gfargo/git-scenarios/commit/9890413ac69a0b1dcadd5a1b3687e8bea2723ca8))
* loosen engines.node range to include real Node 22/24 LTS installs ([#94](https://github.com/gfargo/git-scenarios/issues/94)) ([b0d1fef](https://github.com/gfargo/git-scenarios/commit/b0d1fefbbebb00506a951e3a4c7c1965a6a48b3a))

## [Unreleased]

## [1.3.0] — 2026-07-12

### Added

- **Mock factory layer** (`@gfargo/git-scenarios/mocks`) — a new subpath export
  providing in-memory mock objects matching `simple-git`'s type signatures
  (`StatusResult`, `LogResult`, `BranchSummary`, `DiffResult`). Zero runtime
  dependencies, <1ms per call, no disk I/O or git required.
- **Functional factories** — `mockStatusResult()`, `mockLogResult()`,
  `mockBranchSummary()`, `mockDiffResult()` with sensible defaults and partial
  overrides.
- **Fluent builders** — `mockStatus().staged('a.ts').modified('b.ts').build()`
  chainable API for incremental mock construction with automatic multi-bucket
  path merging.
- **`mockSimpleGit()`** — Proxy-based full `SimpleGit` interface stub.
  Framework-agnostic via a `createMockFn` parameter (pass `jest.fn` or `vi.fn`).
- **`mockFromScenario(name)`** — derive mock objects from any registered
  scenario's contracts without spinning up a real repo.
- **Pretty-printers** — `printMockStatus()` and `printMockLog()` format mocks
  as human-readable porcelain output for debugging test failures.
- **Bucket mapping utilities** — `mapXYToBuckets()` and `bucketsToXY()` exposed
  for advanced consumers building custom parsers.
- **Mock factories documentation** — comprehensive guide page at
  `/docs/guides/mock-factories` covering all APIs, decision guide (real repos
  vs mocks), and XY code reference table.
- **Property tests** for mock factory invariants (round-trip, builder
  equivalence, `isClean()`, `total === all.length`, `all === keys(branches)`).
- **Integration validation tests** confirming mock counts match real repo output
  for `partial-stage` and `mid-merge-conflict` scenarios.

## [1.2.0] — 2026-06-28

### Added

- **MCP server** (`@gfargo/git-scenarios/mcp`, plus a `git-scenarios-mcp` bin) —
  a Model Context Protocol server that exposes the scenario catalogue and
  materialization to AI coding agents: `list_scenarios`, `describe_scenario`,
  `inspect_scenario`, `materialize_scenario`, `capture_repo`, `cleanup_scenario`.
- **`doctor` command** — `git-scenarios doctor [--json]` environment health
  check: git version (≥ 2.25.0), temp-dir writability, leftover scenario dirs,
  and optional `git-lfs`. Non-zero exit on hard failures.
- **Shell completions** — `git-scenarios completions <bash|zsh|fish>` with
  dynamic scenario-name completion backed by a new `list --names` flag.
- **GitHub Action** — a composite action that materializes a named scenario
  into the workspace for downstream CI (inputs: scenario, path, optional remote).
- **Content-addressed scenario cache** — materialize each scenario once into a
  template `.git`, then serve later spin-ups via `git clone --local` (hardlinked
  objects, near-instant). Hash-identical to a cold replay; removes the large-repo
  replay-timeout class of problems. Worktree/submodule scenarios fall back to
  cold replay automatically.
- **Metadata scenarios** — `installed-hooks`, `commits-with-notes`, and
  `mixed-tags` (annotated + lightweight, including a tag pointing at a tree).
- **Marketing site** — an in-browser scenario playground with an interactive
  commit graph, per-scenario permalink pages (snippets + rendered graph), and a
  "choosing a scenario" decision guide plus a vs-alternatives comparison.

- **Contribution template + checklist** — `templates/scenario.template.ts` and
  `templates/scenario.test.template.ts` provide copy-paste starting points for
  new built-in scenarios. `CONTRIBUTING.md` now has a step-by-step guide covering
  template usage, registration, the automatic determinism property test (Property 9),
  and `www/src/data/scenarios.json` regeneration. The PR checklist in both
  `CONTRIBUTING.md` and `www/src/content/docs/docs/guides/contributing.md` is
  updated to include these two new required steps.

- **Scenario `interactive-rebase-mid-edit`** — `git rebase -i` paused at an
  `edit` action with 2 remaining picks. No conflict markers; HEAD is detached
  at the applied commit; `.git/rebase-merge/interactive` marks the interactive
  state. Rounds out the in-progress operation family with the interactive-rebase
  edit-pause case (distinct from the conflict-pause in `mid-rebase-conflict`).
- **Scenario `out-of-date-submodule`** — parent repo pinned to an older
  `vendor/lib` SHA while the submodule has one newer commit. `git submodule
  status` shows the `+` (modified) flag. Models the "update submodule pin"
  workflow.
- **Scenario `locked-worktree`** — primary worktree on `main` plus one linked
  worktree locked via `git worktree lock`. `git worktree list --porcelain`
  shows `locked <reason>`; `.git/worktrees/<n>/locked` exists. Models the
  "reserved worktree" pattern.
- **Atom `startInteractiveRebase(onto)`** — starts `git rebase -i <onto>` with
  a temp `GIT_SEQUENCE_EDITOR` that rewrites the first `pick` to `edit`,
  pausing the rebase at the first commit for interactive editing. In
  `src/atoms/rebase.ts`.
- **Atoms `lockWorktree(path, {reason?})` / `unlockWorktree(path)`** — wrap
  `git worktree lock` / `unlock`. In `src/atoms/worktrees.ts`.
- **`dangling-commit` scenario** — an experimental commit is dropped from
  `main` via `git reset --hard HEAD~1`; the object remains in the store,
  reachable only via `HEAD@{1}` in the reflog. For testing reflog-browsing
  UIs and "recover lost commit" affordances.
- **`reset-recoverable-head` scenario** — `main` is hard-reset 2 commits
  back; the former tip is not on any branch but is recoverable via
  `main@{1}` / `HEAD@{1}` in the reflog. For testing "undo reset" /
  branch-restoration flows.

- **`repo.snapshot()`** — a structured, read-only description of a
  repo's current state: HEAD (branch / detached / short SHA), local
  branches, working-tree status split into staged / modified /
  untracked plus upstream ahead/behind, total commit count, the
  in-progress operation (`merge` / `rebase` / `cherry-pick` / `revert`
  / `bisect` / `null`), conflicted paths, stash count, and the commit
  graph. The programmatic counterpart to `git-scenarios inspect`. Also
  exported standalone as `snapshotRepo(git)` for use against any
  `simple-git` instance, with types `RepoSnapshot`, `HeadSnapshot`,
  `StatusSnapshot`, and `InProgressOperation`. This is the shared
  foundation the upcoming test matchers and `diff` / `doctor` CLI
  commands build on.
- **`assertRepo(...)` fluent assertion API** — a chainable,
  runner-agnostic way to assert repo state, built on `snapshot()`:
  `await assertRepo(repo).onBranch('main').cleanWorktree().commitCount(7)`.
  Queues checks synchronously and evaluates them against a single
  snapshot when awaited (one chain → one snapshot), resolving to that
  snapshot. Throws a new `RepoAssertionError` (carrying
  `assertion` / `expected` / `actual`) on mismatch. Accepts a
  `TempGitRepo` or a raw `simple-git` instance. Covers branch / detached
  / clean / dirty / staged / modified / untracked / ahead / behind /
  in-sync / commit-count / operation / conflicts / stash.
- **`expect(...)` matchers** (`@gfargo/git-scenarios/matchers`) — a thin
  layer over `assertRepo` for Jest and Vitest: `toBeOnBranch`,
  `toBeDetached`, `toHaveCleanWorktree`, `toHaveDirtyWorktree`,
  `toHaveStagedFile` / `toHaveModifiedFile` / `toHaveUntrackedFile`,
  `toBeAheadBy` / `toBeBehindBy` / `toBeInSyncWithUpstream`,
  `toHaveCommitCount`, `toBeMidMerge` / `toBeMidRebase` /
  `toBeMidCherryPick` / `toBeMidRevert` / `toBeMidBisect` /
  `toBeMidOperation`, `toHaveConflictIn` / `toHaveNoConflicts`, and
  `toHaveStash`. Register with `expect.extend(matchers)`. Jest types ship
  automatically; Vitest users augment `Assertion` with the exported
  `GitScenariosMatchers` interface (4 lines, no `vitest` dependency
  required of this package). The other three runners (node:test, Mocha,
  AVA) use `assertRepo` directly — same checks, same messages.

### Changed

- **`exports` map** rewritten to nested `import` / `require` conditions with
  distinct `.d.ts` / `.d.cts` type entries, fixing CJS type resolution
  (FalseESM) across every subpath export.

### Tooling

- **Package-publishing checks** in CI — `attw` (are-the-types-wrong) and
  `publint --strict` run against the packed tarball to catch dual CJS/ESM and
  types-resolution regressions before publish.
- **API-surface drift gate** — committed `etc/*.api.md` baselines (api-extractor)
  with a CI check that flags undocumented public-API changes.
- **Mutation testing** — Stryker on the core modules (commit clock, capture,
  seeded files, chain), running as an informational, non-blocking CI job until
  the baseline score stabilizes.

## [1.1.0] — 2026-06-23

### Fixed

- **Full hash determinism across all 32 scenarios.** Previously only the
  3 scenarios that pinned dates produced stable commit hashes — the
  other 29 stamped commits with the wall clock, so hashes (and, for
  merge/divergence scenarios, `git log --all` ordering) drifted between
  runs. This contradicted the library's core "byte-identical every run"
  promise. A new deterministic commit clock (`src/commitClock.ts`) hands
  every commit a monotonic date from a fixed epoch when the caller
  doesn't pin one, so all commit-creating paths — `addCommit`, `commit`,
  `emptyCommit`, `amendCommit`, `bulkCommits`, `startMerge`,
  `cherryPick`, `revert`, `commitAll`, and the `withAuthor` /
  `insideSubmodule` / `withRemoteTracking` scopes — are now reproducible.
  `addSubmodule` also normalizes the recorded `.gitmodules` URL (which
  previously leaked the source repo's random temp path). The determinism
  property test now covers **all** registered scenarios, not just two.
  Commit hashes for existing scenarios change once with this fix; since
  they were never stable before, nothing could have depended on specific
  values.

### Added

- **`git-scenarios inspect <name>`** — a read-only counterpart to
  `create`. Materializes a scenario in a throwaway temp repo, prints
  its commit graph (`git log --graph --oneline --all`), branches, and
  working-tree status, then cleans up. Use it to see a scenario's shape
  without leaving anything on disk. Supports `--json` for a structured
  `{ graph, branches, status, contracts }` payload. Empty repos (no
  commits) report an empty graph rather than erroring.
- **`git-scenarios capture [path]`** — snapshot a real repository's
  shape into a reusable `defineScenario(...)` module. Reproduces the
  current branch, the commit-graph shape (base commits + how far the
  branch is ahead, with messages and author dates), and the working
  tree's dirty state; emits a ready-to-edit TypeScript module to stdout
  (or `--out <file>`). `--json` emits the structured shape with file
  contents omitted. Read-only against the target repo. New programmatic
  helpers `gatherRepoState`, `renderScenarioModule`, `captureToJson`,
  `deriveContracts`, and `normalizeName` are available from the
  `@gfargo/git-scenarios/capture` subpath.

## [1.0.0] — 2026-05-29

The **stable release**. v1 is about trust, not new features — typed
errors, cross-platform verification, determinism guarantees, and
removing the last traces of the library's origin as a coco internal
helper.

### Added

- **Exported error type hierarchy** — `GitScenariosError` base class
  with `ScenarioNotFoundError`, `GitCommandError`, and
  `InvalidArgumentError` subclasses. All errors carry a discriminating
  `code` field.
- **Precondition guards** — `switchToBranch`, `startMerge`,
  `cherryPick`, `startRebase`, and `createBranch` throw
  `InvalidArgumentError` immediately on empty repos instead of failing
  deep inside git.
- **`withGitError` helper** — wraps git command failures in
  `GitCommandError` with atom-name traceability.
- **11 property-based tests** (fast-check) covering the error
  hierarchy, determinism, and path normalization.
- **Determinism verification** for all 32 built-in scenarios.
- **`MIGRATION.md`** documenting all breaking changes with
  before/after examples.

### Changed

- **Async `exists()`** — `TempGitRepo.exists()` now uses
  `fs/promises.access` instead of the blocking `existsSync`.
- **macOS CI** — the matrix now spans 3 OS × 2 Node versions, plus a
  git-version compatibility job testing 2.25.0 (minimum) + latest.
- **Cross-platform path hardening** — audited all atoms, fixed
  `pinSubmodule`, and documented case-sensitivity caveats.

### Breaking changes

- Temp-dir prefix `coco-git-test-` → `git-scenarios-`.
- Default test identity `Coco Test` → `Git Scenarios Test`.

See [`MIGRATION.md`](./MIGRATION.md) for full before/after details.

## [0.7.0] — 2026-05-28

### Added

- **Three new test runner adapters** — completing the adapter family
  across the TypeScript ecosystem:
  - `@gfargo/git-scenarios/node-test` — Node.js native test runner
    (`node:test`). Same `describeWithScenario` / `describeEachScenario`
    surface as Jest/Vitest, plus a re-exported `it` for single-import
    convenience. No external dependencies — `node:test` is a built-in.
  - `@gfargo/git-scenarios/mocha` — Mocha framework adapter. Uses
    Mocha's runtime-injected globals with `this.timeout(ms)` for
    suite-level timeout (Mocha's convention).
  - `@gfargo/git-scenarios/ava` — AVA framework adapter. Different
    shape since AVA has no `describe` blocks: exports `withScenario`
    returning a handle with `setup` / `cleanup` / `getRepo` for use
    with `test.before()` and `test.after.always()`. Also exports
    `withScenarios` for parameterized test files.

### Test runner adapter family (complete)

| Runner | Subpath | Shape |
|---|---|---|
| Jest | `./jest` | `describeWithScenario` + `describeEachScenario` |
| Vitest | `./vitest` | `describeWithScenario` + `describeEachScenario` |
| node:test | `./node-test` | `describeWithScenario` + `describeEachScenario` + `it` |
| Mocha | `./mocha` | `describeWithScenario` + `describeEachScenario` |
| AVA | `./ava` | `withScenario` + `withScenarios` |

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

[Unreleased]: https://github.com/gfargo/git-scenarios/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/gfargo/git-scenarios/compare/v0.6.0...v0.7.0
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
