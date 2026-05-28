import {
    GitScenariosError,
    ScenarioNotFoundError,
    GitCommandError,
    InvalidArgumentError,
} from './errors'

describe('GitScenariosError', () => {
  it('sets name, message, and code', () => {
    const err = new GitScenariosError('something broke', 'GENERIC')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('GitScenariosError')
    expect(err.message).toBe('something broke')
    expect(err.code).toBe('GENERIC')
  })
})

describe('ScenarioNotFoundError', () => {
  it('extends GitScenariosError with lookup context', () => {
    const err = new ScenarioNotFoundError('nonexistent', ['foo', 'bar', 'baz'])
    expect(err).toBeInstanceOf(GitScenariosError)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ScenarioNotFoundError')
    expect(err.code).toBe('SCENARIO_NOT_FOUND')
    expect(err.scenarioName).toBe('nonexistent')
    expect(err.availableScenarios).toEqual(['foo', 'bar', 'baz'])
    expect(err.message).toContain('nonexistent')
    expect(err.message).toContain('foo, bar, baz')
  })
})

describe('GitCommandError', () => {
  it('extends GitScenariosError with command details', () => {
    const err = new GitCommandError({
      command: 'git merge feature',
      exitCode: 128,
      stderr: 'fatal: not a git repository',
      atomName: 'startMerge',
    })
    expect(err).toBeInstanceOf(GitScenariosError)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('GitCommandError')
    expect(err.code).toBe('GIT_COMMAND_FAILED')
    expect(err.command).toBe('git merge feature')
    expect(err.exitCode).toBe(128)
    expect(err.stderr).toBe('fatal: not a git repository')
    expect(err.atomName).toBe('startMerge')
    expect(err.message).toContain('[startMerge]')
    expect(err.message).toContain('git merge feature')
    expect(err.message).toContain('128')
  })

  it('omits atom prefix when atomName is not provided', () => {
    const err = new GitCommandError({
      command: 'git status',
      exitCode: 1,
      stderr: 'error output',
    })
    expect(err.atomName).toBeUndefined()
    expect(err.message).not.toContain('[')
  })
})

describe('InvalidArgumentError', () => {
  it('extends GitScenariosError with parameter details', () => {
    const err = new InvalidArgumentError({
      parameterName: 'branchName',
      constraint: 'must not be empty',
      atomName: 'switchToBranch',
    })
    expect(err).toBeInstanceOf(GitScenariosError)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('InvalidArgumentError')
    expect(err.code).toBe('INVALID_ARGUMENT')
    expect(err.parameterName).toBe('branchName')
    expect(err.constraint).toBe('must not be empty')
    expect(err.atomName).toBe('switchToBranch')
    expect(err.message).toContain('[switchToBranch]')
    expect(err.message).toContain('branchName')
    expect(err.message).toContain('must not be empty')
  })

  it('omits atom prefix when atomName is not provided', () => {
    const err = new InvalidArgumentError({
      parameterName: 'count',
      constraint: 'must be positive',
    })
    expect(err.atomName).toBeUndefined()
    expect(err.message).not.toContain('[')
  })
})
