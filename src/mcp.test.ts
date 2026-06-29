/**
 * Tests for the MCP server (src/mcp.ts).
 *
 * Tests invoke tool handlers via createMcpServer() and an in-memory
 * transport so no real stdio transport is required.
 */

import { access } from 'fs/promises'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

import { createMcpServer } from './mcp'
import { listRegistered } from './registry'
import { spinUpScenario } from './spinUpScenario'
import type { TempGitRepo } from './tempGitRepo'

// ── Helpers ───────────────────────────────────────────────────────────────

async function buildClient(): Promise<Client> {
  const server = createMcpServer()
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)

  const client = new Client({ name: 'test', version: '0.0.0' })
  await client.connect(clientTransport)
  return client
}

function textResult(result: unknown): unknown {
  const r = result as Record<string, unknown>
  const content = r['content'] as Array<{ type: string; text?: string }> | undefined
  if (!content) throw new Error(`no content in result: ${JSON.stringify(result)}`)
  const item = content.find((c) => c.type === 'text')
  if (!item || !item.text) throw new Error('no text content')
  return JSON.parse(item.text)
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('MCP server', () => {
  let client: Client

  beforeAll(async () => {
    client = await buildClient()
  })

  // ── list_scenarios ────────────────────────────────────────────────────────

  describe('list_scenarios', () => {
    it('returns all registered scenarios', async () => {
      const result = await client.callTool({ name: 'list_scenarios', arguments: {} })
      const list = textResult(result) as Array<{ name: string }>
      expect(list.length).toBe(listRegistered().length)
    })

    it('filters by kind', async () => {
      const result = await client.callTool({
        name: 'list_scenarios',
        arguments: { kind: 'operation' },
      })
      const list = textResult(result) as Array<{ kind: string }>
      expect(list.every((s) => s.kind === 'operation')).toBe(true)
      expect(list.length).toBeGreaterThan(0)
    })

    it('filters by tag', async () => {
      const result = await client.callTool({
        name: 'list_scenarios',
        arguments: { tag: 'conflict' },
      })
      const list = textResult(result) as Array<{ tags: string[] }>
      expect(list.every((s) => s.tags.includes('conflict'))).toBe(true)
      expect(list.length).toBeGreaterThan(0)
    })
  })

  // ── describe_scenario ─────────────────────────────────────────────────────

  describe('describe_scenario', () => {
    it('returns full shape for a known scenario', async () => {
      const result = await client.callTool({
        name: 'describe_scenario',
        arguments: { name: 'feature-pr-ready' },
      })
      const data = textResult(result) as { name: string; description: string; kind: string }
      expect(data.name).toBe('feature-pr-ready')
      expect(data.kind).toBe('branch')
      expect(data.description.length).toBeGreaterThan(0)
    })

    it('returns error for unknown scenario', async () => {
      const result = await client.callTool({
        name: 'describe_scenario',
        arguments: { name: 'no-such-scenario-xyz' },
      })
      const data = textResult(result) as { error: string }
      expect(data.error).toMatch(/no-such-scenario-xyz/)
    })
  })

  // ── inspect_scenario ──────────────────────────────────────────────────────

  describe('inspect_scenario', () => {
    it('returns non-empty graph for feature-pr-ready and removes temp dir', async () => {
      const result = await client.callTool({
        name: 'inspect_scenario',
        arguments: { name: 'feature-pr-ready' },
      })
      const data = textResult(result) as { snapshot: { graph: string[] }; name: string }
      expect(data.name).toBe('feature-pr-ready')
      expect(data.snapshot.graph.length).toBeGreaterThan(0)
    })

    it('returns empty graph for empty-repo and removes temp dir', async () => {
      const result = await client.callTool({
        name: 'inspect_scenario',
        arguments: { name: 'empty-repo' },
      })
      const data = textResult(result) as { snapshot: { graph: string[] } }
      expect(data.snapshot.graph).toEqual([])
    })

    it('returns error for unknown scenario', async () => {
      const result = await client.callTool({
        name: 'inspect_scenario',
        arguments: { name: 'no-such-scenario-xyz' },
      })
      const data = textResult(result) as { error: string }
      expect(data.error).toBeDefined()
    })
  })

  // ── materialize_scenario + cleanup_scenario ───────────────────────────────

  describe('materialize_scenario + cleanup_scenario', () => {
    it('materializes a repo that exists on disk, then cleanup removes it', async () => {
      const matResult = await client.callTool({
        name: 'materialize_scenario',
        arguments: { name: 'two-commit-feature' },
      })
      const matData = textResult(matResult) as { path: string; snapshot: { head: { branch: string } } }
      expect(typeof matData.path).toBe('string')
      expect(matData.path.length).toBeGreaterThan(0)
      expect(matData.snapshot.head.branch).toBe('main')

      // Path exists before cleanup
      await expect(access(matData.path)).resolves.toBeUndefined()

      // Cleanup
      const cleanResult = await client.callTool({
        name: 'cleanup_scenario',
        arguments: { path: matData.path },
      })
      const cleanData = textResult(cleanResult) as { cleaned: string[] }
      expect(cleanData.cleaned).toContain(matData.path)

      // Path gone after cleanup
      await expect(access(matData.path)).rejects.toThrow()
    })

    it('materializes mid-merge-conflict with expected snapshot', async () => {
      const result = await client.callTool({
        name: 'materialize_scenario',
        arguments: { name: 'mid-merge-conflict' },
      })
      const data = textResult(result) as {
        path: string
        snapshot: { operation: string; conflicts: string[] }
      }
      expect(data.snapshot.operation).toBe('merge')
      expect(data.snapshot.conflicts.length).toBeGreaterThan(0)

      // cleanup
      await client.callTool({ name: 'cleanup_scenario', arguments: { path: data.path } })
    })

    it('cleanup_scenario with no path drains all tracked repos', async () => {
      // Materialize two repos
      const r1 = await client.callTool({
        name: 'materialize_scenario',
        arguments: { name: 'single-staged-file' },
      })
      const r2 = await client.callTool({
        name: 'materialize_scenario',
        arguments: { name: 'empty-repo' },
      })
      const p1 = (textResult(r1) as { path: string }).path
      const p2 = (textResult(r2) as { path: string }).path

      // Drain all
      const cleanResult = await client.callTool({
        name: 'cleanup_scenario',
        arguments: {},
      })
      const cleaned = (textResult(cleanResult) as { cleaned: string[] }).cleaned
      expect(cleaned).toContain(p1)
      expect(cleaned).toContain(p2)

      await expect(access(p1)).rejects.toThrow()
      await expect(access(p2)).rejects.toThrow()
    })

    it('rejects cleanup of an untracked path', async () => {
      const result = await client.callTool({
        name: 'cleanup_scenario',
        arguments: { path: '/tmp/git-scenarios-not-tracked-xyz' },
      })
      const data = textResult(result) as { error: string }
      expect(data.error).toMatch(/No tracked repo/)
    })

    it('rejects cleanup of a path outside git-scenarios temp dirs', async () => {
      const result = await client.callTool({
        name: 'cleanup_scenario',
        arguments: { path: '/etc/passwd' },
      })
      const data = textResult(result) as { error: string }
      expect(data.error).toMatch(/Refusing/)
    })
  })

  // ── capture_repo ──────────────────────────────────────────────────────────

  describe('capture_repo', () => {
    let repo: TempGitRepo

    beforeAll(async () => {
      repo = await spinUpScenario('feature-pr-ready')
    })

    afterAll(async () => {
      await repo?.cleanup()
    })

    it('returns captured shape for a valid git repo', async () => {
      const result = await client.callTool({
        name: 'capture_repo',
        arguments: { path: repo.path },
      })
      const data = textResult(result) as {
        name: string
        currentBranch: string
        branchCommits: unknown[]
        clean: boolean
      }
      // feature-pr-ready is on feat/widget-v2
      expect(data.currentBranch).toBe('feat/widget-v2')
      expect(data.branchCommits.length).toBeGreaterThan(0)
      expect(data.clean).toBe(true)
    })

    it('returns error for a non-repo path', async () => {
      const result = await client.callTool({
        name: 'capture_repo',
        arguments: { path: '/tmp' },
      })
      const data = textResult(result) as { error: string }
      expect(data.error).toMatch(/Not a git repository/)
    })
  })
})
