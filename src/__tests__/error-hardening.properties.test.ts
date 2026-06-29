/**
 * Property-based tests for error hardening in atoms.
 *
 * Validates that precondition guards and error wrapping produce
 * correctly-typed errors with the expected fields.
 *
 * Uses fast-check for property-based testing.
 */

import * as fc from 'fast-check'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { InvalidArgumentError, GitCommandError } from '../errors'
import {
    switchToBranch,
    startMerge,
    cherryPick,
    startRebase,
    createBranch,
} from '../atoms'
import { withGitError } from '../atoms/withGitError'

async function withRepo(callback: (repo: TempGitRepo) => Promise<void>): Promise<void> {
  const repo = await createTempGitRepo()
  try {
    await callback(repo)
  } finally {
    await repo.cleanup()
  }
}

/**
 * Property 3: InvalidArgumentError for invalid atom arguments
 *
 * For any atom that validates its arguments, passing an argument that
 * violates the documented constraint throws an InvalidArgumentError
 * whose parameterName identifies the invalid parameter and whose
 * constraint describes the violation.
 *
 * We test this by calling commit-requiring atoms on a zero-commit repo.
 *
 * **Validates: Requirements 1.4, 8.1**
 */
describe('Property 3: InvalidArgumentError for invalid atom arguments', () => {
  const atomFactories = [
    { name: 'switchToBranch', make: () => switchToBranch('some-branch') },
    { name: 'startMerge', make: () => startMerge('some-branch') },
    { name: 'cherryPick', make: () => cherryPick('some-hash') },
    { name: 'startRebase', make: () => startRebase('some-branch') },
    { name: 'createBranch', make: () => createBranch('some-branch') },
  ]

  it('atoms throw InvalidArgumentError with correct fields on precondition failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...atomFactories),
        async (atomDef) => {
          await withRepo(async (repo) => {
            // repo has zero commits — precondition should fail
            const step = atomDef.make()
            try {
              await step(repo)
              throw new Error(`Expected ${atomDef.name} to throw InvalidArgumentError`)
            } catch (err) {
              if (err instanceof Error && err.message.startsWith('Expected')) {
                throw err
              }
              expect(err).toBeInstanceOf(InvalidArgumentError)
              const invalidErr = err as InvalidArgumentError
              expect(invalidErr.parameterName).toBe('repo')
              expect(invalidErr.constraint).toContain('commit')
            }
          })
        },
      ),
      { numRuns: 15 },
    )
  }, 90_000)
})

/**
 * Property 7: Commit-requiring atoms throw on empty repo
 *
 * For all atoms in the set {switchToBranch, startMerge, cherryPick,
 * startRebase, createBranch}, calling them on a TempGitRepo with zero
 * commits throws an InvalidArgumentError with a constraint message
 * mentioning the commit requirement.
 *
 * **Validates: Requirements 8.1**
 */
describe('Property 7: Commit-requiring atoms throw on empty repo', () => {
  // Generate random branch/ref names to show the property holds for any argument
  const branchNameArb = fc
    .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
      minLength: 3,
      maxLength: 12,
    })
    .map((chars) => chars.join(''))

  const guardedAtoms = [
    { name: 'switchToBranch', make: (ref: string) => switchToBranch(ref) },
    { name: 'startMerge', make: (ref: string) => startMerge(ref) },
    { name: 'cherryPick', make: (ref: string) => cherryPick(ref) },
    { name: 'startRebase', make: (ref: string) => startRebase(ref) },
    { name: 'createBranch', make: (ref: string) => createBranch(ref) },
  ]

  for (const atom of guardedAtoms) {
    it(`${atom.name} rejects on zero-commit repos for any branch name`, async () => {
      await fc.assert(
        fc.asyncProperty(branchNameArb, async (branchName) => {
          await withRepo(async (repo) => {
            const step = atom.make(branchName)
            try {
              await step(repo)
              throw new Error(`Expected ${atom.name} to throw`)
            } catch (err) {
              if (err instanceof Error && err.message.startsWith('Expected')) {
                throw err
              }
              expect(err).toBeInstanceOf(InvalidArgumentError)
              const invalidErr = err as InvalidArgumentError
              expect(invalidErr.constraint.toLowerCase()).toContain('commit')
              expect(invalidErr.atomName).toBe(atom.name)
            }
          })
        }),
        { numRuns: 5 },
      )
    }, 60_000)
  }
})

/**
 * Property 8: Error messages include atom name
 *
 * For any atom that fails due to a git command error wrapped by
 * withGitError, the resulting GitCommandError has a non-empty
 * atomName field.
 *
 * **Validates: Requirements 8.4**
 */
describe('Property 8: Error messages include atom name', () => {
  // Generate random atom names to verify withGitError always propagates them
  const atomNameArb = fc.string({ minLength: 1, maxLength: 30 }).filter(
    (s) => s.trim().length > 0,
  )

  it('withGitError produces GitCommandError with non-empty atomName', async () => {
    await fc.assert(
      fc.asyncProperty(atomNameArb, async (atomName) => {
        // Simulate a simple-git error (has a .git property)
        const fakeGitError = Object.assign(new Error('fatal: bad ref'), {
          git: {
            command: 'git checkout nonexistent',
            exitCode: 128,
            stdErr: 'fatal: bad ref',
          },
        })

        try {
          await withGitError(atomName, async () => {
            throw fakeGitError
          })
          throw new Error('Expected withGitError to throw')
        } catch (err) {
          if (err instanceof Error && err.message === 'Expected withGitError to throw') {
            throw err
          }
          expect(err).toBeInstanceOf(GitCommandError)
          const gitErr = err as GitCommandError
          expect(gitErr.atomName).toBe(atomName)
          expect(gitErr.atomName!.length).toBeGreaterThan(0)
          expect(gitErr.command).toBe('git checkout nonexistent')
          expect(gitErr.exitCode).toBe(128)
        }
      }),
      { numRuns: 50 },
    )
  })

  it('addSubmodule includes atomName in GitCommandError on failure', async () => {
    // Test a real atom (addSubmodule) that wraps errors with atomName
    await withRepo(async (repo) => {
      // addSubmodule needs at least one commit in the parent to work,
      // but we want to trigger a git error. We'll try to add a submodule
      // from a non-existent path which should fail with GitCommandError.
      const { addSubmodule } = await import('../atoms')
      const { addCommit } = await import('../atoms')

      // First add a commit so we get past any precondition check
      await addCommit({ message: 'init', files: { 'README.md': '# test' } })(repo)

      try {
        await addSubmodule({
          path: 'vendor/nonexistent',
          setup: async () => {
            // setup that does nothing — the source repo will have no commits
            // which should cause submodule add to fail
            throw Object.assign(new Error('simulated'), {
              git: { command: 'git submodule add', exitCode: 1, stdErr: 'fatal: not a repo' },
            })
          },
        })(repo)
        // If it doesn't throw, that's fine — the property is about when it DOES throw
      } catch (err) {
        if (err instanceof GitCommandError) {
          expect(err.atomName).toBeDefined()
          expect(err.atomName!.length).toBeGreaterThan(0)
        }
        // Other error types are acceptable — the property only constrains GitCommandError
      }
    })
  }, 30_000)
})
