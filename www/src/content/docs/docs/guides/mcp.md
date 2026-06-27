---
title: MCP Server
description: Expose git-scenarios to AI coding agents via the Model Context Protocol
---

# MCP Server

`@gfargo/git-scenarios` ships a built-in [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server so AI coding agents can request real git repo states on demand — the same 40+ scenarios available in tests and the CLI, now accessible as MCP tools.

## Quick start

Run the server directly with `npx`:

```bash
npx -y @gfargo/git-scenarios git-scenarios-mcp
```

The server communicates on **stdio** (the standard MCP transport for local tools).

## Agent configuration

### Claude Desktop / Claude Code

Add to your MCP client config (e.g. `~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "git-scenarios": {
      "command": "npx",
      "args": ["-y", "@gfargo/git-scenarios", "git-scenarios-mcp"]
    }
  }
}
```

### VS Code (Copilot / Continue)

```json
{
  "mcp": {
    "servers": {
      "git-scenarios": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@gfargo/git-scenarios", "git-scenarios-mcp"]
      }
    }
  }
}
```

### Generic stdio MCP client

```json
{
  "command": "npx",
  "args": ["-y", "@gfargo/git-scenarios", "git-scenarios-mcp"],
  "transport": "stdio"
}
```

## Available tools

### `list_scenarios`

List all registered scenarios. Optionally filter by kind or tag.

**Parameters**

| Name   | Type   | Description |
|--------|--------|-------------|
| `kind` | string | Filter by scenario kind: `branch`, `worktree`, `operation`, `history`, `stash`, `submodule` |
| `tag`  | string | Filter to scenarios that include this tag (e.g. `conflict`) |

**Example prompt:** *"List all operation scenarios that involve a conflict."*

---

### `describe_scenario`

Get the full description and contract assertions for a single scenario.

**Parameters**

| Name   | Type   | Description |
|--------|--------|-------------|
| `name` | string | The scenario name, e.g. `mid-merge-conflict` |

---

### `inspect_scenario`

Spin up a scenario into a temporary repo, capture its full snapshot, then automatically clean up. Nothing is left on disk.

**Parameters**

| Name   | Type   | Description |
|--------|--------|-------------|
| `name` | string | The scenario name |

Returns a `snapshot` containing HEAD, branches, status, operation, conflicts, stashes, and the commit graph.

**Example prompt:** *"What does the git status look like for `mid-merge-conflict`?"*

---

### `materialize_scenario`

Spin up a scenario and **persist** it on disk. Returns the filesystem path and a snapshot. Call `cleanup_scenario` when done.

**Parameters**

| Name     | Type   | Description |
|----------|--------|-------------|
| `name`   | string | The scenario name |
| `remote` | string | (optional) URL to register as the `origin` remote |

**Example prompt:** *"Give me a `feature-pr-ready` repo I can run my tool against. Add `git@github.com:org/repo.git` as the origin."*

---

### `capture_repo`

Capture the shape of a **real git repository** on disk (read-only). Returns the same JSON structure as `git-scenarios capture --json`.

**Parameters**

| Name   | Type   | Description |
|--------|--------|-------------|
| `path` | string | Absolute path to the git repository |
| `name` | string | (optional) Name for the captured scenario |
| `kind` | string | (optional) Override the inferred scenario kind |

**Example prompt:** *"Capture the shape of my repo at `/home/me/projects/myapp` so I can reproduce this state in tests."*

---

### `cleanup_scenario`

Clean up a previously materialized repo. Omit `path` to drain all tracked repos.

**Parameters**

| Name   | Type   | Description |
|--------|--------|-------------|
| `path` | string | (optional) Path returned by `materialize_scenario`. Omit to clean all. |

Only paths created by `materialize_scenario` can be cleaned — the server refuses to remove arbitrary paths.

## Programmatic usage

If you want to embed the MCP server in another Node process:

```ts
import { createMcpServer, runMcpServer } from '@gfargo/git-scenarios/mcp'

// Option 1: run on stdio (the normal case)
await runMcpServer()

// Option 2: get the McpServer instance and wire your own transport
const server = createMcpServer()
```

## Lifecycle & cleanup

- Repos created by `materialize_scenario` are tracked in memory.
- `cleanup_scenario` removes them explicitly.
- On process exit (including crashes), all tracked repos are cleaned up automatically via a `process.on('exit')` safety net.
- `inspect_scenario` never leaves anything on disk.
