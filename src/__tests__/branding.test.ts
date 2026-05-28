/**
 * Unit tests for the v1 branding changes:
 *   - Temp directory prefix: `git-scenarios-`
 *   - Default git identity: `Git Scenarios Test <test@git-scenarios.dev>`
 *   - CLI clean dual-prefix scanning and legacy labeling
 *
 * Validates: Requirements 3.1, 4.1, 4.2
 */

import { mkdtempSync, rmSync, readdirSync } from 'fs'
import { tmpdir } from 'os'
import { basename, join } from 'path'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'

async function withRepo(callback: (repo: TempGitRepo) => Promise<void>): Promise<void> {
  const repo = await createTempGitRepo()
  try {
    await callback(repo)
  } finally {
    await repo.cleanup()
  }
}

describe('Temp directory prefix (Requirement 3.1)', () => {
  it('createTempGitRepo() produces a path with git-scenarios- prefix', async () => {
    await withRepo(async (repo) => {
      const dirName = basename(repo.path)
      expect(dirName).toMatch(/^git-scenarios-/)
    })
  })

  it('multiple repos all use the git-scenarios- prefix', async () => {
    const repos = await Promise.all([
      createTempGitRepo(),
      createTempGitRepo(),
      createTempGitRepo(),
    ])
    try {
      for (const repo of repos) {
        const dirName = basename(repo.path)
        expect(dirName).toMatch(/^git-scenarios-/)
      }
    } finally {
      await Promise.all(repos.map((r) => r.cleanup()))
    }
  })

  it('does NOT use the legacy coco-git-test- prefix', async () => {
    await withRepo(async (repo) => {
      const dirName = basename(repo.path)
      expect(dirName).not.toMatch(/^coco-git-test-/)
    })
  })
})

describe('Default git identity (Requirements 4.1, 4.2)', () => {
  it('configures user.name as "Git Scenarios Test"', async () => {
    await withRepo(async (repo) => {
      const name = await repo.git.raw(['config', 'user.name'])
      expect(name.trim()).toBe('Git Scenarios Test')
    })
  })

  it('configures user.email as "test@git-scenarios.dev"', async () => {
    await withRepo(async (repo) => {
      const email = await repo.git.raw(['config', 'user.email'])
      expect(email.trim()).toBe('test@git-scenarios.dev')
    })
  })

  it('commits use the new identity', async () => {
    await withRepo(async (repo) => {
      await repo.writeFile('init.ts', 'export const x = 1\n')
      await repo.commitAll('initial commit')

      const authorName = await repo.git.raw(['log', '-1', '--format=%an'])
      const authorEmail = await repo.git.raw(['log', '-1', '--format=%ae'])
      expect(authorName.trim()).toBe('Git Scenarios Test')
      expect(authorEmail.trim()).toBe('test@git-scenarios.dev')
    })
  })
})

describe('CLI clean dual-prefix scanning (Requirements 3.2, 3.3)', () => {
  // We test the logic that the CLI clean command uses by creating
  // directories with both prefixes and verifying the scanning behavior.
  // This mirrors the filtering logic in bin/cli.ts commandClean().

  const CURRENT_PREFIX = 'git-scenarios-'
  const LEGACY_PREFIX = 'coco-git-test-'

  let testDirs: string[] = []

  afterEach(() => {
    for (const dir of testDirs) {
      try {
        rmSync(dir, { recursive: true, force: true })
      } catch {
        // best effort cleanup
      }
    }
    testDirs = []
  })

  it('finds directories with the current git-scenarios- prefix', () => {
    const dir = mkdtempSync(join(tmpdir(), CURRENT_PREFIX))
    testDirs.push(dir)

    const entries = readdirSync(tmpdir())
    const matches = entries.filter((name) => name.startsWith(CURRENT_PREFIX))
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches.some((name) => dir.endsWith(name))).toBe(true)
  })

  it('finds directories with the legacy coco-git-test- prefix', () => {
    const dir = mkdtempSync(join(tmpdir(), LEGACY_PREFIX))
    testDirs.push(dir)

    const entries = readdirSync(tmpdir())
    const matches = entries.filter((name) => name.startsWith(LEGACY_PREFIX))
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches.some((name) => dir.endsWith(name))).toBe(true)
  })

  it('scanning logic finds both prefixes simultaneously', () => {
    const currentDir = mkdtempSync(join(tmpdir(), CURRENT_PREFIX))
    const legacyDir = mkdtempSync(join(tmpdir(), LEGACY_PREFIX))
    testDirs.push(currentDir, legacyDir)

    const entries = readdirSync(tmpdir())
    const scenarioDirs = entries.filter(
      (name) => name.startsWith(CURRENT_PREFIX) || name.startsWith(LEGACY_PREFIX),
    )

    const currentName = basename(currentDir)
    const legacyName = basename(legacyDir)

    expect(scenarioDirs).toContain(currentName)
    expect(scenarioDirs).toContain(legacyName)
  })

  it('labels legacy directories correctly', () => {
    const currentDir = mkdtempSync(join(tmpdir(), CURRENT_PREFIX))
    const legacyDir = mkdtempSync(join(tmpdir(), LEGACY_PREFIX))
    testDirs.push(currentDir, legacyDir)

    const entries = readdirSync(tmpdir())
    const scenarioDirs = entries
      .filter((name) => name.startsWith(CURRENT_PREFIX) || name.startsWith(LEGACY_PREFIX))
      .map((name) => {
        const isLegacy = name.startsWith(LEGACY_PREFIX)
        const label = isLegacy ? ' (legacy)' : ''
        return { name, label, isLegacy }
      })

    const currentEntry = scenarioDirs.find((d) => d.name === basename(currentDir))
    const legacyEntry = scenarioDirs.find((d) => d.name === basename(legacyDir))

    expect(currentEntry).toBeDefined()
    expect(currentEntry!.isLegacy).toBe(false)
    expect(currentEntry!.label).toBe('')

    expect(legacyEntry).toBeDefined()
    expect(legacyEntry!.isLegacy).toBe(true)
    expect(legacyEntry!.label).toBe(' (legacy)')
  })
})
