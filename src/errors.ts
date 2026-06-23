/**
 * Base error class for all git-scenarios errors.
 * Consumers can catch this to handle any library-specific error.
 */
export class GitScenariosError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'GitScenariosError'
    this.code = code
  }
}

/**
 * Thrown when a scenario name is not found in the registry.
 */
export class ScenarioNotFoundError extends GitScenariosError {
  readonly scenarioName: string
  readonly availableScenarios: string[]

  constructor(scenarioName: string, availableScenarios: string[]) {
    super(
      `Unknown scenario "${scenarioName}". Available: ${availableScenarios.join(', ')}`,
      'SCENARIO_NOT_FOUND',
    )
    this.name = 'ScenarioNotFoundError'
    this.scenarioName = scenarioName
    this.availableScenarios = availableScenarios
  }
}

/**
 * Thrown when a git command fails during atom execution.
 */
export class GitCommandError extends GitScenariosError {
  readonly command: string
  readonly exitCode: number
  readonly stderr: string
  readonly atomName?: string

  constructor(opts: {
    command: string
    exitCode: number
    stderr: string
    atomName?: string
  }) {
    const prefix = opts.atomName ? `[${opts.atomName}] ` : ''
    super(
      `${prefix}Git command failed: "${opts.command}" exited with code ${opts.exitCode}\n${opts.stderr}`,
      'GIT_COMMAND_FAILED',
    )
    this.name = 'GitCommandError'
    this.command = opts.command
    this.exitCode = opts.exitCode
    this.stderr = opts.stderr
    this.atomName = opts.atomName
  }
}

/**
 * Thrown by the `assertRepo(...)` fluent assertion API when a repo's
 * state doesn't match an expectation. Carries the human-readable
 * mismatch plus the structured `expected` / `actual` values so callers
 * (and the test matchers built on top) can render rich diffs.
 */
export class RepoAssertionError extends GitScenariosError {
  readonly assertion: string
  readonly expected: unknown
  readonly actual: unknown

  constructor(opts: { assertion: string; expected: unknown; actual: unknown; message: string }) {
    super(opts.message, 'REPO_ASSERTION_FAILED')
    this.name = 'RepoAssertionError'
    this.assertion = opts.assertion
    this.expected = opts.expected
    this.actual = opts.actual
  }
}

/**
 * Thrown when an atom receives invalid arguments.
 */
export class InvalidArgumentError extends GitScenariosError {
  readonly parameterName: string
  readonly constraint: string
  readonly atomName?: string

  constructor(opts: {
    parameterName: string
    constraint: string
    atomName?: string
  }) {
    const prefix = opts.atomName ? `[${opts.atomName}] ` : ''
    super(
      `${prefix}Invalid argument "${opts.parameterName}": ${opts.constraint}`,
      'INVALID_ARGUMENT',
    )
    this.name = 'InvalidArgumentError'
    this.parameterName = opts.parameterName
    this.constraint = opts.constraint
    this.atomName = opts.atomName
  }
}
