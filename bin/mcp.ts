#!/usr/bin/env node
/**
 * MCP server binary entry point for @gfargo/git-scenarios.
 *
 * Starts the git-scenarios MCP server on stdio transport.
 * Designed to be run via `npx -p @gfargo/git-scenarios git-scenarios-mcp`
 * (the `-p` selects this package so npx can resolve its `git-scenarios-mcp`
 * bin, rather than falling through to the package's default `git-scenarios`
 * bin), or referenced in an MCP client config as:
 *
 *   { "command": "npx", "args": ["-y", "-p", "@gfargo/git-scenarios", "git-scenarios-mcp"] }
 */

import { runMcpServer } from '../src/mcp'

runMcpServer().catch((err: unknown) => {
  process.stderr.write(`git-scenarios-mcp: fatal error: ${String(err)}\n`)
  process.exit(1)
})
