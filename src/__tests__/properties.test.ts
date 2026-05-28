/**
 * Property-based tests for error types, exists(), temp prefix, and repo identity.
 *
 * Uses fast-check to verify universal correctness properties hold across
 * many randomly generated inputs.
 */

import * as fc from 'fast-check'
import { basename } from 'path'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import {
    GitScenariosError,
    ScenarioNotFoundError,
    GitCommandError,
    InvalidArgumentError,
} from '../errors'
import { resolveScenario } from '../resolveScenario'
import { listRegistered } from '../registry'

async function withRepo(callback: (repo: TempGitRepo) => Promise<void>): Promise<void> {
  const repo = await createTempGitRepo()
  try {
    await callback(repo)
  } finally {
    await repo.cleanup()
  }
}

/**
 * Property 1: Error class hierarchy
 *
 * For any error class exported by the library (ScenarioNotFoundError,
 * GitCommandError, InvalidArgumentError), instantiating it produces an
 * object that is instanceof GitScenariosError.
 *
 * **Validates: Requirements 1.1**
 */
describe('Property 1: Error class hierarchy', () => {
  it('ScenarioNotFoundError is instanceof GitScenariosError for any inputs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 20 }),
        (name, available) => {
          const err = new ScenarioNotFoundError(name, available)
          expect(err).toBeInstanceOf(GitScenariosError)
          expect(err).toBeInstanceOf(Error)
        },
      ),
    )
  })

  it('GitCommandError is instanceof GitScenariosError for any inputs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1, max: 255 }),
        fc.string(),
        fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        (command, exitCode, stderr, atomName) => {
          const err = new GitCommandError({ command, exitCode, stderr, atomName })
          expect(err).toBeInstanceOf(GitScenariosError)
          expect(err).toBeInstanceOf(Error)
        },
      ),
    )
  })

  it('InvalidArgumentError is instanceof GitScenariosError for any inputs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        (parameterName, constraint, atomName) => {
          const err = new InvalidArgumentError({ parameterName, constraint, atomName })
          expect(err).toBeInstanceOf(GitScenariosError)
          expect(err).toBeInstanceOf(Error)
        },
      ),
    )
  })
})

/**
 * Property 2: ScenarioNotFoundError contains lookup context
 *
 * For any string that is not a registered scenario name, calling
 * resolveScenario with that string throws a ScenarioNotFoundError whose
 * scenarioName field equals the input and whose availableScenarios
 * contains all registered names.
 *
 * **Validates: Requirements 1.2**
 */
describe('Property 2: ScenarioNotFoundError contains lookup context', () => {
  const registeredNames = listRegistered().map((s) => s.name)

  it('invalid names produce error with correct fields', () => {
    // Generate strings that are NOT registered scenario names
    const invalidNameArb = fc.string({ minLength: 1 }).filter(
      (name) => !registeredNames.includes(name),
    )

    fc.assert(
      fc.property(invalidNameArb, (invalidName) => {
        try {
          resolveScenario(invalidName)
          // Should not reach here
          throw new Error('Expected ScenarioNotFoundError to be thrown')
        } catch (err) {
          expect(err).toBeInstanceOf(ScenarioNotFoundError)
          const snfErr = err as ScenarioNotFoundError
          expect(snfErr.scenarioName).toBe(invalidName)
          expect(snfErr.availableScenarios).toEqual(
            expect.arrayContaining(registeredNames),
          )
          expect(snfErr.availableScenarios.length).toBe(registeredNames.length)
        }
      }),
      { numRuns: 50 },
    )
  })
})

/**
 * Property 4: exists() correctness
 *
 * For any file path written to a TempGitRepo via writeFile, calling
 * exists() returns true. For any random path never written, exists()
 * returns false without throwing.
 *
 * **Validates: Requirements 2.2, 2.3**
 */
describe('Property 4: exists() correctness', () => {
  // Generate safe relative file paths (no leading slash, no .., alphanumeric segments)
  const safePathSegment = fc
    .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
      minLength: 1,
      maxLength: 10,
    })
    .map((chars) => chars.join(''))
  const safeRelativePath = fc
    .array(safePathSegment, { minLength: 1, maxLength: 3 })
    .map((segments) => segments.join('/') + '.txt')

  it('written files return true from exists()', async () => {
    await withRepo(async (repo) => {
      await fc.assert(
        fc.asyncProperty(safeRelativePath, async (filePath) => {
          await repo.writeFile(filePath, 'content')
          const result = await repo.exists(filePath)
          expect(result).toBe(true)
        }),
        { numRuns: 20 },
      )
    })
  }, 30_000)

  it('unwritten paths return false from exists()', async () => {
    await withRepo(async (repo) => {
      // Generate paths that are very unlikely to exist
      const unlikelyPathSegment = fc
        .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
          minLength: 1,
          maxLength: 10,
        })
        .map((chars) => chars.join(''))
      const unlikelyPath = fc
        .array(unlikelyPathSegment, { minLength: 2, maxLength: 4 })
        .map((segments) => 'nonexistent_' + segments.join('/') + '.xyz')

      await fc.assert(
        fc.asyncProperty(unlikelyPath, async (filePath) => {
          const result = await repo.exists(filePath)
          expect(result).toBe(false)
        }),
        { numRuns: 20 },
      )
    })
  })
})

/**
 * Property 5: Temp directory prefix identity
 *
 * For any TempGitRepo created via createTempGitRepo(), the path
 * contains a directory whose basename starts with `git-scenarios-`.
 *
 * **Validates: Requirements 3.1**
 */
describe('Property 5: Temp directory prefix identity', () => {
  it('created repos have git-scenarios- prefix', async () => {
    // Create multiple repos to approximate "for any" creation
    const repos: TempGitRepo[] = []
    try {
      for (let i = 0; i < 10; i++) {
        repos.push(await createTempGitRepo())
      }
      for (const repo of repos) {
        const dirName = basename(repo.path)
        expect(dirName.startsWith('git-scenarios-')).toBe(true)
      }
    } finally {
      await Promise.all(repos.map((r) => r.cleanup()))
    }
  }, 30_000)
})

/**
 * Property 6: Repo identity configuration
 *
 * For any TempGitRepo created via createTempGitRepo(), git config
 * user.name returns "Git Scenarios Test" and user.email returns
 * "test@git-scenarios.dev".
 *
 * **Validates: Requirements 4.1, 4.2**
 */
describe('Property 6: Repo identity configuration', () => {
  it('git config matches expected values across multiple repos', async () => {
    const repos: TempGitRepo[] = []
    try {
      for (let i = 0; i < 10; i++) {
        repos.push(await createTempGitRepo())
      }
      for (const repo of repos) {
        const name = await repo.git.raw(['config', 'user.name'])
        const email = await repo.git.raw(['config', 'user.email'])
        expect(name.trim()).toBe('Git Scenarios Test')
        expect(email.trim()).toBe('test@git-scenarios.dev')
      }
    } finally {
      await Promise.all(repos.map((r) => r.cleanup()))
    }
  }, 30_000)
})
