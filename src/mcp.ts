/**
 * MCP (Model Context Protocol) server for @gfargo/git-scenarios.
 *
 * Exposes the scenario catalogue and materialization logic as MCP tools
 * so AI coding agents can request real git repo states on demand.
 *
 * Tools:
 *   list_scenarios        — list registered scenarios (with optional kind/tag filter)
 *   describe_scenario     — full description + contracts for one scenario
 *   inspect_scenario      — spin up, snapshot, clean up (read-only; leaves nothing on disk)
 *   materialize_scenario  — spin up and persist; returns path + snapshot
 *   capture_repo          — capture the shape of a real repo (read-only)
 *   cleanup_scenario      — clean up a previously materialized repo
 *
 * stdio transport — run via `git-scenarios-mcp` (see bin/mcp.ts).
 */

import { existsSync, rmSync } from 'fs'
import { basename } from 'path'
import { simpleGit } from 'simple-git'
import { z } from 'zod'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { gatherRepoState, captureToJson } from './capture'
import { ScenarioNotFoundError } from './errors'
import { findRegisteredByTag, listRegistered } from './registry'
import { resolveScenario } from './resolveScenario'
import { snapshotRepo } from './snapshot'
import { addRemote } from './atoms/remotes'
import { createTempGitRepo } from './tempGitRepo'
import type { TempGitRepo } from './tempGitRepo'

// ── In-process tracker for materialized repos ──────────────────────────────
// Maps the repo path → TempGitRepo handle so cleanup_scenario can find them.
const materializedRepos = new Map<string, TempGitRepo>()

// Safety-net: clean up all tracked repos on process exit.
process.on('exit', () => {
  for (const [p] of materializedRepos) {
    try {
      rmSync(p, { recursive: true, force: true })
    } catch {
      // best-effort
    }
  }
})

// ── Helpers ─────────────────────────────────────────────────────────────────

function isTempScenarioPath(p: string): boolean {
  // Accept paths whose last segment starts with 'git-scenarios-'.
  // This covers /tmp/git-scenarios-XXXX (macOS /tmp symlink) and
  // /var/folders/.../git-scenarios-XXXX (macOS os.tmpdir) alike.
  const segment = basename(p)
  return segment.startsWith('git-scenarios-')
}

// ── Server factory ──────────────────────────────────────────────────────────

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'git-scenarios',
    version: '1.1.0',
  })

  // ── list_scenarios ────────────────────────────────────────────────────────
  server.tool(
    'list_scenarios',
    'List all registered git scenarios. Optionally filter by kind and/or tag.',
    {
      kind: z
        .enum(['branch', 'worktree', 'operation', 'history', 'stash', 'submodule'])
        .optional()
        .describe('Filter to a specific scenario kind.'),
      tag: z.string().optional().describe('Filter to scenarios that include this tag.'),
    },
    async ({ kind, tag }) => {
      let scenarios = listRegistered()

      if (tag) {
        const byTag = findRegisteredByTag([tag])
        const byTagNames = new Set(byTag.map((s) => s.name))
        scenarios = scenarios.filter((s) => byTagNames.has(s.name))
      }

      if (kind) {
        scenarios = scenarios.filter((s) => s.kind === kind)
      }

      const result = scenarios.map((s) => ({
        name: s.name,
        summary: s.summary,
        kind: s.kind,
        tags: s.tags ?? [],
        contracts: s.contracts ?? [],
      }))

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    },
  )

  // ── describe_scenario ─────────────────────────────────────────────────────
  server.tool(
    'describe_scenario',
    'Get the full description and contracts for a single scenario by name.',
    {
      name: z.string().describe('The scenario name (kebab-case, e.g. "mid-merge-conflict").'),
    },
    async ({ name }) => {
      let scenario
      try {
        scenario = resolveScenario(name, 'describe_scenario')
      } catch (err) {
        if (err instanceof ScenarioNotFoundError) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }],
            isError: true,
          }
        }
        throw err
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                name: scenario.name,
                summary: scenario.summary,
                description: scenario.description,
                kind: scenario.kind,
                tags: scenario.tags ?? [],
                contracts: scenario.contracts ?? [],
              },
              null,
              2,
            ),
          },
        ],
      }
    },
  )

  // ── inspect_scenario ──────────────────────────────────────────────────────
  server.tool(
    'inspect_scenario',
    'Spin up a scenario into a temporary repo, capture its full snapshot, then clean up. Read-only — leaves nothing on disk.',
    {
      name: z.string().describe('The scenario name to inspect.'),
    },
    async ({ name }) => {
      let scenario
      try {
        scenario = resolveScenario(name, 'inspect_scenario')
      } catch (err) {
        if (err instanceof ScenarioNotFoundError) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: (err as Error).message }) }],
            isError: true,
          }
        }
        throw err
      }

      const repo = await createTempGitRepo()
      try {
        await scenario.setup(repo)
        const snapshot = await snapshotRepo(repo.git)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  name: scenario.name,
                  kind: scenario.kind,
                  contracts: scenario.contracts ?? [],
                  snapshot,
                },
                null,
                2,
              ),
            },
          ],
        }
      } finally {
        await repo.cleanup()
      }
    },
  )

  // ── materialize_scenario ──────────────────────────────────────────────────
  server.tool(
    'materialize_scenario',
    'Spin up a scenario into a persistent temporary directory. Returns the path and a snapshot. Call cleanup_scenario when done.',
    {
      name: z.string().describe('The scenario name to materialize.'),
      remote: z
        .string()
        .optional()
        .describe('If set, adds this URL as the "origin" remote after setup.'),
    },
    async ({ name, remote }) => {
      let scenario
      try {
        scenario = resolveScenario(name, 'materialize_scenario')
      } catch (err) {
        if (err instanceof ScenarioNotFoundError) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: (err as Error).message }) }],
            isError: true,
          }
        }
        throw err
      }

      const repo = await createTempGitRepo()
      try {
        await scenario.setup(repo)
        if (remote) {
          await addRemote('origin', remote)(repo)
        }
        const snapshot = await snapshotRepo(repo.git)
        materializedRepos.set(repo.path, repo)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ path: repo.path, snapshot }, null, 2),
            },
          ],
        }
      } catch (err) {
        await repo.cleanup()
        throw err
      }
    },
  )

  // ── capture_repo ──────────────────────────────────────────────────────────
  server.tool(
    'capture_repo',
    'Capture the shape of a real git repository on disk (read-only). Returns the captured state as JSON.',
    {
      path: z.string().describe('Absolute path to the git repository to capture.'),
      name: z
        .string()
        .optional()
        .describe('Scenario name for the captured output. Defaults to the directory name.'),
      kind: z
        .enum(['branch', 'worktree', 'operation', 'history', 'stash', 'submodule'])
        .optional()
        .describe('Override the inferred scenario kind.'),
    },
    async ({ path: repoPath, name, kind }) => {
      // simple-git's constructor throws synchronously on a non-existent
      // directory (e.g. Windows has no `/tmp`), so guard before constructing.
      const notARepo = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ error: `Not a git repository: ${repoPath}` }),
          },
        ],
        isError: true,
      }
      if (!existsSync(repoPath)) {
        return notARepo
      }

      const git = simpleGit(repoPath)
      let isRepo = false
      try {
        isRepo = await git.checkIsRepo()
      } catch {
        isRepo = false
      }
      if (!isRepo) {
        return notARepo
      }

      const defaultName = basename(repoPath) || 'captured'
      const scenarioName = name ?? defaultName

      const state = await gatherRepoState(git, repoPath)
      const captured = captureToJson(state, scenarioName)

      if (kind) {
        // Attach the overridden kind to the output object
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ ...captured, kind }, null, 2),
            },
          ],
        }
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(captured, null, 2) }],
      }
    },
  )

  // ── cleanup_scenario ──────────────────────────────────────────────────────
  server.tool(
    'cleanup_scenario',
    'Clean up a previously materialized scenario repo. Omit path to clean up ALL tracked repos.',
    {
      path: z
        .string()
        .optional()
        .describe(
          'Absolute path returned by materialize_scenario. Omit to clean up all tracked repos.',
        ),
    },
    async ({ path: repoPath }) => {
      if (repoPath) {
        if (!isTempScenarioPath(repoPath)) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Refusing to clean up path outside of git-scenarios temp dirs: ${repoPath}`,
                }),
              },
            ],
            isError: true,
          }
        }

        const repo = materializedRepos.get(repoPath)
        if (!repo) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `No tracked repo at path: ${repoPath}` }),
              },
            ],
            isError: true,
          }
        }

        await repo.cleanup()
        materializedRepos.delete(repoPath)

        return {
          content: [{ type: 'text', text: JSON.stringify({ cleaned: [repoPath] }) }],
        }
      }

      // No path: drain all tracked repos.
      const cleaned: string[] = []
      for (const [p, repo] of materializedRepos) {
        await repo.cleanup()
        cleaned.push(p)
      }
      materializedRepos.clear()

      return {
        content: [{ type: 'text', text: JSON.stringify({ cleaned }) }],
      }
    },
  )

  return server
}

// ── stdio runner ─────────────────────────────────────────────────────────────

export async function runMcpServer(): Promise<void> {
  const server = createMcpServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
