/**
 * End-to-end tests that actually run the CLI binary as a child
 * process. These exercise the parseArgs / printHelp / commandList /
 * commandDescribe / commandClean code paths that the unit-style
 * tests in cli.test.ts don't cover.
 *
 * Tests run against the BUILT cli (dist/bin/cli.cjs) so they exercise
 * the published shape. If `dist/` doesn't exist, the suite skips —
 * useful when running `jest --testPathPattern` against unbuilt
 * source during development.
 */

import { spawnSync } from 'child_process'
import { existsSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI = join(__dirname, '..', 'dist', 'bin', 'cli.cjs')
const HAS_BUILD = existsSync(CLI)

function runCLI(args: string[]): { stdout: string; stderr: string; status: number } {
  // spawnSync drains the child's pipes correctly even for large outputs
  // (`list --json` runs ~50KB at 32 scenarios). execFileSync truncates
  // at the pipe buffer (~8KB) on some platforms.
  const result = spawnSync('node', [CLI, ...args], {
    encoding: 'utf-8',
    timeout: 30_000,
    maxBuffer: 10 * 1024 * 1024,
  })
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? 1,
  }
}

;(HAS_BUILD ? describe : describe.skip)('CLI — end-to-end', () => {
  describe('list', () => {
    it('prints scenarios grouped by kind', () => {
      const { stdout, status } = runCLI(['list'])
      expect(status).toBe(0)
      expect(stdout).toContain('feature-pr-ready')
      expect(stdout).toContain('mid-merge-conflict')
      // Kind headers
      expect(stdout).toContain('branch:')
      expect(stdout).toContain('operation:')
    })

    it('--json emits machine-readable output', () => {
      const { stdout, status } = runCLI(['list', '--json'])
      expect(status).toBe(0)
      const data = JSON.parse(stdout)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(20)
      const first = data[0]
      expect(first).toHaveProperty('name')
      expect(first).toHaveProperty('kind')
      expect(first).toHaveProperty('tags')
    })

    it('--kind filter narrows results', () => {
      const { stdout, status } = runCLI(['list', '--kind', 'operation', '--json'])
      expect(status).toBe(0)
      const data = JSON.parse(stdout)
      expect(data.length).toBeGreaterThanOrEqual(5)
      for (const s of data) {
        expect(s.kind).toBe('operation')
      }
    })

    it('--tag filter narrows results', () => {
      const { stdout, status } = runCLI(['list', '--tag', 'conflict', '--json'])
      expect(status).toBe(0)
      const data = JSON.parse(stdout)
      expect(data.length).toBeGreaterThanOrEqual(4)
      for (const s of data) {
        expect(s.tags).toContain('conflict')
      }
    })

    it('--kind + --tag combine (AND)', () => {
      const { stdout, status } = runCLI(['list', '--kind', 'stash', '--tag', 'untracked', '--json'])
      expect(status).toBe(0)
      const data = JSON.parse(stdout)
      expect(data.length).toBe(1)
      expect(data[0].name).toBe('stash-with-untracked')
    })
  })

  describe('describe', () => {
    it('prints one scenario in human format', () => {
      const { stdout, status } = runCLI(['describe', 'feature-pr-ready'])
      expect(status).toBe(0)
      expect(stdout).toContain('feature-pr-ready')
      expect(stdout).toContain('Summary:')
      expect(stdout).toContain('Kind:')
      expect(stdout).toContain('Tags:')
    })

    it('--json emits machine-readable output', () => {
      const { stdout, status } = runCLI(['describe', 'feature-pr-ready', '--json'])
      expect(status).toBe(0)
      const data = JSON.parse(stdout)
      expect(data.name).toBe('feature-pr-ready')
      expect(data.kind).toBe('branch')
      expect(Array.isArray(data.tags)).toBe(true)
      expect(Array.isArray(data.contracts)).toBe(true)
    })

    it('errors on unknown scenario', () => {
      const { status, stderr } = runCLI(['describe', 'totally-fake-xyz'])
      expect(status).toBe(2)
      expect(stderr).toMatch(/Unknown scenario/)
    })
  })

  describe('help', () => {
    it('prints usage when no command given', () => {
      const { stdout, status } = runCLI([])
      expect(status).toBe(0)
      expect(stdout).toContain('git-scenarios')
      expect(stdout).toContain('Usage:')
    })

    it('--help prints usage', () => {
      const { stdout, status } = runCLI(['--help'])
      expect(status).toBe(0)
      expect(stdout).toContain('Usage:')
    })
  })

  describe('create --ephemeral', () => {
    it('creates and cleans up an empty-repo scenario', () => {
      const { stdout, status } = runCLI(['create', 'empty-repo', '--ephemeral'])
      expect(status).toBe(0)
      expect(stdout).toContain('empty-repo')
      expect(stdout).toContain('ephemeral')
    }, 30_000)
  })

  describe('clean', () => {
    it('--dry-run reports without removing', () => {
      // Create a fake stale dir to ensure clean has something to find
      const fakeDir = mkdtempSync(join(tmpdir(), 'coco-git-test-'))
      try {
        const { stdout, status } = runCLI(['clean', '--dry-run'])
        expect(status).toBe(0)
        expect(stdout).toMatch(/dry run|No stale/)
        // Dir must still exist after dry-run.
        expect(existsSync(fakeDir)).toBe(true)
      } finally {
        rmSync(fakeDir, { recursive: true, force: true })
      }
    })
  })
})
