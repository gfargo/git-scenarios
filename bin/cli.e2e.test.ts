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
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI = join(__dirname, '..', 'dist', 'bin', 'cli.cjs')
const HAS_BUILD = existsSync(CLI)

/** Build a small real git repo on disk for capture tests. */
function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'git-scenarios-capture-src-'))
  const git = (args: string[]) => spawnSync('git', args, { cwd: dir, encoding: 'utf-8' })
  git(['init', '-b', 'main'])
  git(['config', 'user.name', 'Test'])
  git(['config', 'user.email', 'test@example.com'])
  git(['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(dir, 'a.txt'), 'a\n')
  git(['add', '.'])
  git(['commit', '-m', 'chore: first'])
  git(['checkout', '-b', 'feature'])
  writeFileSync(join(dir, 'b.txt'), 'b\n')
  git(['add', '.'])
  git(['commit', '-m', 'feat: second'])
  return dir
}

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

    it('--json before the scenario name still works (flag-before-positional)', () => {
      const { stdout, status } = runCLI(['describe', '--json', 'feature-pr-ready'])
      expect(status).toBe(0)
      const data = JSON.parse(stdout)
      expect(data.name).toBe('feature-pr-ready')
    })
  })

  describe('inspect', () => {
    it('prints the commit graph, branches, and status for a scenario', () => {
      const { stdout, status } = runCLI(['inspect', 'feature-pr-ready'])
      expect(status).toBe(0)
      expect(stdout).toContain('feature-pr-ready')
      expect(stdout).toContain('Commit graph:')
      expect(stdout).toContain('Branches:')
      expect(stdout).toContain('Status (git status -sb):')
    }, 30_000)

    it('--json emits structured graph / branches / status', () => {
      const { stdout, status } = runCLI(['inspect', 'feature-pr-ready', '--json'])
      expect(status).toBe(0)
      const data = JSON.parse(stdout)
      expect(data.name).toBe('feature-pr-ready')
      expect(data.kind).toBe('branch')
      expect(Array.isArray(data.graph)).toBe(true)
      expect(data.graph.length).toBeGreaterThan(0)
      expect(Array.isArray(data.branches)).toBe(true)
      expect(Array.isArray(data.status)).toBe(true)
    }, 30_000)

    it('handles an empty repo (no commits) without erroring', () => {
      const { stdout, status } = runCLI(['inspect', 'empty-repo', '--json'])
      expect(status).toBe(0)
      const data = JSON.parse(stdout)
      expect(data.name).toBe('empty-repo')
      // No commits yet → empty graph, but the call still succeeds.
      expect(Array.isArray(data.graph)).toBe(true)
      expect(data.graph.length).toBe(0)
    }, 30_000)

    it('errors on unknown scenario', () => {
      const { status, stderr } = runCLI(['inspect', 'totally-fake-xyz'])
      expect(status).toBe(2)
      expect(stderr).toMatch(/Unknown scenario/)
    })

    it('--json before the scenario name still works (flag-before-positional)', () => {
      const { stdout, status } = runCLI(['inspect', '--json', 'feature-pr-ready'])
      expect(status).toBe(0)
      const data = JSON.parse(stdout)
      expect(data.name).toBe('feature-pr-ready')
    }, 30_000)
  })

  describe('diff', () => {
    it('compares two scenarios in human-readable format', () => {
      const { stdout, status } = runCLI(['diff', 'feature-pr-ready', 'mid-merge-conflict'])
      expect(status).toBe(0)
      expect(stdout).toContain('feature-pr-ready')
      expect(stdout).toContain('mid-merge-conflict')
      expect(stdout).toContain('Branch')
      expect(stdout).toContain('Commits')
    }, 30_000)

    it('--json emits structured side-by-side comparison', () => {
      const { stdout, status } = runCLI(['diff', 'feature-pr-ready', 'merge-no-conflict', '--json'])
      expect(status).toBe(0)
      const data = JSON.parse(stdout)
      expect(data.a.name).toBe('feature-pr-ready')
      expect(data.b.name).toBe('merge-no-conflict')
      expect(Array.isArray(data.differences)).toBe(true)
      expect(typeof data.same).toBe('boolean')
      expect(data.same).toBe(false)
    }, 30_000)

    it('same scenario twice reports no differences', () => {
      const { stdout, status } = runCLI(['diff', 'empty-repo', 'empty-repo', '--json'])
      expect(status).toBe(0)
      const data = JSON.parse(stdout)
      expect(data.same).toBe(true)
      expect(data.differences).toHaveLength(0)
    }, 30_000)

    it('errors on unknown scenario', () => {
      const { status, stderr } = runCLI(['diff', 'feature-pr-ready', 'totally-fake-xyz'])
      expect(status).toBe(2)
      expect(stderr).toMatch(/Unknown scenario/)
    })

    it('errors on missing second argument', () => {
      const { status, stderr } = runCLI(['diff', 'feature-pr-ready'])
      expect(status).toBe(2)
      expect(stderr).toContain('Missing scenario')
    })

    it('--json before the scenario names still works (flag-before-positional)', () => {
      const { stdout, status } = runCLI(['diff', '--json', 'feature-pr-ready', 'merge-no-conflict'])
      expect(status).toBe(0)
      const data = JSON.parse(stdout)
      expect(data.a.name).toBe('feature-pr-ready')
      expect(data.b.name).toBe('merge-no-conflict')
    }, 30_000)
  })

  describe('capture', () => {
    it('emits a defineScenario module for a real repo', () => {
      const dir = makeRepo()
      try {
        const { stdout, stderr, status } = runCLI(['capture', dir, '--name', 'my-repro'])
        expect(status).toBe(0)
        expect(stdout).toContain('defineScenario(')
        expect(stdout).toContain('name: "my-repro"')
        expect(stdout).toContain('switchToBranch("feature")')
        // Progress note goes to stderr so stdout stays pipeable.
        expect(stderr).toContain('Captured')
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    }, 30_000)

    it('--json emits structured capture data', () => {
      const dir = makeRepo()
      try {
        const { stdout, status } = runCLI(['capture', dir, '--name', 'my-repro', '--json'])
        expect(status).toBe(0)
        const data = JSON.parse(stdout)
        expect(data.name).toBe('my-repro')
        expect(data.currentBranch).toBe('feature')
        expect(data.baseBranch).toBe('main')
        expect(data.baseCommits).toHaveLength(1)
        expect(data.branchCommits).toHaveLength(1)
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    }, 30_000)

    it('errors on a non-git directory', () => {
      const dir = mkdtempSync(join(tmpdir(), 'git-scenarios-not-a-repo-'))
      try {
        const { status, stderr } = runCLI(['capture', dir])
        expect(status).toBe(1)
        expect(stderr).toMatch(/Not a git repository/)
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })

    it('rejects an invalid --kind', () => {
      const dir = makeRepo()
      try {
        const { status, stderr } = runCLI(['capture', dir, '--kind', 'bogus'])
        expect(status).toBe(2)
        expect(stderr).toMatch(/Invalid --kind/)
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    }, 30_000)
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

    it('--ephemeral before the scenario name still works (flag-before-positional)', () => {
      const { stdout, status } = runCLI(['create', '--ephemeral', 'empty-repo'])
      expect(status).toBe(0)
      expect(stdout).toContain('empty-repo')
      expect(stdout).toContain('ephemeral')
    }, 30_000)
  })

  describe('doctor', () => {
    it('exits 0 and prints per-check status lines', () => {
      const { stdout, status } = runCLI(['doctor'])
      expect(status).toBe(0)
      expect(stdout).toContain('git-version')
      expect(stdout).toContain('temp-dir-writable')
      expect(stdout).toContain('git-lfs')
    })

    it('--json emits a checks array with name/status/message per entry', () => {
      const { stdout, status } = runCLI(['doctor', '--json'])
      expect(status).toBe(0)
      const data = JSON.parse(stdout)
      expect(Array.isArray(data.checks)).toBe(true)
      expect(data.checks.length).toBeGreaterThan(0)
      for (const check of data.checks) {
        expect(check).toHaveProperty('name')
        expect(check).toHaveProperty('status')
        expect(['pass', 'warn', 'fail']).toContain(check.status)
        expect(check).toHaveProperty('message')
      }
    })

    it('doctor appears in help output', () => {
      const { stdout, status } = runCLI(['--help'])
      expect(status).toBe(0)
      expect(stdout).toContain('doctor')
    })
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

  describe('completions', () => {
    it('bash — emits a valid bash completion script', () => {
      const { stdout, status } = runCLI(['completions', 'bash'])
      expect(status).toBe(0)
      expect(stdout).toContain('complete -F _git_scenarios git-scenarios')
      expect(stdout).toContain('list --names')
    })

    it('zsh — emits a valid zsh completion script', () => {
      const { stdout, status } = runCLI(['completions', 'zsh'])
      expect(status).toBe(0)
      expect(stdout).toContain('#compdef git-scenarios')
      expect(stdout).toContain('list --names')
    })

    it('fish — emits a valid fish completion script', () => {
      const { stdout, status } = runCLI(['completions', 'fish'])
      expect(status).toBe(0)
      expect(stdout).toContain('complete -c git-scenarios')
      expect(stdout).toContain('list --names')
    })

    it('missing shell arg — exits 2 with error', () => {
      const { status, stderr } = runCLI(['completions'])
      expect(status).toBe(2)
      expect(stderr).toMatch(/Missing shell argument/)
    })

    it('unknown shell — exits 2 with error', () => {
      const { status, stderr } = runCLI(['completions', 'tcsh'])
      expect(status).toBe(2)
      expect(stderr).toMatch(/Unknown shell/)
    })
  })

  describe('list --names', () => {
    it('prints scenario names one per line, no JSON braces', () => {
      const { stdout, status } = runCLI(['list', '--names'])
      expect(status).toBe(0)
      expect(stdout).toContain('feature-pr-ready')
      expect(stdout).not.toContain('{')
      expect(stdout).not.toContain('[')
    })

    it('--names respects --kind filter', () => {
      const { stdout, status } = runCLI(['list', '--names', '--kind', 'stash'])
      expect(status).toBe(0)
      expect(stdout).toContain('stashed-changes')
      expect(stdout).not.toContain('feature-pr-ready')
    })
  })
})
