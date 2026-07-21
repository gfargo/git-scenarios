/**
 * Tests for `verifyContracts` — verifies that every built-in scenario's
 * declared contracts pass against its materialized repo.
 *
 * This is the CI guard described in issue #36: if a scenario's setup
 * drifts from its stated contracts, this test catches it.
 */

import { spinUpScenario } from './spinUpScenario'
import { verifyContracts, type VerifyContractsResult } from './verifyContracts'
import { allScenarios } from './scenarios'
import type { Scenario } from './scenarios/types'
import type { TempGitRepo } from './tempGitRepo'

// Use a longer timeout — some scenarios (large-repo, submodules) take a while
jest.setTimeout(60_000)

describe('verifyContracts', () => {
  // Test each scenario individually so failures name the broken contract
  for (const scenario of allScenarios) {
    if (!scenario.contracts || scenario.contracts.length === 0) {
      it.skip(`${scenario.name} — no contracts declared`, () => {})
      continue
    }

    describe(scenario.name, () => {
      let repo: TempGitRepo
      let result: VerifyContractsResult

      beforeAll(async () => {
        repo = await spinUpScenario(scenario.name)
        result = await verifyContracts(repo, scenario)
      })

      afterAll(async () => {
        await repo?.cleanup()
      })

      it('all contracts pass', () => {
        const failures = result.results.filter((r) => !r.pass)
        if (failures.length > 0) {
          const details = failures
            .map((f) => `  - "${f.contract}": ${f.message}`)
            .join('\n')
          throw new Error(
            `${failures.length} contract(s) failed for "${scenario.name}":\n${details}`,
          )
        }
      })

      it('reports contract verification results', () => {
        // Most scenarios should have at least one machine-verified contract.
        // Some (like submodule scenarios) may only have domain-specific
        // contracts that don't match our grammar — that's acceptable.
        expect(result.results.length).toBeGreaterThan(0)
      })
    })
  }
})

describe('verifyContracts — unit tests', () => {
  let repo: TempGitRepo

  afterEach(async () => {
    await repo?.cleanup()
  })

  it('returns allPassed: true for a passing scenario', async () => {
    repo = await spinUpScenario('feature-pr-ready')
    const scenario = allScenarios.find((s) => s.name === 'feature-pr-ready')!
    const result = await verifyContracts(repo, scenario)
    expect(result.allPassed).toBe(true)
    expect(result.scenario).toBe('feature-pr-ready')
    expect(result.results.length).toBe(scenario.contracts!.length)
  })

  it('returns allPassed: true and empty results for a scenario with no contracts', async () => {
    repo = await spinUpScenario('feature-pr-ready')
    const noContractScenario: Scenario = {
      name: 'test-no-contracts',
      summary: 'test',
      description: 'test',
      kind: 'branch',
      setup: async () => {},
    }
    const result = await verifyContracts(repo, noContractScenario)
    expect(result.allPassed).toBe(true)
    expect(result.results).toHaveLength(0)
  })

  it('reports unrecognized contracts as unverified but passing', async () => {
    repo = await spinUpScenario('feature-pr-ready')
    const customScenario: Scenario = {
      name: 'test-custom',
      summary: 'test',
      description: 'test',
      kind: 'branch',
      setup: async () => {},
      contracts: ['some freeform documentation string'],
    }
    const result = await verifyContracts(repo, customScenario)
    expect(result.allPassed).toBe(true)
    expect(result.unrecognizedCount).toBe(1)
    expect(result.results[0].verified).toBe(false)
  })

  it('reports a failure when a contract does not match reality', async () => {
    repo = await spinUpScenario('feature-pr-ready')
    const wrongScenario: Scenario = {
      name: 'test-wrong',
      summary: 'test',
      description: 'test',
      kind: 'branch',
      setup: async () => {},
      contracts: ['main has 99 commits'],
    }
    const result = await verifyContracts(repo, wrongScenario)
    expect(result.allPassed).toBe(false)
    expect(result.results[0].pass).toBe(false)
    expect(result.results[0].verified).toBe(true)
  })
})
