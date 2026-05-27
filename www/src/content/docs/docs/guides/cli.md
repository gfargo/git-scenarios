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

### `git-scenarios create <name> [options]`

Materialize a scenario on disk.

```bash
npx git-scenarios create feature-pr-ready
npx git-scenarios create mid-merge-conflict --run "lazygit"
npx git-scenarios create rich-history-graph --path ~/sandbox/test-repo
```

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

### Create flags

| Flag | Behavior |
|---|---|
| `--path <dir>` | Materialize at `<dir>` instead of a temp directory. |
| `--run <cmd>` | Launch `<cmd>` against the scenario dir after creation. Shell-style argument splitting. |
| `--remote <url>` | Add `origin` pointing at `<url>` before launching. |
| `--ephemeral` | Auto-clean the temp dir on exit. Without this, the dir persists. |

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
    /var/folders/.../coco-git-test-xR2qwz

When you're done, clean up with:
    rm -rf /var/folders/.../coco-git-test-xR2qwz
```
