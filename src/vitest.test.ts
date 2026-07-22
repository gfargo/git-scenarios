/**
 * Smoke test for the Vitest adapter.
 *
 * The adapter relies on Vitest's runtime globals, which we don't have
 * inside this Jest-driven test suite. So the describe/beforeAll/afterAll
 * tests verify module shape only. The repoFixture factory is a pure
 * function returning an object and can be exercised directly.
 */

import * as vitestAdapter from './vitest'
import * as jestAdapter from './jest'
import { repoFixture, scenarioTest } from './vitest'
import { writeFiles, defineScenario, chain } from './atoms'
import { registerScenario, unregisterScenario } from './registry'
import type { TempGitRepo } from './tempGitRepo'

describe('vitest adapter', () => {
  it('exports describeWithScenario', () => {
    expect(typeof vitestAdapter.describeWithScenario).toBe('function')
  })

  it('exports describeEachScenario', () => {
    expect(typeof vitestAdapter.describeEachScenario).toBe('function')
  })

  it('exports repoFixture', () => {
    expect(typeof vitestAdapter.repoFixture).toBe('function')
  })

  it('vitest adapter is a superset of the jest adapter exports', () => {
    // Vitest has everything Jest has, plus repoFixture (which is
    // vitest-specific because test.extend is a Vitest API).
    const vitestKeys = new Set(Object.keys(vitestAdapter))
    const jestKeys = Object.keys(jestAdapter)
    for (const key of jestKeys) {
      expect(vitestKeys.has(key)).toBe(true)
    }
    expect(vitestKeys.has('repoFixture')).toBe(true)
  })

  it('describeWithScenario references the runtime describe global', () => {
    // The adapter declares `describe` ambient and invokes it at call
    // time. We can't safely invoke it inside an `it` (Jest forbids
    // nested describe), so verify the function shape is correct
    // and contains the expected control flow by checking source.
    const adapterSource = vitestAdapter.describeWithScenario.toString()
    expect(adapterSource).toContain('describe')
    expect(adapterSource).toContain('beforeAll')
    expect(adapterSource).toContain('afterAll')
  })
})

describe('repoFixture', () => {
  it('returns an object with a repo fixture function', () => {
    const fixture = repoFixture('empty-repo')
    expect(typeof fixture.repo).toBe('function')
  })

  it('sets up a live repo and cleans it up after use', async () => {
    const { existsSync } = await import('fs')
    const fixture = repoFixture('empty-repo')

    let repoPath: string | undefined

    await fixture.repo({}, async (repo) => {
      repoPath = repo.path
      expect(existsSync(repo.path)).toBe(true)
      expect(repo.git).toBeDefined()
    })

    // Temp dir removed after use()
    expect(repoPath).toBeDefined()
    expect(existsSync(repoPath!)).toBe(false)
  }, 30_000)

  it('applies extraSteps before yielding the repo', async () => {
    const { existsSync } = await import('fs')
    const { join } = await import('path')

    const fixture = repoFixture('empty-repo', {
      extraSteps: [writeFiles({ 'injected.ts': 'injected\n' })],
    })

    await fixture.repo({}, async (repo) => {
      expect(existsSync(join(repo.path, 'injected.ts'))).toBe(true)
    })
  }, 30_000)

  it('cleans up even when the use callback throws', async () => {
    const { existsSync } = await import('fs')
    const fixture = repoFixture('empty-repo')

    let repoPath: string | undefined
    let threw = false

    try {
      await fixture.repo({}, async (repo) => {
        repoPath = repo.path
        throw new Error('test error')
      })
    } catch {
      threw = true
    }

    expect(threw).toBe(true)
    expect(repoPath).toBeDefined()
    expect(existsSync(repoPath!)).toBe(false)
  }, 30_000)

  it('cleans up the temp repo when scenario setup throws', async () => {
    const { existsSync } = await import('fs')

    let capturedPath: string | undefined
    const throwingScenario = defineScenario({
      name: 'vitest-leak-throwing-setup',
      summary: 'Throws during setup to verify no temp dir leak',
      description: 'Used to verify repoFixture cleans up on a throwing setup.',
      kind: 'branch',
      setup: chain(async (repo) => {
        capturedPath = repo.path
        throw new Error('setup boom')
      }),
    })

    registerScenario(throwingScenario)
    try {
      const fixture = repoFixture('vitest-leak-throwing-setup')
      let threw = false
      try {
        await fixture.repo({}, async () => {})
      } catch {
        threw = true
      }

      expect(threw).toBe(true)
      expect(capturedPath).toBeDefined()
      expect(existsSync(capturedPath!)).toBe(false)
    } finally {
      unregisterScenario('vitest-leak-throwing-setup')
    }
  }, 30_000)
})


describe('scenarioTest', () => {
  it('exports scenarioTest', () => {
    expect(typeof vitestAdapter.scenarioTest).toBe('function')
  })

  it('returns an extended test function when given a base with extend()', () => {
    // Mock a minimal Vitest-like `test` object with an `extend` method
    const mockBase = {
      extend: (fixtures: Record<string, unknown>) => {
        // In real Vitest, this returns a new test function with the fixture
        return { ...mockBase, _fixtures: fixtures }
      },
    }

    const result = scenarioTest(mockBase, 'empty-repo')
    const extended = result as unknown as { _fixtures: Record<string, unknown> }
    expect(result).toHaveProperty('_fixtures')
    // The fixtures object should contain a `repo` key
    expect(extended._fixtures).toHaveProperty('repo')
    expect(typeof extended._fixtures.repo).toBe('function')
  })

  it('passes options through to the underlying repoFixture', () => {
    const mockBase = {
      extend: (fixtures: Record<string, unknown>) => {
        return { ...mockBase, _fixtures: fixtures }
      },
    }

    const result = scenarioTest(mockBase, 'empty-repo', {
      extraSteps: [writeFiles({ 'test.txt': 'hello' })],
      remote: 'git@github.com:org/repo.git',
    })
    const extended = result as unknown as { _fixtures: Record<string, unknown> }
    expect(extended._fixtures).toHaveProperty('repo')
  })

  it('the repo fixture function sets up and tears down correctly', async () => {
    const { existsSync } = await import('fs')
    const mockBase = {
      extend: (fixtures: Record<string, unknown>) => {
        return { ...mockBase, _fixtures: fixtures }
      },
    }

    const result = scenarioTest(mockBase, 'empty-repo')
    const extended = result as unknown as { _fixtures: Record<string, (fixtures: object, use: (repo: TempGitRepo) => Promise<void>) => Promise<void>> }
    const fixturesFn = extended._fixtures.repo

    let repoPath: string | undefined
    await fixturesFn({}, async (repo) => {
      repoPath = repo.path
      expect(existsSync(repo.path)).toBe(true)
    })

    expect(repoPath).toBeDefined()
    expect(existsSync(repoPath!)).toBe(false)
  }, 30_000)
})
