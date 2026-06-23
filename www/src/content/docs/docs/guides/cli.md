---
title: CLI Reference
description: The git-scenarios command-line interface.
---

## Commands

### `git-scenarios list`

Show all scenarios grouped by kind. Filterable by kind, tag, or both.

```bash
npx git-scenarios list                                  # all scenarios
npx git-scenarios list --kind operation                 # only operation scenarios
npx git-scenarios list --tag conflict                   # only tagged 'conflict'
npx git-scenarios list --kind stash --tag untracked     # AND filter
npx git-scenarios list --json                           # machine-readable
```

### `git-scenarios describe <name>`

Print the full description and contract assertions for a scenario.

```bash
npx git-scenarios describe mid-merge-conflict
npx git-scenarios describe mid-merge-conflict --json    # machine-readable
```

### `git-scenarios inspect <name>`

See a scenario's shape without keeping it on disk. `inspect` materializes the scenario in a throwaway temp repo, prints its commit graph, branches, and working-tree status, then cleans up. It's the read-only counterpart to `create` — perfect for picking the right scenario before you wire it into a test.

```bash
npx git-scenarios inspect feature-pr-ready
npx git-scenarios inspect mid-merge-conflict --json    # machine-readable
```

Example output:

```
  feature-pr-ready  ·  branch
  ---------------------------
  feature branch with 4 commits, clean worktree, ready to open a PR

  Commit graph:
    * 0d92e8f (HEAD -> feat/widget-v2) docs: document widget-v2 API and migration path
    * 7e06c32 test: cover widget-v2 happy path and edge cases
    * 4a4ba62 feat: expose widget-v2 from public index
    * 7ef2a30 feat: add widget-v2 entry point and types
    * 8f8c1d3 (main) test: add baseline widget tests
    * 3377978 feat: scaffold widget module
    * 51d305e chore: initial commit

  Branches:
    * feat/widget-v2
      main

  Status (git status -sb):
    ## feat/widget-v2

  Contracts:
    - main has 3 commits
    - feat/widget-v2 is checked out
    - feat/widget-v2 is 4 commits ahead of main
    - worktree is clean
```

### `git-scenarios create <name> [options]`

Materialize a scenario on disk.

```bash
npx git-scenarios create feature-pr-ready
npx git-scenarios create mid-merge-conflict --run "lazygit"
npx git-scenarios create rich-history-graph --path ~/sandbox/test-repo
```

### `git-scenarios capture [path] [options]`

Snapshot a **real** repository's shape into a reusable scenario module. Hit a bug against a repo in some peculiar state? Instead of hand-writing a scenario to reproduce it, point `capture` at the repo (default: the current directory) and get a ready-to-edit `defineScenario(...)` module on stdout.

```bash
# Capture the current repo into a scenario file
npx git-scenarios capture . --name my-bug-repro > scenarios/my-bug.ts

# Capture another repo, give it a summary, write to a file
npx git-scenarios capture ~/work/widgets --name widgets-mid-feature \
  --summary "widgets repo mid-feature, 3 staged files" \
  --out scenarios/widgets.ts

# Structured shape instead of a module (file contents omitted)
npx git-scenarios capture . --json
```

`capture` is **read-only** against the target repo — it runs git plumbing and reads working-tree files, and never writes to the repo.

**What it reproduces faithfully:**

- the current branch (and whether `HEAD` is detached)
- the commit-graph shape — base-branch commits plus the commits your branch is ahead by (e.g. "4 commits ahead of `main`"), with each commit's message and author date preserved
- the working tree's dirty state — which paths are staged, modified, or untracked, with their current content (size-capped at 4 KB, binary files skipped)

**What it deliberately does _not_ reproduce:**

- exact commit hashes — the library's whole point is fresh, deterministic hashes
- historical file contents — placeholders are emitted so each commit is non-empty and the count matches
- merge topology and the contents of non-current branches — surfaced as a comment for you to fill in

The output is a **starting point you edit**, not a byte-perfect clone. Register the result with `registerScenario(...)` and it works everywhere the built-ins do.

:::caution
`capture` reads the content of changed/untracked files into the generated module so the dirty state reproduces faithfully. If your working tree contains secrets, review the output before committing it — or use `--json`, which omits file contents.
:::

The same logic is available programmatically from the `@gfargo/git-scenarios/capture` subpath for tool authors who want to build on it: `gatherRepoState(git, cwd)`, `renderScenarioModule(state, opts)`, `captureToJson(state, name)`, `deriveContracts(state)`, and `normalizeName(raw)`.

### `git-scenarios clean [options]`

Find and remove stale scenario temp directories from your system's temp folder.

```bash
# Remove all stale scenario dirs
npx git-scenarios clean

# Preview what would be removed (no deletion)
npx git-scenarios clean --dry-run

# Only remove dirs older than 24 hours
npx git-scenarios clean --older-than 24
```

## Flags

### List flags

| Flag | Behavior |
|---|---|
| `--kind <kind>` | Filter by scenario kind: `branch`, `worktree`, `operation`, `history`, `stash`, `submodule`. |
| `--tag <tag>` | Filter by tag inclusion (e.g. `conflict`, `dirty`, `upstream`). Combine with `--kind` (AND semantics). |
| `--json` | Emit machine-readable JSON. Each entry includes `name`, `summary`, `kind`, `tags`, `contracts`. |

### Describe flags

| Flag | Behavior |
|---|---|
| `--json` | Emit machine-readable JSON. Includes `description` (the full multi-line text) plus everything in the list output. |

### Inspect flags

| Flag | Behavior |
|---|---|
| `--json` | Emit machine-readable JSON: `name`, `kind`, `graph` (array of lines), `branches` (array), `status` (array of `git status -sb` lines), `contracts`. |

### Create flags

| Flag | Behavior |
|---|---|
| `--path <dir>` | Materialize at `<dir>` instead of a temp directory. |
| `--run <cmd>` | Launch `<cmd>` against the scenario dir after creation. Shell-style argument splitting. |
| `--remote <url>` | Add `origin` pointing at `<url>` before launching. |
| `--ephemeral` | Auto-clean the temp dir on exit. Without this, the dir persists. |

### Capture flags

| Flag | Behavior |
|---|---|
| `--name <name>` | Scenario name (kebab-cased). Defaults to the captured repo's directory name. |
| `--summary <s>` | One-line summary for the generated scenario. |
| `--kind <kind>` | Override the inferred kind (`branch`, `worktree`, etc.). Inference: dirty worktree → `worktree`, otherwise `branch`. |
| `--out <file>` | Write the generated module to `<file>` instead of stdout. |
| `--json` | Emit the structured capture shape instead of a TypeScript module. File contents are omitted. |

### Clean flags

| Flag | Behavior |
|---|---|
| `--dry-run` | List stale dirs without deleting them. |
| `--older-than <hours>` | Only remove dirs older than N hours (default: 0 = all). |

## Examples

```bash
# Launch lazygit against a merge conflict
npx git-scenarios create mid-merge-conflict --run "lazygit"

# Open VS Code against a dirty worktree
npx git-scenarios create dirty-many-files --run "code -n"

# Test your own tool
npx git-scenarios create feature-pr-ready --run "my-tool --debug"

# Add a remote for gh-aware tools
npx git-scenarios create feature-pr-ready \
  --run "gh pr create" \
  --remote git@github.com:org/repo.git

# Clean up old scenarios (older than 2 hours)
npx git-scenarios clean --older-than 2

# Pipe scenario metadata into another tool
npx git-scenarios list --json | jq '.[] | select(.kind == "operation")'
npx git-scenarios describe partial-stage --json | jq -r '.contracts[]'
```

## JSON output schemas

### `list --json`

```json
[
  {
    "name": "feature-pr-ready",
    "summary": "feature branch with 4 commits, clean worktree, ready to open a PR",
    "kind": "branch",
    "tags": ["feature-branch", "pr-ready", "clean", "ahead"],
    "contracts": [
      "main has 3 commits",
      "feat/widget-v2 is checked out",
      "feat/widget-v2 is 4 commits ahead of main",
      "worktree is clean"
    ]
  }
]
```

### `describe --json`

```json
{
  "name": "feature-pr-ready",
  "summary": "...",
  "description": "A feature branch ready to be PR'd. ...",
  "kind": "branch",
  "tags": ["feature-branch", "pr-ready", "clean", "ahead"],
  "contracts": ["..."]
}
```

### `inspect --json`

```json
{
  "name": "feature-pr-ready",
  "kind": "branch",
  "graph": [
    "* c477604 (HEAD -> feat/widget-v2) docs: document widget-v2 API and migration path",
    "* 773c76b (main) test: add baseline widget tests"
  ],
  "branches": ["* feat/widget-v2", "main"],
  "status": ["## feat/widget-v2"],
  "contracts": ["main has 3 commits", "..."]
}
```

For empty repos (no commits yet) `graph` is an empty array — the call still succeeds.

### `capture --json`

```json
{
  "name": "my-bug-repro",
  "currentBranch": "feat/widget-v2",
  "detached": false,
  "baseBranch": "main",
  "baseCommits": [{ "message": "chore: initial commit", "date": "2026-05-01T12:00:00Z" }],
  "branchCommits": [{ "message": "feat: add widget-v2", "date": "2026-05-02T12:00:00Z" }],
  "localBranches": ["main", "feat/widget-v2"],
  "remotes": [{ "name": "origin", "url": "git@github.com:org/repo.git" }],
  "changes": [{ "path": "src/x.ts", "staged": true, "untracked": false }],
  "clean": false,
  "contracts": ["feat/widget-v2 is checked out", "main has 1 commits"]
}
```

File **contents** are intentionally omitted from JSON output (they're only in the rendered module).

Errors come back on stderr as `{ "error": "..." }`.

## Cleanup strategies

There are three ways to handle cleanup depending on your use case:

### 1. Programmatic tests — automatic via `cleanup()`

In tests, always call `repo.cleanup()` in your teardown. The Jest/Vitest adapter handles this automatically:

```ts
// Manual approach
afterAll(async () => {
  await repo.cleanup()
})

// Adapter — cleanup is automatic
describeWithScenario('feature-pr-ready', (getRepo) => {
  // No cleanup needed — handled for you
})
```

### 2. Auto-cleanup on process exit

Pass `{ autoCleanup: true }` to `spinUpScenario` (or `createTempGitRepo()`) for a safety net that cleans up when the process exits, even if you forget to call `cleanup()`:

```ts
const repo = await spinUpScenario('feature-pr-ready', { autoCleanup: true })
// If the process exits without calling repo.cleanup(),
// the temp dir is removed automatically via a process exit hook.
```

This is a safety net, not a replacement for explicit cleanup. Always call `cleanup()` when you can — the exit hook uses synchronous `rmSync` which may not complete for very large repos.

### 3. CLI — `--ephemeral` or `clean`

For manual testing via the CLI:

- **`--ephemeral`** — auto-removes the scenario dir when the launched tool exits
- **`git-scenarios clean`** — batch-removes accumulated dirs from `/tmp`

```bash
# One-shot: auto-clean when lazygit quits
npx git-scenarios create mid-merge-conflict --run "lazygit" --ephemeral

# Periodic cleanup of accumulated dirs
npx git-scenarios clean --older-than 1
```

### When dirs accumulate

Without `--ephemeral`, `create` persists the scenario dir so you can re-inspect after the tool quits. Over time these accumulate in your temp folder. The `clean` command handles this:

```bash
# See what's there
npx git-scenarios clean --dry-run

# Remove everything
npx git-scenarios clean

# Remove only old ones
npx git-scenarios clean --older-than 24
```

The CLI prints the path and a cleanup hint after every `create`:

```
✓ Scenario "feature-pr-ready" ready at:
    /var/folders/.../git-scenarios-xR2qwz

When you're done, clean up with:
    rm -rf /var/folders/.../git-scenarios-xR2qwz
```
