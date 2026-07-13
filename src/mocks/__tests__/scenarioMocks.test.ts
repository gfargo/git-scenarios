import { parseContracts, mockFromScenario } from '../scenarioMocks'
import { InvalidArgumentError } from '../../errors'

describe('parseContracts', () => {
  it('parses commit count pattern', () => {
    const result = parseContracts(['main has 2 commits'])
    expect(result.commitCount).toBe(2)
  })

  it('parses singular commit pattern', () => {
    const result = parseContracts(['main has 1 commit'])
    expect(result.commitCount).toBe(1)
  })

  it('parses commit count pattern for a slashed branch name', () => {
    const result = parseContracts(['feat/widget-v2 has 3 commits'])
    expect(result.commitCount).toBe(3)
  })

  it('parses staged count pattern', () => {
    const result = parseContracts(['exactly 3 staged files'])
    expect(result.stagedCount).toBe(3)
  })

  it('parses singular staged file pattern', () => {
    const result = parseContracts(['exactly 1 staged file'])
    expect(result.stagedCount).toBe(1)
  })

  it('parses modified-but-unstaged count pattern', () => {
    const result = parseContracts(['exactly 2 modified-but-unstaged files'])
    expect(result.modifiedCount).toBe(2)
  })

  it('parses untracked count pattern', () => {
    const result = parseContracts(['exactly 1 untracked file'])
    expect(result.untrackedCount).toBe(1)
  })

  it('parses branch count pattern', () => {
    const result = parseContracts(['3 branches exist'])
    expect(result.branchCount).toBe(3)
  })

  it('parses singular branch count pattern', () => {
    const result = parseContracts(['1 branch exist'])
    expect(result.branchCount).toBe(1)
  })

  it('parses current branch pattern', () => {
    const result = parseContracts(['current branch is feature/login'])
    expect(result.currentBranch).toBe('feature/login')
  })

  it('parses on branch pattern', () => {
    const result = parseContracts(['on branch main'])
    expect(result.currentBranch).toBe('main')
  })

  it('parses operation active pattern', () => {
    const result = parseContracts(['merge is active'])
    expect(result.operation).toBe('merge')
  })

  it('parses rebase operation pattern', () => {
    const result = parseContracts(['rebase is active'])
    expect(result.operation).toBe('rebase')
  })

  it('parses HEAD is detached pattern', () => {
    const result = parseContracts(['HEAD is detached'])
    expect(result.detached).toBe(true)
  })

  it('parses stash count pattern', () => {
    const result = parseContracts(['2 stashes exist'])
    expect(result.stashCount).toBe(2)
  })

  it('parses singular stash pattern', () => {
    const result = parseContracts(['1 stash saved'])
    expect(result.stashCount).toBe(1)
  })

  it('parses conflicted count pattern', () => {
    const result = parseContracts(['exactly 3 conflicted files'])
    expect(result.conflictedCount).toBe(3)
  })

  it('parses multiple contracts together', () => {
    const result = parseContracts([
      'main has 2 commits',
      'exactly 2 staged files',
      'exactly 2 modified-but-unstaged files',
      'exactly 1 untracked file',
    ])
    expect(result.commitCount).toBe(2)
    expect(result.stagedCount).toBe(2)
    expect(result.modifiedCount).toBe(2)
    expect(result.untrackedCount).toBe(1)
  })

  it('returns empty object for unrecognized contracts', () => {
    const result = parseContracts(['something completely unknown'])
    expect(result).toEqual({})
  })
})

describe('mockFromScenario', () => {
  it('derives mocks from partial-stage scenario', () => {
    const result = mockFromScenario('partial-stage')

    // StatusResult
    expect(result.status.current).toBe('main')
    expect(result.status.staged).toHaveLength(2)
    expect(result.status.modified).toHaveLength(2)
    expect(result.status.not_added).toHaveLength(1)

    // LogResult
    expect(result.log.total).toBe(2)
    expect(result.log.all).toHaveLength(2)

    // BranchSummary
    expect(result.branches.current).toBe('main')
    expect(result.branches.all).toContain('main')
  })

  it('generates placeholder file paths with expected naming', () => {
    const result = mockFromScenario('partial-stage')

    expect(result.status.staged).toEqual(['staged-1.ts', 'staged-2.ts'])
    expect(result.status.modified).toEqual(['modified-1.ts', 'modified-2.ts'])
    expect(result.status.not_added).toEqual(['untracked-1.ts'])
  })

  it('throws InvalidArgumentError for unknown scenario name', () => {
    expect(() => mockFromScenario('nonexistent-scenario')).toThrow(InvalidArgumentError)
    expect(() => mockFromScenario('nonexistent-scenario')).toThrow(
      /not found in registry/
    )
  })

  it('throws InvalidArgumentError for scenario with no contracts', () => {
    // empty-repo has no contracts that match the patterns
    // We need to find a scenario without contracts or mock this
    // Let's test with a scenario name that exists but has empty contracts
    // The empty-repo scenario may not have contracts — let's verify behavior
    expect(() => mockFromScenario('empty-repo')).toThrow(InvalidArgumentError)
  })
})
