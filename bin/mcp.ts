#!/usr/bin/env node
/**
 * MCP server binary entry point for @gfargo/git-scenarios.
 *
 * Starts the git-scenarios MCP server on stdio transport.
 * Designed to be run via `npx @gfargo/git-scenarios git-scenarios-mcp`
 * or referenced in an MCP client config as:
 *
 *   { "command": "npx", "args": ["-y", "@gfargo/git-scenarios", "git-scenarios-mcp"] }
 */

import { runMcpServer } from '../src/mcp'

runMcpServer().catch((err: unknown) => {
  process.stderr.write(`git-scenarios-mcp: fatal error: ${String(err)}\n`)
  process.exit(1)
})
