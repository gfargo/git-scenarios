/**
 * Property-based tests for determinism guarantees.
 *
 * Property 9: Scenario determinism — two runs of any built-in scenario
 * that pins timestamps produce identical commit hashes.
 *
 * Property 10: seededFiles determinism — same seed + spec produces
 * byte-identical content across calls.
 *
 * Uses fast-check to verify these properties hold across many inputs.
 */

import * as fc from 'fast-check'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createTempGitRepo } from '../tempGitRepo'
import { allScenarios } from '../scenarios'
import { spinUpScenario } from '../spinUpScenario'
import { seededFiles } from '../atoms'

/**
 * Property 9: Scenario determinism
 *
 * Running ANY built-in scenario's setup twice on two separate
 * TempGitRepo instances produces identical commit hashes AND identical
 * `git log --all` ordering. This is the library's headline guarantee:
 * every scenario is byte-identical (and hash-identical) on every run,
 * enabled by the deterministic commit clock (see `commitClock.ts`).
 *
 * Covers all registered scenarios — not just the date-pinned ones — so
 * a regression that reintroduces wall-clock dates anywhere is caught.
 *
 * **Validates: Requirements 9.1, 9.2**
 */
describe('Property 9: Scenario determinism (all scenarios)', () => {
  // `--all` includes every ref; %H is the full hash, %aI the author
  // date. Comparing both runs catches hash drift AND ordering ties.
  const fingerprint = (repo: { git: { raw: (a: string[]) => Promise<string> } }) =>
    repo.git.raw(['log', '--all', '--format=%H %aI %s'])

  it.each(allScenarios.map((s) => s.name))(
    '%s produces identical hashes across two runs',
    async (scenarioName) => {
      const repo1 = await spinUpScenario(scenarioName)
      const repo2 = await spinUpScenario(scenarioName)
      try {
        expect(await fingerprint(repo1)).toBe(await fingerprint(repo2))
      } finally {
        await repo1.cleanup()
        await repo2.cleanup()
      }
    },
    // Generous upper bound, not a perf target: cases run serially and
    // only the heaviest scenario (`large-repo`, 115 commits) comes close
    // — spun up twice it can take ~80s on slow Windows runners where git
    // process-spawn overhead dominates. The fast scenarios still finish
    // in well under a second; this cap only stops a genuine hang.
    180_000,
  )
})

/**
 * Property 10: seededFiles determinism
 *
 * For any seed value and file spec (path, tokens), calling seededFiles
 * twice with the same parameters produces byte-identical file content.
 *
 * **Validates: Requirements 9.3**
 */
describe('Property 10: seededFiles determinism', () => {
  it('same seed + spec produces byte-identical content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100000 }), // seed
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-z][a-z0-9]*$/.test(s)), // filename base
        fc.integer({ min: 10, max: 200 }), // tokens
        async (seed, filename, tokens) => {
          const filePath = `${filename}.txt`
          const repo1 = await createTempGitRepo()
          const repo2 = await createTempGitRepo()

          try {
            await seededFiles({ seed, files: [{ path: filePath, tokens }] })(repo1)
            await seededFiles({ seed, files: [{ path: filePath, tokens }] })(repo2)

            const content1 = readFileSync(join(repo1.path, filePath), 'utf-8')
            const content2 = readFileSync(join(repo2.path, filePath), 'utf-8')

            expect(content1).toBe(content2)
            // Content should be non-empty
            expect(content1.length).toBeGreaterThan(0)
          } finally {
            await repo1.cleanup()
            await repo2.cleanup()
          }
        },
      ),
      { numRuns: 20 },
    )
  }, 60_000)

  it('different seeds produce different content for the same path', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50000 }),
        fc.integer({ min: 50001, max: 100000 }),
        async (seed1, seed2) => {
          const filePath = 'example.txt'
          const tokens = 50
          const repo1 = await createTempGitRepo()
          const repo2 = await createTempGitRepo()

          try {
            await seededFiles({ seed: seed1, files: [{ path: filePath, tokens }] })(repo1)
            await seededFiles({ seed: seed2, files: [{ path: filePath, tokens }] })(repo2)

            const content1 = readFileSync(join(repo1.path, filePath), 'utf-8')
            const content2 = readFileSync(join(repo2.path, filePath), 'utf-8')

            // Different seeds should produce different content
            expect(content1).not.toBe(content2)
          } finally {
            await repo1.cleanup()
            await repo2.cleanup()
          }
        },
      ),
      { numRuns: 10 },
    )
  }, 60_000)
})
