---
title: VS Code Extension
description: Spin up git scenarios from the VS Code command palette.
---

The `git-scenarios` VS Code extension lets you materialize any scenario directly from the command palette — one keystroke to a sandbox repo open in a new window.

## Installation

The extension is not yet published to the VS Code Marketplace. To use it, run it from source via the Extension Development Host:

1. Clone the repo and build the library:

```bash
git clone https://github.com/gfargo/git-scenarios.git
cd git-scenarios
npm install && npm run build
```

2. Install the extension's dependencies:

```bash
cd vscode-extension
npm ci
npm run build
```

3. Open the repo root in VS Code and press **F5** (or **Debug: Start Debugging**). This launches an Extension Development Host window with the extension loaded.

## Commands

| Command | Palette title |
|---|---|
| `gitScenarios.create` | **git-scenarios: Create Scenario…** |
| `gitScenarios.cleanup` | **git-scenarios: Clean Up Scenario Directories** |

### Create Scenario

Opens a quick-pick list of all registered scenarios showing name, kind, and summary. Select one and the extension:

1. Materializes the scenario in a temp directory (with a progress notification)
2. Tracks the path for later cleanup
3. Opens the repo in a new VS Code window

### Clean Up Scenario Directories

Removes all tracked scenario directories plus any orphaned `git-scenarios-*` or `coco-git-test-*` directories found in your system's temp folder. Prompts for confirmation before deletion. Also clears the scenario cache.

## Tips

- **Large scenarios** (e.g. `large-repo`, `rich-history-graph`) take longer to materialize — the progress notification keeps you informed.
- **Scenario dirs accumulate** in your temp folder. Run the cleanup command periodically, or rely on OS temp-dir sweeps.
- The extension uses the library's content-addressed cache, so repeated materializations of the same scenario are near-instant after the first run.

## Security

The cleanup command validates every path before deletion — it only removes directories that:
- Reside directly under your system's temp directory
- Have a basename matching a known scenario prefix (`git-scenarios-*` or `coco-git-test-*`)

This prevents accidental deletion of unrelated directories even if the extension's internal tracking state is corrupted.

## Relationship to the CLI

The extension provides the same core functionality as `git-scenarios create <name>` but integrated into the VS Code workflow:

| Feature | CLI | VS Code Extension |
|---|---|---|
| Browse scenarios | `list`, `describe`, `inspect` | Quick-pick with fuzzy search |
| Materialize | `create <name>` | "Create Scenario…" command |
| Open in editor | `--run "code -n"` | Automatic (new window) |
| Cleanup | `clean` | "Clean Up" command |

Both use the same underlying library and produce identical repo states.
