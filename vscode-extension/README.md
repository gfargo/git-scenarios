# git-scenarios VS Code Extension

Spin up a real git scenario repo from the VS Code command palette — one keystroke to a sandbox.

## Commands

| Command | Title |
|---|---|
| `gitScenarios.create` | `git-scenarios: Create Scenario…` |
| `gitScenarios.cleanup` | `git-scenarios: Clean Up Scenario Directories` |

## Prerequisites

Run the root build before using the extension (the extension loads the library from `../dist`):

```sh
# From the repo root:
npm run build

# Then install the extension's own deps:
cd vscode-extension
npm ci
```

## Running in the Extension Development Host

1. Open the repo root in VS Code.
2. Press **F5** (or run **Debug: Start Debugging**) — this launches a new Extension Development Host window with the extension loaded.
3. In the new window, open the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:
   - **`git-scenarios: Create Scenario…`** — pick a scenario, wait for it to materialize, and a new VS Code window opens on the repo.
   - **`git-scenarios: Clean Up Scenario Directories`** — removes all tracked scenario dirs and clears the cache (prompts for confirmation).

### Building the extension bundle

```sh
cd vscode-extension
npm run build       # produces dist/extension.js
npm run watch       # rebuild on change
```

## Notes

- The extension is **not published to the VS Code Marketplace** — publishing is a human-run release step, matching the library's own release policy.
- The `@gfargo/git-scenarios` library is kept external in the esbuild bundle (not inlined) to avoid bundling optional native tree-sitter bindings. The extension's `node_modules` must be present at runtime (satisfied by `npm ci`).
- Scenario directories accumulate in `os.tmpdir()`. Use **Clean Up** periodically or rely on OS temp-dir sweeps.
- Large/history-heavy scenarios (e.g. `large-repo`, `rich-history-graph`) take longer to materialize — a progress notification is shown while they spin up.
