/**
 * Scenario-derived mock generation.
 *
 * Parses a scenario's `contracts` array and derives `StatusResult`,
 * `LogResult`, and `BranchSummary` mocks using the existing factories.
 * This allows consumers to get realistic mock objects that match a
 * scenario's documented state without spinning up a real git repo.
 *
 * @module
 */

import type { StatusResult, BranchSummary, DefaultLogFields, LogResult } from 'simple-git'
import { allScenarios } from '../scenarios/index'
import { InvalidArgumentError } from '../errors'
import { mockStatusResult } from './statusFactory'
import { mockLogResult } from './logFactory'
import { mockBranchSummary } from './branchFactory'

/**
 * Structured data extracted from a scenario's contracts array.
 * Each field is optional — only populated when a matching contract is found.
 */
type ParsedContracts = {
  commitCount?: number
  stagedCount?: number
  modifiedCount?: number
  untrackedCount?: number
  branchCount?: number
  currentBranch?: string
  operation?: string
  detached?: boolean
  stashCount?: number
  conflictedCount?: number
}

/**
 * Contract regex patterns and their corresponding extracted field.
 * Each pattern is tried against every contract string in order.
 */
const CONTRACT_PATTERNS: Array<{
  pattern: RegExp
  extract: keyof ParsedContracts
}> = [
  { pattern: /^(\w+) has (\d+) commits?$/, extract: 'commitCount' },
  { pattern: /^exactly (\d+) staged files?$/, extract: 'stagedCount' },
  { pattern: /^exactly (\d+) modified-but-unstaged files?$/, extract: 'modifiedCount' },
  { pattern: /^exactly (\d+) untracked files?$/, extract: 'untrackedCount' },
  { pattern: /^(\d+) branch(?:es)? exist$/, extract: 'branchCount' },
  { pattern: /^(?:on|current) branch (?:is )?["']?(\w[\w/-]*)["']?$/, extract: 'currentBranch' },
  { pattern: /^(\w[\w/-]*) is checked out$/, extract: 'currentBranch' },
  { pattern: /^(bisect|merge|rebase|cherry-pick|revert) is active$/, extract: 'operation' },
  { pattern: /^a (merge|rebase|cherry-pick|revert) is in progress/, extract: 'operation' },
  { pattern: /^HEAD is detached/, extract: 'detached' },
  { pattern: /^(\d+) stash(?:es)? (?:exist|saved)$/, extract: 'stashCount' },
  { pattern: /^exactly (\d+) conflicted files?$/, extract: 'conflictedCount' },
  { pattern: /^exactly (\d+) unresolved conflicts?$/, extract: 'conflictedCount' },
]

/**
 * Generate placeholder file paths for a given count.
 * Produces paths like `file-1.ts`, `file-2.ts`, etc.
 */
function generateFilePaths(count: number, prefix = 'file'): string[] {
  const paths: string[] = []
  for (let i = 1; i <= count; i++) {
    paths.push(`${prefix}-${i}.ts`)
  }
  return paths
}

/**
 * Parse a scenario's contracts array into structured data.
 *
 * Each contract string is tested against all known patterns. When a
 * match is found, the extracted value is stored in the result object.
 * Contracts that don't match any pattern are silently ignored.
 *
 * @param contracts - Array of human-readable contract strings
 * @returns Parsed structured data with matched fields populated
 */
export function parseContracts(contracts: string[]): ParsedContracts {
  const result: ParsedContracts = {}

  for (const contract of contracts) {
    for (const { pattern, extract } of CONTRACT_PATTERNS) {
      const match = contract.match(pattern)
      if (!match) continue

      switch (extract) {
        case 'commitCount':
          // Pattern: "<branch> has <N> commits" — capture group 2 is the count
          result.commitCount = parseInt(match[2], 10)
          break
        case 'stagedCount':
          result.stagedCount = parseInt(match[1], 10)
          break
        case 'modifiedCount':
          result.modifiedCount = parseInt(match[1], 10)
          break
        case 'untrackedCount':
          result.untrackedCount = parseInt(match[1], 10)
          break
        case 'branchCount':
          result.branchCount = parseInt(match[1], 10)
          break
        case 'currentBranch':
          result.currentBranch = match[1]
          break
        case 'operation':
          result.operation = match[1]
          break
        case 'detached':
          result.detached = true
          break
        case 'stashCount':
          result.stashCount = parseInt(match[1], 10)
          break
        case 'conflictedCount':
          result.conflictedCount = parseInt(match[1], 10)
          break
      }

      // First match wins for a given contract line
      break
    }
  }

  return result
}

/**
 * The result of deriving mocks from a scenario's contracts.
 */
export type ScenarioMockResult = {
  status: StatusResult
  log: LogResult<DefaultLogFields>
  branches: BranchSummary
}

/**
 * Look up a scenario by name, parse its contracts, and construct
 * mock objects (`StatusResult`, `LogResult`, `BranchSummary`) that
 * reflect the scenario's documented state.
 *
 * When contracts don't specify a field, sensible defaults are used
 * (e.g., 1 commit if no commit count contract exists). Throws
 * `InvalidArgumentError` when:
 * - The scenario name is not found in the registry
 * - The scenario has no contracts or no contracts match any pattern
 *
 * @param scenarioName - The kebab-case name of the scenario to derive mocks from
 * @returns An object with `status`, `log`, and `branches` mock results
 * @throws InvalidArgumentError when scenario not found or has no parseable contracts
 */
export function mockFromScenario(scenarioName: string): ScenarioMockResult {
  const scenario = allScenarios.find((s) => s.name === scenarioName)

  if (!scenario) {
    throw new InvalidArgumentError({
      parameterName: 'scenarioName',
      constraint: `Scenario "${scenarioName}" not found in registry`,
      atomName: 'mockFromScenario',
    })
  }

  const contracts = scenario.contracts
  if (!contracts || contracts.length === 0) {
    throw new InvalidArgumentError({
      parameterName: 'scenarioName',
      constraint: `Scenario "${scenarioName}" has no contracts to parse`,
      atomName: 'mockFromScenario',
    })
  }

  const parsed = parseContracts(contracts)

  // Check that at least one field was parsed
  const hasAnyParsed = Object.keys(parsed).length > 0
  if (!hasAnyParsed) {
    throw new InvalidArgumentError({
      parameterName: 'scenarioName',
      constraint: `Scenario "${scenarioName}" has no parseable contracts`,
      atomName: 'mockFromScenario',
    })
  }

  // Derive StatusResult
  const currentBranch = parsed.currentBranch ?? 'main'
  const staged = parsed.stagedCount ? generateFilePaths(parsed.stagedCount, 'staged') : []
  const modified = parsed.modifiedCount ? generateFilePaths(parsed.modifiedCount, 'modified') : []
  const not_added = parsed.untrackedCount
    ? generateFilePaths(parsed.untrackedCount, 'untracked')
    : []
  const conflicted = parsed.conflictedCount
    ? generateFilePaths(parsed.conflictedCount, 'conflicted')
    : []

  const status = mockStatusResult({
    current: currentBranch,
    staged,
    modified,
    not_added,
    conflicted,
    detached: parsed.detached ?? false,
  })

  // Derive LogResult — default to 1 commit if not specified
  const commitCount = parsed.commitCount ?? 1
  const log = mockLogResult({ count: commitCount })

  // Derive BranchSummary
  const branchCount = parsed.branchCount ?? 1
  const branches: Array<string> = []
  // Always include current branch first
  branches.push(currentBranch)
  // Fill remaining branches with generated names
  for (let i = 1; i < branchCount; i++) {
    branches.push(`branch-${i}`)
  }

  const branchSummary = mockBranchSummary({
    current: currentBranch,
    branches,
    detached: parsed.detached ?? false,
  })

  return {
    status,
    log,
    branches: branchSummary,
  }
}
