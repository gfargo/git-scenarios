import { GitCommandError } from '../errors'
import { withGitError } from './withGitError'

describe('withGitError', () => {
  it('returns the result of a successful operation', async () => {
    const result = await withGitError('testAtom', async () => 'success')
    expect(result).toBe('success')
  })

  it('wraps simple-git errors (with .git property) in GitCommandError', async () => {
    const simpleGitError = Object.assign(new Error('git command failed'), {
      git: {
        command: 'git checkout nonexistent',
        exitCode: 128,
        stdErr: "error: pathspec 'nonexistent' did not match any file(s) known to git",
      },
    })

    await expect(
      withGitError('switchToBranch', async () => {
        throw simpleGitError
      }),
    ).rejects.toThrow(GitCommandError)

    try {
      await withGitError('switchToBranch', async () => {
        throw simpleGitError
      })
    } catch (err) {
      expect(err).toBeInstanceOf(GitCommandError)
      const gitErr = err as GitCommandError
      expect(gitErr.atomName).toBe('switchToBranch')
      expect(gitErr.command).toBe('git checkout nonexistent')
      expect(gitErr.exitCode).toBe(128)
      expect(gitErr.stderr).toBe(
        "error: pathspec 'nonexistent' did not match any file(s) known to git",
      )
    }
  })

  it('includes atomName in the error message for traceability', async () => {
    const simpleGitError = Object.assign(new Error('failed'), {
      git: { command: 'git merge', exitCode: 1, stdErr: 'conflict' },
    })

    try {
      await withGitError('startMerge', async () => {
        throw simpleGitError
      })
    } catch (err) {
      expect(err).toBeInstanceOf(GitCommandError)
      expect((err as GitCommandError).message).toContain('[startMerge]')
    }
  })

  it('falls back to message when .git fields are missing', async () => {
    const partialGitError = Object.assign(new Error('something went wrong'), {
      git: {},
    })

    try {
      await withGitError('addSubmodule', async () => {
        throw partialGitError
      })
    } catch (err) {
      expect(err).toBeInstanceOf(GitCommandError)
      const gitErr = err as GitCommandError
      expect(gitErr.atomName).toBe('addSubmodule')
      expect(gitErr.command).toBe('unknown')
      expect(gitErr.exitCode).toBe(1)
      expect(gitErr.stderr).toBe('something went wrong')
    }
  })

  it('re-throws non-git errors unchanged', async () => {
    const regularError = new Error('not a git error')

    await expect(
      withGitError('someAtom', async () => {
        throw regularError
      }),
    ).rejects.toBe(regularError)
  })

  it('re-throws non-Error values unchanged', async () => {
    await expect(
      withGitError('someAtom', async () => {
        throw 'string error'
      }),
    ).rejects.toBe('string error')
  })
})
