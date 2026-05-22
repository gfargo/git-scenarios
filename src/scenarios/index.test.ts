import { allScenarios, findScenario, findScenariosByTag } from './index'

describe('scenarios registry', () => {
  it('exposes a non-empty list of scenarios', () => {
    expect(allScenarios.length).toBeGreaterThan(0)
  })

  it('has unique scenario names', () => {
    const names = allScenarios.map((s) => s.name)
    const unique = new Set(names)
    expect(unique.size).toBe(names.length)
  })

  it('uses kebab-case names', () => {
    for (const scenario of allScenarios) {
      expect(scenario.name).toMatch(/^[a-z][a-z0-9-]*$/)
    }
  })

  it('every scenario has a non-empty summary and description', () => {
    for (const scenario of allScenarios) {
      expect(scenario.summary.trim()).not.toBe('')
      expect(scenario.description.trim()).not.toBe('')
    }
  })

  it('every scenario declares a valid kind', () => {
    const validKinds = new Set(['branch', 'worktree', 'operation', 'history', 'stash', 'submodule'])
    for (const scenario of allScenarios) {
      expect(validKinds.has(scenario.kind)).toBe(true)
    }
  })

  it('includes the new conflict scenarios', () => {
    expect(findScenario('mid-rebase-conflict')).toBeDefined()
    expect(findScenario('mid-cherry-pick-conflict')).toBeDefined()
  })

  describe('findScenario', () => {
    it('returns the scenario for a known name', () => {
      const result = findScenario('feature-pr-ready')
      expect(result).toBeDefined()
      expect(result?.name).toBe('feature-pr-ready')
    })

    it('returns undefined for an unknown name', () => {
      expect(findScenario('does-not-exist')).toBeUndefined()
    })
  })

  describe('findScenariosByTag', () => {
    it('returns scenarios matching any of the given tags', () => {
      const results = findScenariosByTag(['conflict'])
      expect(results.length).toBeGreaterThanOrEqual(3) // merge, rebase, cherry-pick
      for (const s of results) {
        expect(s.tags).toContain('conflict')
      }
    })

    it('returns scenarios matching all tags when match is "all"', () => {
      const results = findScenariosByTag(['conflict', 'merge'], 'all')
      expect(results.length).toBeGreaterThanOrEqual(1)
      for (const s of results) {
        expect(s.tags).toContain('conflict')
        expect(s.tags).toContain('merge')
      }
    })

    it('returns empty array when no scenarios match', () => {
      const results = findScenariosByTag(['nonexistent-tag-xyz'])
      expect(results).toEqual([])
    })

    it('returns empty for scenarios without tags', () => {
      // Scenarios without tags should never match
      const results = findScenariosByTag(['conflict'])
      for (const s of results) {
        expect(s.tags).toBeDefined()
        expect(s.tags!.length).toBeGreaterThan(0)
      }
    })
  })
})
