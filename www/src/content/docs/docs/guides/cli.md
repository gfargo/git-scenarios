---
title: CLI Reference
description: The git-scenarios command-line interface.
---

## Commands

### `git-scenarios list`

Show all scenarios grouped by kind.

```bash
npx git-scenarios list
```

### `git-scenarios describe <name>`

Print the full description and contract assertions for a scenario.

```bash
npx git-scenarios describe mid-merge-conflict
```

### `git-scenarios create <name> [options]`

Materialize a scenario on disk.

```bash
npx git-scenarios create feature-pr-ready
npx git-scenarios create mid-merge-conflict --run "lazygit"
npx git-scenarios create rich-history-graph --path ~/sandbox/test-repo
```

## Flags

| Flag | Behavior |
|---|---|
| `--path <dir>` | Materialize at `<dir>` instead of a temp directory. |
| `--run <cmd>` | Launch `<cmd>` against the scenario dir after creation. Shell-style argument splitting. |
| `--remote <url>` | Add `origin` pointing at `<url>` before launching. |
| `--ephemeral` | Auto-clean the temp dir on exit. Without this, the dir persists. |

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
```

## Cleanup

Without `--ephemeral`, scenarios persist. The CLI prints a cleanup hint:

```
✓ Scenario "feature-pr-ready" ready at:
    /var/folders/.../coco-git-test-xR2qwz

When you're done, clean up with:
    rm -rf /var/folders/.../coco-git-test-xR2qwz
```

Periodically clean accumulated temp dirs:

```bash
rm -rf $(ls -d /tmp/coco-git-test-* 2>/dev/null)
```
