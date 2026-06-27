# `@gfargo/git-scenarios`

> **Spin up real git repositories in any state, deterministically.**
> Composable atoms for merge conflicts, out-of-date submodules,
> multiple remotes, in-progress operations, multi-contributor
> histories, linked worktrees, and more — for tests, demos, and tool
> development.

[![npm](https://img.shields.io/npm/v/@gfargo/git-scenarios.svg)](https://www.npmjs.com/package/@gfargo/git-scenarios)
[![license](https://img.shields.io/npm/l/@gfargo/git-scenarios.svg)](./LICENSE)
[![types](https://img.shields.io/npm/types/@gfargo/git-scenarios.svg)](https://www.npmjs.com/package/@gfargo/git-scenarios)
[![CI](https://github.com/gfargo/git-scenarios/actions/workflows/ci.yml/badge.svg)](https://github.com/gfargo/git-scenarios/actions/workflows/ci.yml)

📖 **[Full documentation →](https://git-scenarios.griffen.codes)**

<p align="center">
  <img src="./tapes/hero.gif" alt="git-scenarios inspect: a clean PR-ready feature branch, then an in-progress merge conflict — real repos in any state, one command" width="800">
</p>

## What this is

Real-world git tools — `lazygit`, `gitui`, IDEs, custom dev tools —
behave differently against a feature-branch-ready-to-PR than against
a mid-merge-conflict than against an out-of-date submodule. Testing
those behaviors usually means hand-writing `git init` + `writeFile` +
`commitAll` setups in every test, or worse, checking real repos into
the test tree.

This package replaces both with:

- **A registry of curated scenarios** (`feature-pr-ready`,
  `mid-merge-conflict`, `submodule-with-history`, …) — call
  `spinUpScenario('name')` and you get a real temp git repo in the
  named state, ready to drive your tool against.
- **A composable atom layer** (`chain`, `addCommit`, `startMerge`,
  `addSubmodule`, `withAuthor`, …) — build your own scenarios inline
  in tests, or register custom ones for your project.
- **A tool-agnostic CLI** — `npx git-scenarios create
  <name> --run <command>` materializes a scenario and launches any
  tool against it. Tightest dev loop for "what does my tool do
  against state X?"

Every scenario is deterministic (same setup → byte-identical repo
state every run), so the tests built on top are deterministic too.

## Audiences

1. **You're writing an integration test.** Use `spinUpScenario()` to
   start from a deterministic baseline instead of hand-building the
   same `git init` + `writeFile` + `commitAll` setup every time.
2. **You're hand-testing a git tool** (your own, or someone else's).
   Use the CLI to materialize a scenario on disk and launch the tool
   against it in one command.
3. **You're building your own scenario library** for a tool that
   doesn't fit the curated set. Use the atom layer to compose
   anything from "single staged file" to "three-way nested submodule
   mid-rebase."

> **Status: v1.1.0** — Stable release. 35 curated scenarios, 60+ composable atoms,
> 5 framework adapters, `assertRepo()` + `expect` matchers, CLI
> (`list` · `describe` · `inspect` · `create` · `capture` · `clean`),
> dual CJS/ESM output.

## Table of contents

- [Installation](#installation)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Jest framework adapter](#jest-framework-adapter)
- [Common patterns (cookbook)](#common-patterns-cookbook)
- [Available scenarios](#available-scenarios)
- [The CLI](#the-cli)
- [Programmatic API](#programmatic-api)
- [Custom scenario registration](#custom-scenario-registration)
- [Atoms — compose any repo state](#atoms--compose-any-repo-state-from-building-blocks)
- [Defining your own scenarios](#defining-your-own-scenarios)
- [TypeScript support](#typescript-support)
- [Debugging](#debugging)
- [Contributing](#contributing)

## Installation

```bash
npm install --save-dev @gfargo/git-scenarios simple-git
# or
yarn add --dev @gfargo/git-scenarios simple-git
# or
pnpm add --save-dev @gfargo/git-scenarios simple-git
```

`simple-git` is a `peerDependency` — installed alongside so your
project picks the version compatible with both this package and any
other simple-git consumer you have.

**Node requirement**: `^22.22.2 || ^24.15.0 || >=26.0.0`. The
package ships both ESM and CJS — use `import` or `require`, both work.

## Prerequisites

- **Node.js**: ^22.22.2 || ^24.15.0 || >=26.0.0
- **Git**: ≥2.25.0 (for sparse-checkout, worktree improvements)

### Compatibility Matrix

| OS | Git Version | Status |
|---|---|---|
| Ubuntu 24.04 | 2.43.x (system) | ✅ Tested in CI |
| Ubuntu 24.04 | 2.25.0 (minimum) | ✅ Tested in CI |
| Windows Server 2022 | 2.43.x (system) | ✅ Tested in CI |
| macOS 14 (Sonoma) | 2.43.x (Xcode) | ✅ Tested in CI |

## Quick start

### Integration tests — start from a baseline

```ts
import { spinUpScenario, type TempGitRepo } from '@gfargo/git-scenarios'

describe('changelog flow against a PR-ready branch', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await spinUpScenario('feature-pr-ready')
  })

  afterAll(async () => {
    await repo.cleanup()
  })

  it('generates a changelog vs main', async () => {
    // repo is on feat/widget-v2, 4 commits ahead of main, clean.
    // Run the thing under test from here.
  })
})
```

### Manual testing — drive any tool against a known state

```bash
# Spin up a feature branch ready to PR, launch lazygit against it
npx git-scenarios create feature-pr-ready --run "lazygit"

# Spin up an in-progress merge conflict, drop into your IDE
npx git-scenarios create mid-merge-conflict --run "code -n"

# Spin up a dirty worktree without launching anything — get the path
npx git-scenarios create dirty-many-files
# → /var/folders/.../git-scenarios-xR2qwz
# cd in and run whatever you want against it
```

### Inline composition — build a scenario right in a test

```ts
import {
  addCommit,
  addRemote,
  chain,
  createTempGitRepo,
  startMerge,
  switchToBranch,
} from '@gfargo/git-scenarios'

const repo = await createTempGitRepo()
await chain(
  addCommit({ message: 'base', files: { 'src/widget.ts': 'export const widget = () => null\n' } }),
  switchToBranch('feat/theirs'),
  addCommit({ message: 'theirs', files: { 'src/widget.ts': 'theirs\n' } }),
  switchToBranch('main'),
  addCommit({ message: 'ours', files: { 'src/widget.ts': 'ours\n' } }),
  startMerge('feat/theirs'),
  addRemote('origin', 'git@example.com:org/repo.git'),
)(repo)
// repo is now mid-merge with src/widget.ts conflicted, origin set
```

## Framework adapters (Jest, Vitest, node:test, Mocha, AVA)

The library ships adapters for every major TypeScript test runner.
Each provides zero-boilerplate scenario setup with automatic cleanup.

```ts
// Jest:
import { describeWithScenario } from '@gfargo/git-scenarios/jest'
// Vitest:
import { describeWithScenario } from '@gfargo/git-scenarios/vitest'
// node:test:
import { describeWithScenario } from '@gfargo/git-scenarios/node-test'
// Mocha:
import { describeWithScenario } from '@gfargo/git-scenarios/mocha'
// AVA (different shape — no describe blocks):
import { withScenario } from '@gfargo/git-scenarios/ava'
```

The first four share one API — only the import path changes:

```ts
import { describeWithScenario } from '@gfargo/git-scenarios/jest'

describeWithScenario('feature-pr-ready', (getRepo) => {
  it('is on a feature branch', async () => {
    const repo = getRepo()
    const status = await repo.git.status()
    expect(status.current).not.toBe('main')
  })

  it('has a clean worktree', async () => {
    const repo = getRepo()
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
  })
})
```

Run tests against multiple scenarios at once:

```ts
import { describeEachScenario } from '@gfargo/git-scenarios/jest'

describeEachScenario(
  ['feature-pr-ready', 'two-commit-feature', 'multi-commit-branch'],
  (getRepo, scenarioName) => {
    it(`has a clean worktree in ${scenarioName}`, async () => {
      const repo = getRepo()
      const status = await repo.git.status()
      expect(status.isClean()).toBe(true)
    })
  },
)
```

Extend a base scenario with extra steps:

```ts
describeWithScenario('single-staged-file', (getRepo) => {
  it('has the extra dirty file', async () => {
    const repo = getRepo()
    const status = await repo.git.status()
    expect(status.not_added).toContain('extra.ts')
  })
}, {
  timeout: 60_000,
  extraSteps: [writeFiles({ 'extra.ts': 'uncommitted\n' })],
})
```

## Common patterns (cookbook)

### "I just need a repo with a few commits"

```ts
const repo = await spinUpScenario('two-commit-feature')
```

### "I need a repo my tool can stage / commit against"

```ts
const repo = await spinUpScenario('single-staged-file')
// repo has 1 staged README ready to commit
```

### "I need to test a merge-conflict flow"

```ts
const repo = await spinUpScenario('mid-merge-conflict')
// repo is mid-merge with `src/widget.ts` conflicted, MERGE_HEAD set
```

Or inline:

```ts
await chain(
  addCommit({ message: 'base', files: { 'x.ts': 'base\n' } }),
  switchToBranch('feat/theirs'),
  addCommit({ message: 'theirs', files: { 'x.ts': 'theirs\n' } }),
  switchToBranch('main'),
  addCommit({ message: 'ours', files: { 'x.ts': 'ours\n' } }),
  startMerge('feat/theirs'),
)(repo)
```

### "I need an out-of-date submodule"

```ts
await chain(
  addCommit({ message: 'init', files: { 'README.md': '# parent' } }),
  addSubmodule({
    path: 'vendor/lib',
    branch: 'main',
    setup: chain(
      addCommit({ message: 'init lib', files: { 'README.md': '# lib' } }),
    ),
  }),
  addCommit({ message: 'chore: pin submodule' }),
  // Commits inside the submodule that DON'T update the parent's pin
  insideSubmodule('vendor/lib', chain(
    addCommit({ message: 'feat: post-pin', files: { 'a.ts': 'a' } }),
  )),
)(repo)
// `git submodule status` now reports `+` modified
```

### "I need multi-contributor history for blame / triage tests"

```ts
await chain(
  addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
  withAuthor({ name: 'Alice', email: 'alice@org', date: daysAgo(10) },
    addCommit({ message: 'feat: alice work', files: { 'a.ts': 'a' } }),
  ),
  withAuthor({ name: 'Bob', email: 'bob@org', date: daysAgo(5) },
    addCommit({ message: 'fix: bob work', files: { 'b.ts': 'b' } }),
  ),
)(repo)
```

### "I need a fork topology with origin + upstream"

```ts
await chain(
  addCommit({ message: 'init', files: { 'README.md': '# fork' } }),
  addRemote('origin', 'git@github.com:fork/repo.git'),
  addRemote('upstream', 'git@github.com:source/repo.git'),
)(repo)
```

### "My tool depends on ahead/behind counts — I need a tracked branch"

```ts
// Tracked, fully synced — "Your branch is up to date with 'origin/main'."
await chain(
  addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
  addRemote('origin', '/fake/url'),
  setRemoteRef('origin', 'main', 'HEAD'),
  setUpstream('main', 'origin'),
)(repo)
```

### "I need a branch that's N commits ahead of its upstream"

```ts
// 3 commits ahead of origin/main.
await chain(
  addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
  addRemote('origin', '/fake/url'),
  // Pin the remote at the current commit ...
  setRemoteRef('origin', 'main', 'HEAD'),
  setUpstream('main', 'origin'),
  // ... then add 3 local-only commits.
  addCommit({ message: 'feat: a', files: { 'a.ts': 'a\n' } }),
  addCommit({ message: 'feat: b', files: { 'b.ts': 'b\n' } }),
  addCommit({ message: 'feat: c', files: { 'c.ts': 'c\n' } }),
)(repo)
```

### "I need a branch that's N commits behind its upstream"

```ts
// `withRemoteTracking` runs a step against a temporary clone, then
// fetches the resulting branch tip back into the parent as
// refs/remotes/<remote>/<branch>. Any commit-producing atom works
// inside.
await chain(
  addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
  addRemote('origin', '/fake/url'),
  withRemoteTracking('origin', 'main', chain(
    addCommit({ message: 'upstream B', files: { 'b.ts': 'b' } }),
    addCommit({ message: 'upstream C', files: { 'c.ts': 'c' } }),
  )),
  setUpstream('main', 'origin'),
)(repo)
// git status: "Your branch is behind 'origin/main' by 2 commits"
```

### "I need a diverged branch (both ahead and behind)"

```ts
await chain(
  addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
  addRemote('origin', '/fake/url'),
  // Two upstream-only commits ...
  withRemoteTracking('origin', 'main', chain(
    addCommit({ message: 'upstream X' }),
    addCommit({ message: 'upstream Y' }),
  )),
  // ... then two local-only commits that diverge.
  addCommit({ message: 'local M', files: { 'm.ts': 'm' } }),
  addCommit({ message: 'local N', files: { 'n.ts': 'n' } }),
  setUpstream('main', 'origin'),
)(repo)
// git status: "Your branch and 'origin/main' have diverged, 2 and 2"
```

### "I need detached HEAD"

```ts
await chain(
  addCommit({ message: 'init' }),
  addCommit({ message: 'feat: one' }),
  addCommit({ message: 'feat: two' }),
  // No dedicated atom — use simple-git directly inside an inline step:
  (async (repo) => { await repo.git.checkout(['--detach', 'main~1']) }),
)(repo)
```

### "I need linked worktrees"

```ts
await chain(
  addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
  addWorktree('/tmp/feat-x', { branch: 'feat/x' }),
  // Second worktree on its own branch
)(repo)
```

### "I need a specific git config for my tool to detect"

```ts
await chain(
  addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
  setConfig('commit.template', '.gitmessage'),
  setConfig('user.signingkey', 'ABC123'),
)(repo)
```

### "I need a mid-rebase conflict"

```ts
await chain(
  addCommit({ message: 'base', files: { 'x.ts': 'base\n' } }),
  switchToBranch('feat/theirs'),
  addCommit({ message: 'theirs', files: { 'x.ts': 'theirs\n' } }),
  checkoutBranch('main'),
  addCommit({ message: 'ours', files: { 'x.ts': 'ours\n' } }),
  checkoutBranch('feat/theirs'),
  startRebase('main'),
  // repo is now mid-rebase with x.ts conflicted, REBASE_HEAD set
)(repo)
```

### "I need to test rename detection"

```ts
await chain(
  addCommit({ message: 'init', files: { 'src/old-name.ts': 'export const x = 1\n' } }),
  renameFile('src/old-name.ts', 'src/new-name.ts'),
  commit('refactor: rename old-name → new-name'),
)(repo)
```

## Layout

```
git-scenarios/
├── README.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── package.json
├── tsconfig.json
├── tsup.config.ts          (dual CJS/ESM build config)
├── jest.config.cjs
├── src/
│   ├── index.ts            (public API entry point)
│   ├── tempGitRepo.ts      (low-level: init + user config + main branch)
│   ├── spinUpScenario.ts   (one-shot scenario API)
│   ├── fromScenario.ts     (scenario + extra steps helper)
│   ├── registry.ts         (mutable scenario registry)
│   ├── jest.ts             (Jest framework adapter)
│   ├── __fixtures__/
│   │   └── generators.ts   (vendored deterministic content generator)
│   ├── atoms/              (composable building blocks)
│   │   ├── index.ts        (barrel export)
│   │   ├── chain.ts, addCommit.ts, branches.ts, ...
│   │   ├── sparseCheckout.ts, shallowClone.ts, notes.ts, hooks.ts
│   │   └── *.test.ts
│   └── scenarios/          (curated repo states)
│       ├── index.ts        (registry + lookup)
│       ├── types.ts        (Scenario type)
│       ├── shared/
│       └── *.ts / *.test.ts
└── bin/
    └── cli.ts              (the `git-scenarios` CLI)
```

## Available scenarios

Run `git-scenarios list` for the live list. Current set (**40 scenarios across 6 kinds**):

| Name | Kind | What you get |
|---|---|---|
| `empty-repo` | branch | freshly-initialized repo: no commits, no files, no remotes. HEAD on `main` but unborn. |
| `feature-pr-ready` | branch | `feat/widget-v2` 4 commits ahead of `main`, clean worktree — for create-pr and changelog flows |
| `feature-branch-one-commit` | branch | `main` + `feat/x` (1 commit ahead, `src/feature.ts`) — minimal branch-vs-base shape |
| `multi-commit-branch` | branch | `feat/dashboard` with 8 varied commits — baseline for navigation / filter / yank |
| `two-commit-feature` | branch | baseline + a feat commit on `main`, clean worktree — for changelog / log / review smoke tests |
| `branch-tracking-upstream` | branch | `main` tracks `origin/main`, both at the same commit, clean worktree — baseline "synced" state |
| `branch-ahead-of-upstream` | branch | `main` is 3 commits ahead of `origin/main` — classic "unpushed" state |
| `branch-behind-upstream` | branch | `main` is 3 commits behind `origin/main` — fast-forwardable |
| `branch-diverged` | branch | `main` is 2 ahead AND 2 behind `origin/main` — diverged history |
| `multi-remote-with-tracking` | branch | fork-workflow: `origin` + `upstream` remotes, `main` tracks `upstream/main`, `feat/fork-work` tracks `origin/feat/fork-work` |
| `branch-sync-showcase` | branch | five local branches in five different upstream sync states (behind, ahead, diverged, synced, no-upstream); HEAD on the behind branch. |
| `detached-head` | branch | HEAD detached at `main~2`, `main` still at its original tip |
| `dangling-commit` | branch | experimental commit dropped from `main`; object still in store, reachable only via `HEAD@{1}` reflog |
| `reset-recoverable-head` | branch | `main` hard-reset 2 commits back; former tip recoverable via `main@{1}` in the reflog |
| `signed-commits-required` | branch | `commit.gpgsign=true` + `user.signingkey` set — for testing signing-aware UI |
| `orphan-branch` | branch | `main` + `gh-pages` orphan branch with no shared history |
| `single-staged-file` | worktree | baseline + 1 staged README — minimum "ready to commit" shape |
| `partial-stage` | worktree | 2 staged + 2 unstaged + 1 untracked — the "mixed worktree" shape |
| `monorepo-multi-package` | worktree | workspaces monorepo: app (clean), lib (staged), cli (unstaged) |
| `dirty-many-files` | worktree | 12 staged + 6 unstaged + 3 untracked files across `src/`, `tests/`, `docs/` |
| `multiple-worktrees` | worktree | primary worktree on `main` + 3 linked worktrees on `feat/alpha`, `feat/beta`, `hotfix/urgent` |
| `mid-bisect` | operation | 20 commits + active `git bisect`, HEAD at midpoint |
| `mid-merge-conflict` | operation | in-progress merge with 1 unresolved conflict on `src/widget.ts` |
| `mid-rebase-conflict` | operation | in-progress rebase with 1 unresolved conflict on `src/config.ts` |
| `mid-cherry-pick-conflict` | operation | in-progress cherry-pick with 1 unresolved conflict on `src/utils.ts` |
| `mid-revert-conflict` | operation | in-progress revert with 1 unresolved conflict on `src/service.ts` |
| `merge-conflict-rename-rename` | operation | in-progress merge with a rename/rename conflict: `orig.txt` renamed to two different names; both renamed files exist in the worktree with no conflict markers |
| `merge-conflict-delete-modify` | operation | in-progress merge with a delete/modify conflict: `src/component.ts` deleted on `main`, modified on `feat/x`; modified version left in worktree with no conflict markers |
| `merge-conflict-add-add` | operation | in-progress merge with an add/add conflict: `src/config.ts` independently added on both branches with different content; has unresolved conflict markers |
| `merge-no-conflict` | history | a successful `--no-ff` merge of `feat/x` into `main`, fully committed (2-parent commit at HEAD) |
| `rich-history-graph` | history | 20+ commits across 6 date buckets, 2 `--no-ff` merges, 1 live unmerged `feat/wip` |
| `chip-rendering-showcase` | history | 6 commits each carrying a different branch-tip-chip kind (HEAD, local, slashy, remote, upstream, tag) |
| `shallow-clone` | history | 10 commits but only 4 reachable from HEAD (`.git/shallow` set) — for testing shallow-repo detection |
| `large-repo` | history | 115 commits across 3 branches with 3 tags (`v0.1.0`, `v0.5.0`, `v1.0.0`) — for pagination/performance testing |
| `stashed-changes` | stash | clean `main` + 3 stashes (LIFO ordered, each touching a distinct file) |
| `stash-with-untracked` | stash | one stash containing both modified tracked + untracked new files |
| `submodule-with-history` | submodule | parent with 4 commits + `vendor/lib` submodule (clean pin, 4 commits, `branch = main`) |
| `git-lfs-pointer` | worktree | repo with a Git LFS pointer file committed for a binary asset — no `git-lfs` binary required; pointer format and `.gitattributes` rules are testable everywhere |
| `crlf-normalization` | worktree | `.gitattributes` with `* text=auto eol=lf` normalising all text files; documents Windows `core.autocrlf` override and LF-in-object-store behaviour |
| `case-collision` | worktree | git history holds `src/File.ts` and `src/file.ts` — a case-only collision that silently loses data when checked out on macOS or Windows (case-insensitive FS) |

`git-scenarios describe <name>` prints the full description and the
contract assertions for a single scenario.

`large-repo` is also the primary target of the built-in benchmark harness — run `npm run bench` to measure scenario spin-up times and detect performance regressions.

## The CLI

```bash
npx git-scenarios list                                                  # show all scenarios grouped by kind
npx git-scenarios list --kind operation                                 # filter by kind
npx git-scenarios list --tag conflict                                   # filter by tag
npx git-scenarios list --json                                           # machine-readable
npx git-scenarios describe feature-pr-ready                             # one-scenario detail
npx git-scenarios describe feature-pr-ready --json                      # machine-readable
npx git-scenarios inspect feature-pr-ready                              # graph + branches + status, no files kept
npx git-scenarios inspect feature-pr-ready --json                      # machine-readable
npx git-scenarios diff feature-pr-ready mid-merge-conflict              # compare two scenarios' shapes
npx git-scenarios diff feature-pr-ready mid-merge-conflict --json       # machine-readable comparison
npx git-scenarios create feature-pr-ready                               # materialize in /tmp
npx git-scenarios create feature-pr-ready --path ~/sandbox/widget       # custom location
npx git-scenarios create feature-pr-ready --run "lazygit"               # launch any tool against it
npx git-scenarios create feature-pr-ready --ephemeral                   # auto-clean on exit
npx git-scenarios create rich-history-graph \
  --run "lazygit" --remote git@github.com:org/repo.git                  # add an origin first
npx git-scenarios capture . --name my-bug-repro > my-bug.ts             # snapshot a real repo's shape into a scenario
npx git-scenarios capture . --json                                      # structured capture data
npx git-scenarios clean                                                 # remove stale scenario dirs in /tmp
npx git-scenarios clean --dry-run                                       # preview without removing
npx git-scenarios clean --older-than 24                                 # only dirs older than 24 hours
```

### Flags

| Flag | Behavior |
|---|---|
| `--path <dir>` | Materialize at `<dir>` instead of `/tmp`. Useful when you want to `cd` into it later and poke around. |
| `--run <cmd>` | After materializing, spawn `<cmd>` against the scenario dir (cwd = scenario dir). Examples: `--run "lazygit"`, `--run "gitui"`, `--run "code -n"` (open in VS Code). |
| `--remote <url>` | Add `origin` pointing at `<url>` so gh-aware tools detect a remote on launch. Pass any gh-shaped URL. Use a real one to render the tool's views with live data; use a fake one to render against an empty / unauthenticated remote (no risk of accidental destructive actions). Without this flag the scenario repo is a bare `git init` with no remote. |
| `--ephemeral` | Auto-clean the temp dir on CLI exit. Skip for normal use — without `--ephemeral`, the dir persists so you can re-inspect after the launched tool quits. |
| `--tag <t>` | (`list` only) Filter by tag inclusion. Combine with `--kind` (AND semantics). Example: `git-scenarios list --kind stash --tag untracked`. |
| `--name <name>` | (`capture` only) Scenario name (kebab-cased). Defaults to the captured repo's directory name. |
| `--summary <s>` | (`capture` only) One-line summary for the generated scenario. |
| `--out <file>` | (`capture` only) Write the generated module to `<file>` instead of stdout. |
| `--kind <k>` | (`list` and `capture`) `list`: filter by scenario kind (`branch`, `worktree`, `operation`, `history`, `stash`, `submodule`). `capture`: override the inferred kind. |
| `--json` | (`list`, `describe`, `inspect`, `diff`, `capture`) Emit machine-readable JSON. List → `name`/`summary`/`kind`/`tags`/`contracts`; `inspect` → `graph`/`branches`/`status`; `diff` → `{ a, b, same, differences }`; `capture` → the structured shape (file contents omitted). |

### Capturing a real repo

Hit a bug against a repo in some peculiar state? Instead of hand-writing
a scenario to reproduce it, point `capture` at the repo and get a
ready-to-edit `defineScenario(...)` module:

```bash
npx git-scenarios capture . --name my-bug-repro > scenarios/my-bug.ts
```

`capture` is **read-only** against the target repo. What it reproduces
faithfully:

- the current branch (and whether `HEAD` is detached)
- the commit-graph shape — base-branch commits plus the commits your
  branch is ahead by (e.g. "4 commits ahead of `main`"), with each
  commit's message and author date preserved
- the working tree's dirty state — which paths are staged, modified, or
  untracked (with their current content, size-capped)

What it deliberately does **not** reproduce: exact commit hashes (the
library's whole point is fresh deterministic hashes), historical file
contents (placeholders are emitted), or merge topology and non-current
branches (surfaced as a comment to fill in). The output is a starting
point you edit — register it with `registerScenario(...)` and it works
everywhere the built-ins do.

Use `--json` for the structured shape instead of a module; note that
JSON output omits captured file contents.

### Cleanup

Without `--ephemeral`, scenarios persist. The CLI prints the path
and a cleanup hint at exit:

```
✓ Scenario "feature-pr-ready" ready at:
    /var/folders/.../git-scenarios-xR2qwz

When you're done, clean up with:
    rm -rf /var/folders/.../git-scenarios-xR2qwz
```

Over time, `/tmp` accumulates these dirs. Periodically clean them with:

```bash
rm -rf $(ls -d /var/folders/**/git-scenarios-* 2>/dev/null)
```

## Programmatic API (integration tests)

### `spinUpScenario(name, options?)`

The single import point for tests. Returns a `TempGitRepo` already
brought into the named state:

```ts
import { spinUpScenario } from '@gfargo/git-scenarios'

const repo = await spinUpScenario('feature-pr-ready')
// repo is on feat/widget-v2, 4 commits ahead of main, clean worktree
```

Optional `options` bag (all fields optional):

```ts
const repo = await spinUpScenario('feature-pr-ready', {
  // Auto-clean on process exit (safety net for tests that crash):
  autoCleanup: true,
  // Add an origin remote after setup (useful for gh-aware tooling):
  remote: 'git@github.com:org/repo.git',
})
```

Throws if the name doesn't match a registered scenario — typos
fail at setup time, not buried in an assertion.

### The `TempGitRepo` shape

```ts
type TempGitRepo = {
  path: string                                          // absolute filesystem path
  git: SimpleGit                                        // simple-git instance bound to path
  writeFile: (path: string, content: string) => Promise<void>
  readFile: (path: string) => Promise<string>
  exists: (path: string) => Promise<boolean>
  commitAll: (message: string) => Promise<void>
  snapshot: () => Promise<RepoSnapshot>  // structured, read-only state
  cleanup: () => Promise<void>
}
```

- **`path`** — absolute path to the temp dir. Use for shell-out
  operations or anywhere a string path is needed.
- **`git`** — pre-configured `simple-git` instance. User identity
  (`Git Scenarios Test <test@git-scenarios.dev>`) and `commit.gpgsign=false` are
  already set. Use for any git command in your test.
- **`writeFile(rel, content)`** — write to a path relative to the
  repo root. Parent directories created automatically.
- **`readFile(rel)`** — read utf-8 content from a repo-relative path.
  Throws on missing file.
- **`exists(rel)`** — check whether a file or directory exists at
  the given repo-relative path.
- **`commitAll(message)`** — `git add . && git commit -m <message>`
  in one call. Convenience for the common case.
- **`snapshot()`** — a structured, read-only description of the repo's
  current state (HEAD, branches, staged/modified/untracked split,
  ahead/behind, commit count, in-progress operation, conflicts, stashes,
  graph). The programmatic counterpart to `git-scenarios inspect`. See
  [Asserting against a scenario](#asserting-against-a-scenario).
- **`cleanup()`** — `rm -rf` the temp dir. Call in `afterAll` /
  `afterEach`. Idempotent (safe to call twice).

### Extending a scenario in your test

A scenario sets up the baseline. From there, do whatever your test
needs:

```ts
const repo = await spinUpScenario('feature-pr-ready')

// Add an extra commit on top of the 4 the scenario gave you
await repo.writeFile('src/widget-v3.ts', 'export const v3 = true\n')
await repo.commitAll('feat: widget v3 stub')

// Make the worktree dirty
await repo.writeFile('src/extra.ts', 'console.log("dirty")\n')

// Now exercise the thing under test against this state
const log = await getLogRows(repo.git, { branch: 'main' })
expect(log).toHaveLength(5)
```

### Reading state after the action

After exercising the code under test, inspect the repo with the
provided `git` instance:

```ts
// Inspect commits
const log = await repo.git.log()
expect(log.latest?.message).toBe('feat: my new feature')

// Inspect refs
const branches = await repo.git.branchLocal()
expect(branches.all).toContain('feat/added-by-test')

// Inspect file content
const content = await fs.promises.readFile(`${repo.path}/src/foo.ts`, 'utf8')
expect(content).toContain('updated')

// Inspect status
const status = await repo.git.status()
expect(status.staged).toEqual(['src/foo.ts'])
```

### Asserting against a scenario

For the common checks you don't have to hand-roll `git` calls. Three
options, all built on `repo.snapshot()`:

**`repo.snapshot()`** — read the whole state as one structured object:

```ts
const snap = await repo.snapshot()
snap.head.branch     // current branch, or null when detached
snap.status.clean    // boolean
snap.status.staged   // string[]  (also .modified, .untracked)
snap.status.ahead    // number    (vs upstream; also .behind)
snap.commitCount     // commits reachable from HEAD
snap.operation       // 'merge' | 'rebase' | 'cherry-pick' | 'revert' | 'bisect' | null
snap.conflicts       // string[]  unmerged paths
snap.stashes         // number
```

`snapshotRepo(git)` is exported too, for use against any `simple-git`
instance.

**`assertRepo(...)`** — a fluent, runner-agnostic assertion chain that
throws `RepoAssertionError` on the first mismatch (works in every test
runner):

```ts
import { assertRepo } from '@gfargo/git-scenarios'

await assertRepo(repo)
  .onBranch('feat/widget-v2')
  .cleanWorktree()
  .commitCount(7)
```

**`expect(...)` matchers** — for Jest and Vitest, register once then
assert directly:

```ts
import { matchers } from '@gfargo/git-scenarios/matchers'
expect.extend(matchers)

await expect(repo).toBeMidMerge()
await expect(repo).toHaveConflictIn('src/widget.ts')
await expect(repo).not.toHaveCleanWorktree()
```

See the [Testing Recipes guide](https://github.com/gfargo/git-scenarios/blob/main/www/src/content/docs/docs/guides/recipes.mdx)
for the full matcher list and the 4-line Vitest type augmentation.

### Raw `createTempGitRepo()` — when scenarios don't fit

`spinUpScenario` is the right entry point for ~95% of tests. The
underlying `createTempGitRepo()` is exported too, for the rare case
where none of the named scenarios fit and you really do want to
build from `git init`:

```ts
import { createTempGitRepo } from '@gfargo/git-scenarios'

const repo = await createTempGitRepo()
// fresh git repo with main branch + user config + commit.gpgsign=false
// no commits, no files — you build everything from here
```

### `fromScenario(name, ...extraSteps)` — scenario + extras in one call

When you need a scenario plus a few extra atoms on top:

```ts
import { fromScenario, addCommit, writeFiles } from '@gfargo/git-scenarios'

const repo = await fromScenario('feature-pr-ready',
  addCommit({ message: 'extra commit', files: { 'extra.ts': 'x\n' } }),
  writeFiles({ 'dirty.ts': 'uncommitted\n' }),
)
// repo is feature-pr-ready + one extra commit + one dirty file
```

## Custom scenario registration

Register custom scenarios so they're available via `spinUpScenario`,
`fromScenario`, and the CLI:

```ts
import {
  registerScenario,
  defineScenario,
  chain,
  addCommit,
  writeFiles,
} from '@gfargo/git-scenarios'

registerScenario(defineScenario({
  name: 'my-monorepo-dirty',
  summary: 'monorepo with uncommitted changes in packages/lib',
  description: '...',
  kind: 'worktree',
  tags: ['monorepo', 'dirty'],
  setup: chain(
    addCommit({ message: 'init', files: { 'packages/lib/index.ts': 'v1\n' } }),
    writeFiles({ 'packages/lib/index.ts': 'v2 (dirty)\n' }),
  ),
}))

// Now works everywhere:
const repo = await spinUpScenario('my-monorepo-dirty')
```

### Registry API

| Function | What it does |
|---|---|
| `registerScenario(scenario)` | Add a custom scenario. Throws on duplicate names. |
| `registerScenarios(scenarios)` | Batch registration. |
| `unregisterScenario(name)` | Remove by name (returns `true`/`false`). |
| `listRegistered()` | All scenarios (built-in + custom). |
| `findRegistered(name)` | Lookup by name. O(1). |
| `findRegisteredByTag(tags, match?)` | Filter by tag (`'any'` or `'all'` matching). Searches built-in + custom. |
| `resetRegistry()` | Restore to built-in-only (useful in test teardown). |
| `findScenariosByTag(tags, match?)` | Like `findRegisteredByTag` but only searches built-ins. |

## Atoms — compose any repo state from building blocks

Every registered scenario is built from small, single-purpose
**atoms**: functions that take a `TempGitRepo` and apply one
side-effect. Atoms are exported flat from the package, so you can
compose your own setups inline in tests — no registration needed —
or use them to write new registered scenarios.

```ts
import {
  addCommit,
  addRemote,
  chain,
  createTempGitRepo,
  seededFiles,
  startMerge,
  switchToBranch,
} from '@gfargo/git-scenarios'

const repo = await createTempGitRepo()
await chain(
  addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
  addRemote('origin', 'git@example.com:org/repo.git'),
  seededFiles({ files: [{ path: 'src/widget.ts', tokens: 120 }], seed: 0xabc }),
  addCommit({ message: 'feat: widget' }),
  switchToBranch('feat/conflict'),
  addCommit({ message: 'theirs', files: { 'src/widget.ts': 'theirs\n' } }),
  // … flip back to main with a conflicting change, then attempt merge
)(repo)
```

The atom signature is uniform: every atom returns a `Step`,
`(repo: TempGitRepo) => Promise<void>`. That's the same type
`Scenario.setup` accepts, so `setup: chain(…)` works directly in
`defineScenario({…})`.

### Atom catalog

#### Control flow

| Atom | What it does |
|---|---|
| `chain(...steps)` | Sequence atoms; awaits each before the next. Short-circuits on rejection. |
| `repeat(n, factory)` | `chain(...Array.from({ length: n }, factory))` — readable "do this N times." |
| `conditionally(condition, step)` | Run `step` only when `condition` is true. Accepts a static boolean or an async predicate `(repo) => boolean`. |

#### Working tree

| Atom | What it does |
|---|---|
| `writeFiles({ 'path': content })` | Write literal content. Parent dirs created. Does NOT stage. |
| `deleteFiles(...paths)` | Remove files from the working directory. Does NOT stage the deletion. |
| `renameFile(from, to)` | `git mv` — rename a tracked file. Stages the rename for rename-detection. |
| `seededFiles({ files, seed })` | Write procedurally-generated content (seeded, byte-stable across runs). |

#### Staging + commits

| Atom | What it does |
|---|---|
| `stageFiles(...paths)` | `git add .` (no args) or `git add <paths>`. |
| `unstageFiles(...paths)` | Inverse of `stageFiles`. With no args resets the index (`git reset`); with paths uses `git restore --staged`. Enables partial-stage scenarios. |
| `commit(message, { date? })` | Commit the staged set. Doesn't stage. |
| `addCommit({ message, files?, date? })` | Workhorse: write + stage all + commit. |
| `emptyCommit(message, { date? })` | `--allow-empty` commit. |
| `amendCommit({ message? })` | `--amend` the last commit. |
| `bulkCommits(specs)` | Fast-path for N commits. ~30% faster than `chain(...specs.map(addCommit))` for 50+ commit scenarios. Specs without `files` are committed `--allow-empty`. |

Every commit-producing atom accepts an optional `date` (any
`GIT_AUTHOR_DATE`-compatible ISO string). Pair with `daysAgo(n)` for
relative-time scenarios.

#### Branches

| Atom | What it does |
|---|---|
| `switchToBranch(name, { from? })` | `git checkout -b <name>` (optionally from a specific ref). |
| `checkoutBranch(name)` | `git checkout <name>` (existing). |
| `createBranch(name, { from? })` | `git branch <name>` (no checkout). |
| `deleteBranch(name, { force? })` | `git branch -d` / `-D`. |

#### Tags

| Atom | What it does |
|---|---|
| `createTag(name, { message?, sha? })` | Annotated when `message` is set, otherwise lightweight. |
| `deleteTag(name)` | `git tag -d`. |

#### Remotes

| Atom | What it does |
|---|---|
| `addRemote(name, url)` | Register a remote. URL stored as-is — no fetch. |
| `removeRemote(name)` | Drop a remote. |
| `renameRemote(from, to)` | Rename a remote (URL unchanged). |

#### Upstream tracking

| Atom | What it does |
|---|---|
| `setUpstream(localBranch, remote, remoteBranch?)` | Write `branch.<X>.remote` + `branch.<X>.merge` config (`git branch --set-upstream-to`). `remoteBranch` defaults to `localBranch`. |
| `setRemoteRef(remote, branch, sha)` | Direct `git update-ref refs/remotes/<remote>/<branch>` — fabricate a remote-tracking ref without a fetch. |

#### Stash

| Atom | What it does |
|---|---|
| `stashChanges({ message?, includeUntracked?, keepIndex? })` | `git stash push` with the matching flags. |
| `applyStash({ ref? })` | `git stash apply`. |
| `popStash({ ref? })` | `git stash pop`. |
| `dropStash({ ref? })` | `git stash drop`. |

#### Operations (merge / cherry-pick / revert / rebase / bisect / reset)

| Atom | What it does |
|---|---|
| `startMerge(branch, { allowConflict?, noFastForward?, squash?, message?, date? })` | Merge — conflicts leave the repo mid-merge by default. `squash: true` produces a staged squash without a merge commit (caller commits to finalize). |
| `abortMerge()` | `git merge --abort`. |
| `cherryPick(ref, { allowConflict?, date? })` | Cherry-pick — conflicts leave mid-cherry-pick by default. |
| `abortCherryPick()` | `git cherry-pick --abort`. |
| `continueCherryPick()` | `git cherry-pick --continue` (after resolving conflicts). |
| `revert(ref, { mainline?, allowConflict?, date? })` | Revert a commit (use `mainline` for merge commits). |
| `abortRevert()` | `git revert --abort`. |
| `continueRevert()` | `git revert --continue` (after resolving conflicts). |
| `startRebase(onto, { allowConflict? })` | Rebase current branch onto a ref — conflicts leave mid-rebase by default. |
| `abortRebase()` | `git rebase --abort`. |
| `continueRebase()` | `git rebase --continue` (after resolving conflicts). |
| `startBisect({ bad, good })` | Begin a bisect at HEAD's midpoint. |
| `bisectStep(verdict)` | `'good'` / `'bad'` / `'skip'`. |
| `resetBisect()` | `git bisect reset`. |
| `resetTo({ target, mode? })` | `git reset --soft/mixed/hard <target>`. |

#### Submodules

| Atom | What it does |
|---|---|
| `addSubmodule({ path, branch?, setup })` | Builds a source repo from `setup` (a `Step` — any atom composes), clones it in as a submodule. |
| `pinSubmodule(path, sha)` | Move the parent's recorded pin for the submodule. |

#### Linked worktrees

| Atom | What it does |
|---|---|
| `addWorktree(path, { branch? \| checkout?, detach?, from? })` | `git worktree add`. |
| `removeWorktree(path, { force? })` | `git worktree remove`. |

#### Config

| Atom | What it does |
|---|---|
| `setConfig(key, value, { unset? })` | Local `git config <key> <value>`, or `--unset` when `unset: true`. |

#### Scoping (apply atoms to a different context)

| Atom | What it does |
|---|---|
| `onBranch(name, step)` | Switch to `name`, run `step`, restore the previous branch (even on throw). |
| `insideSubmodule(path, step)` | Run `step` against the submodule's working tree. Any atom composes inside. |
| `withAuthor({ name, email, date? }, step)` | Run `step` with `GIT_AUTHOR_*` / `GIT_COMMITTER_*` pinned. |
| `withRemoteTracking(remote, branch, step)` | Run `step` against a temporary clone, then fetch the resulting branch tip back into the parent as `refs/remotes/<remote>/<branch>`. Generates "upstream-only commits" without manual ref plumbing. |

#### Scenario definition

| Atom | What it does |
|---|---|
| `defineScenario({…})` | Validating wrapper for `Scenario` (kebab-case name, kind enum, non-empty fields). |
| `daysAgo(n)` | ISO timestamp at noon UTC N days before now. Pairs with the `date` option on commit atoms. |

#### Sparse checkout

| Atom | What it does |
|---|---|
| `enableSparseCheckout(paths, { cone? })` | Enable sparse checkout — only specified paths are checked out. |
| `disableSparseCheckout()` | Disable sparse checkout, restoring the full working tree. |

#### Shallow repo simulation

| Atom | What it does |
|---|---|
| `shallowAt(depth)` | Write `.git/shallow` to simulate a shallow clone at the given depth. |
| `unshallow()` | Remove the shallow boundary, restoring full history. |

#### Git notes

| Atom | What it does |
|---|---|
| `addNote(message, { ref?, namespace? })` | Add a note to a commit (overwrites existing). |
| `appendNote(message, { ref?, namespace? })` | Append to an existing note (or create). |
| `removeNote({ ref?, namespace? })` | Remove a note from a commit. |

#### Git hooks

| Atom | What it does |
|---|---|
| `installHook(name, script)` | Write an executable hook script to `.git/hooks/<name>`. |
| `removeHook(name)` | Remove a hook script. |

#### Working tree cleanup

| Atom | What it does |
|---|---|
| `gitClean({ directories?, force?, ignored? })` | `git clean -f` (force defaults to true). With `directories: true` adds `-d`; with `ignored: true` adds `-x`. |

#### Git meta files

| Atom | What it does |
|---|---|
| `writeGitignore(patterns)` | Convenience over `writeFiles`. Accepts a string array or pre-formatted string. Does NOT stage. |
| `writeGitattributes(rules)` | Same shape as `writeGitignore` but writes to `.gitattributes`. |

### Worked example: "out-of-date submodule"

A scenario shape that's hard with the imperative API but reads
declaratively with atoms — the parent's pinned commit is older than
the submodule's HEAD:

```ts
import { addCommit, addSubmodule, chain, defineScenario, insideSubmodule } from '@gfargo/git-scenarios'

export const outOfDateSubmoduleScenario = defineScenario({
  name: 'out-of-date-submodule',
  summary: 'parent pinned at submodule HEAD~2, three post-pin commits inside',
  description: '…',
  kind: 'submodule',
  setup: chain(
    addCommit({ message: 'init', files: { 'README.md': '# parent' } }),
    addSubmodule({
      path: 'vendor/lib',
      branch: 'main',
      setup: chain(
        addCommit({ message: 'init lib', files: { 'README.md': '# lib' } }),
      ),
    }),
    addCommit({ message: 'chore: pin submodule' }),

    // Make commits INSIDE the submodule without updating the parent's pin.
    insideSubmodule('vendor/lib', chain(
      addCommit({ message: 'feat: post-pin A', files: { 'src/a.ts': 'a' } }),
      addCommit({ message: 'feat: post-pin B', files: { 'src/b.ts': 'b' } }),
      addCommit({ message: 'feat: post-pin C', files: { 'src/c.ts': 'c' } }),
    )),
    // Parent's `.gitmodules` pin is unchanged; `git submodule status`
    // reports `+` modified.
  ),
})
```

### Worked example: multi-contributor history

```ts
import { addCommit, chain, daysAgo, withAuthor } from '@gfargo/git-scenarios'

await chain(
  addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
  withAuthor({ name: 'Alice', email: 'alice@example.com', date: daysAgo(10) },
    addCommit({ message: 'feat: alice work', files: { 'a.ts': 'x' } }),
  ),
  withAuthor({ name: 'Bob', email: 'bob@example.com', date: daysAgo(5) },
    addCommit({ message: 'fix: bob work', files: { 'b.ts': 'y' } }),
  ),
)(repo)
```

`git log` now shows commits by Alice (10 days ago) and Bob (5 days
ago) — useful for testing blame, PR-triage-by-author, contributor
stats.

### Worked example: multi-remote fork topology

```ts
import { addCommit, addRemote, chain } from '@gfargo/git-scenarios'

await chain(
  addCommit({ message: 'init', files: { 'README.md': '# fork' } }),
  addRemote('origin', 'git@github.com:fork/repo.git'),
  addRemote('upstream', 'git@github.com:source/repo.git'),
)(repo)
```

## Defining your own scenarios

Most projects want a few custom scenarios alongside the built-in
ones — repo shapes specific to your tool's domain (e.g. "monorepo
with two workspaces, one dirty"). Define them with `defineScenario`
and compose the setup from atoms:

```ts
// my-test-utils/scenarios/two-workspace-dirty.ts
import {
  addCommit,
  chain,
  defineScenario,
  stageFiles,
  switchToBranch,
  writeFiles,
} from '@gfargo/git-scenarios'

export const twoWorkspaceDirtyScenario = defineScenario({
  name: 'two-workspace-dirty',
  summary: 'monorepo w/ packages/app + packages/lib; lib is dirty',
  description: 'Two workspace packages on `main`; uncommitted edits in `packages/lib/src/foo.ts`.',
  kind: 'worktree',
  contracts: [
    'main has 2 commits',
    'packages/lib/src/foo.ts is unstaged',
  ],
  setup: chain(
    addCommit({
      message: 'chore: scaffold workspaces',
      files: {
        'package.json': JSON.stringify({ name: 'mono', workspaces: ['packages/*'] }, null, 2),
        'packages/app/package.json': '{ "name": "app" }',
        'packages/lib/package.json': '{ "name": "lib" }',
      },
    }),
    addCommit({
      message: 'feat: lib baseline',
      files: { 'packages/lib/src/foo.ts': 'export const foo = 1\n' },
    }),
    // Now make a worktree change without staging.
    writeFiles({ 'packages/lib/src/foo.ts': 'export const foo = 2\n' }),
  ),
})
```

Use it in a test directly (no registration needed):

```ts
import { createTempGitRepo } from '@gfargo/git-scenarios'
import { twoWorkspaceDirtyScenario } from './my-test-utils/scenarios/two-workspace-dirty'

describe('my-tool against dirty workspace', () => {
  it('detects the unstaged lib change', async () => {
    const repo = await createTempGitRepo()
    try {
      await twoWorkspaceDirtyScenario.setup(repo)
      // … exercise your tool against repo …
    } finally {
      await repo.cleanup()
    }
  })
})
```

Or register it so it works with `spinUpScenario` and the CLI:

```ts
import { registerScenario } from '@gfargo/git-scenarios'
import { twoWorkspaceDirtyScenario } from './my-test-utils/scenarios/two-workspace-dirty'

registerScenario(twoWorkspaceDirtyScenario)
// Now: spinUpScenario('two-workspace-dirty') works
// And: git-scenarios create two-workspace-dirty works
```

### The `Scenario` shape

```ts
type Scenario = {
  /** Stable identifier — kebab-case. */
  name: string
  /** One-line summary shown in CLI list output. */
  summary: string
  /** Multi-line description shown in CLI describe output. */
  description: string
  /** Filtering category. */
  kind: 'branch' | 'worktree' | 'operation' | 'history' | 'stash' | 'submodule'
  /** Optional tags for finer-grained filtering (e.g. ['conflict', 'merge']). */
  tags?: string[]
  /** Git-state factory — typically `chain(...)` of atoms. */
  setup: Step  // (repo: TempGitRepo) => Promise<void>
  /** Optional human-readable contract assertions. */
  contracts?: string[]
}
```

`defineScenario` validates the shape at module load time (kebab-case
name, kind enum, non-empty fields). Catches typos that would
otherwise blow up mid-test.

### Contributing a scenario to this package

If your custom scenario is generally useful (e.g. "stashed-with-untracked",
"rebase-mid-conflict"), open a PR against
[`gfargo/git-scenarios`](https://github.com/gfargo/git-scenarios) adding:

1. `src/scenarios/<kebab-name>.ts` exporting the scenario.
2. `<kebab-name>.test.ts` next to it, asserting each contract line.
3. Register in `src/scenarios/index.ts`.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full checklist.

## TypeScript support

The package is **TypeScript-first** — all public APIs ship with full
type declarations and source maps. Types you'll commonly reach for:

```ts
import type {
  AuthorIdentity,     // { name, email, date? } for withAuthor
  FileMap,            // { 'path': content } for writeFiles
  GitHookName,        // 'pre-commit' | 'commit-msg' | ... for installHook
  Scenario,           // the registered-scenario shape
  ScenarioKind,       // 'branch' | 'worktree' | 'operation' | 'history' | 'stash' | 'submodule'
  SeededFileSpec,     // { path, tokens, seedOffset? } for seededFiles
  Step,               // (repo: TempGitRepo) => Promise<void> — the atom contract
  TempGitRepo,        // { path, git, writeFile, commitAll, cleanup }
} from '@gfargo/git-scenarios'
```

Every atom returns a `Step`, so writing your own helpers feels
identical to using the built-in ones:

```ts
import { addCommit, chain, type Step } from '@gfargo/git-scenarios'

// Custom helper composed from atoms — still a Step
export function scaffoldMonorepo(workspaces: string[]): Step {
  return chain(
    addCommit({
      message: 'chore: scaffold workspaces',
      files: {
        'package.json': JSON.stringify({ workspaces }, null, 2),
        ...Object.fromEntries(
          workspaces.map((w) => [`${w}/package.json`, `{ "name": "${w.split('/').pop()}" }`]),
        ),
      },
    }),
  )
}

// Use it like any built-in atom
await chain(
  scaffoldMonorepo(['packages/app', 'packages/lib']),
  addCommit({ message: 'feat: first feature', files: { 'packages/app/src/index.ts': '…' } }),
)(repo)
```

The atom factory pattern (returning a `Step`) means custom helpers
compose cleanly into `chain(...)` alongside the built-ins.

## Debugging

### "What state did the scenario leave the repo in?"

```bash
# Spin up without --ephemeral (default) so the dir persists
npx git-scenarios create feature-pr-ready

# CLI prints the path; cd in and look around
cd /var/folders/.../git-scenarios-XXXXXX
git log --oneline
git status
git branch
```

### "My test fails — what does the repo look like at that point?"

Comment out `repo.cleanup()` temporarily, then re-run the test. The
temp dir survives the run; the failure message includes `repo.path`
when you log it:

```ts
afterAll(async () => {
  // await repo.cleanup()   // ← comment out to inspect
})

it('does the thing', async () => {
  // ...
  console.log('repo path:', repo.path)   // log so you can cd in
  // assertion that fails
})
```

After inspecting, restore `cleanup()` so subsequent runs don't
accumulate dirs.

### "How do I run just one scenario's test?"

```bash
# All scenario tests
npm test -- --testPathPatterns scenarios

# A specific scenario
npm test -- --testPathPatterns feature-pr-ready
```

### Mocking external services (LLM / network / hooks) in scenario-based tests

Scenarios set up the **git state**; mocks set up everything else.
The standard pattern is to use your test framework's mocking
primitives to replace the network / LLM / hook layer your tool
calls into:

```ts
// jest example: mock a workflow handler the tool routes through
jest.mock('../commands/changelog/handler')
const mockedHandler = jest.mocked(changelogHandler)
mockedHandler.mockImplementation(async () => {
  process.stdout.write('feat: my deterministic title\n\nbody here.')
})

const repo = await spinUpScenario('feature-pr-ready')
const result = await runChangelogTextWorkflow({ branch: 'main' })
expect(result.text).toContain('feat: my deterministic title')
```

Together (scenario + mock) the test becomes deterministic top to
bottom — same git state every run, same external response every run.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide on adding
atoms, scenarios, and tests. PRs welcome — open an issue at
[gfargo/git-scenarios](https://github.com/gfargo/git-scenarios/issues)
if you're unsure about the shape.
