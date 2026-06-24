import { scoreScenario, filterScenarios, renderPreview } from './interactive'
import type { Scenario } from './scenarios/types'

function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    name: 'feature-pr-ready',
    summary: 'A feature branch ready for a PR',
    description: 'Detailed description.',
    kind: 'branch',
    tags: ['feature-branch', 'pr-ready'],
    setup: async () => { /* no-op */ },
    ...overrides,
  }
}

describe('scoreScenario', () => {
  it('returns 0 for empty query', () => {
    expect(scoreScenario('', makeScenario())).toBe(0)
  })

  it('returns -1 when query does not match', () => {
    expect(scoreScenario('zzz', makeScenario())).toBe(-1)
  })

  it('returns a positive score for matching name', () => {
    expect(scoreScenario('feat', makeScenario())).toBeGreaterThan(0)
  })

  it('matches against tags', () => {
    expect(scoreScenario('pr', makeScenario())).toBeGreaterThan(0)
  })

  it('matches against summary', () => {
    expect(scoreScenario('branch', makeScenario())).toBeGreaterThan(0)
  })

  it('returns -1 if any character in the query is missing from the haystack', () => {
    expect(scoreScenario('feaXXXt', makeScenario({ name: 'feature', summary: 'test', tags: [] }))).toBe(-1)
  })

  it('scores consecutive characters higher', () => {
    const s = makeScenario({ name: 'abcdef', summary: '', tags: [] })
    const consecutive = scoreScenario('abc', s)
    const scattered = scoreScenario('adf', s)
    expect(consecutive).toBeGreaterThan(scattered)
  })
})

describe('filterScenarios', () => {
  const scenarios: Scenario[] = [
    makeScenario({
      name: 'feature-pr-ready',
      summary: 'Feature branch ready for PR',
      kind: 'branch',
      tags: ['feature', 'pr-ready'],
    }),
    makeScenario({
      name: 'mid-merge-conflict',
      summary: 'Merge conflict in progress',
      kind: 'operation',
      tags: ['conflict', 'merge'],
    }),
    makeScenario({
      name: 'empty-repo',
      summary: 'Fresh empty repository',
      kind: 'branch',
      tags: [],
    }),
  ]

  it('returns all scenarios for empty query in original order', () => {
    const result = filterScenarios('', scenarios)
    expect(result).toHaveLength(3)
    expect(result[0].name).toBe('feature-pr-ready')
  })

  it('filters to scenarios that match the query', () => {
    const result = filterScenarios('merge', scenarios)
    expect(result.some((s) => s.name === 'mid-merge-conflict')).toBe(true)
    expect(result.some((s) => s.name === 'empty-repo')).toBe(false)
  })

  it('returns empty array when nothing matches', () => {
    expect(filterScenarios('xyzzy', scenarios)).toHaveLength(0)
  })

  it('ranks closest matches first', () => {
    const result = filterScenarios('feat', scenarios)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].name).toBe('feature-pr-ready')
  })

  it('matches tags', () => {
    const result = filterScenarios('conflict', scenarios)
    expect(result.some((s) => s.name === 'mid-merge-conflict')).toBe(true)
  })

  it('does not mutate the input array', () => {
    const original = [...scenarios]
    filterScenarios('feat', scenarios)
    expect(scenarios).toEqual(original)
  })
})

describe('renderPreview', () => {
  it('includes name, kind, and summary', () => {
    const s = makeScenario({ name: 'my-scenario', kind: 'branch', summary: 'My summary' })
    const text = renderPreview(s)
    expect(text).toContain('my-scenario')
    expect(text).toContain('branch')
    expect(text).toContain('My summary')
  })

  it('includes tags when present', () => {
    const s = makeScenario({ tags: ['foo', 'bar'] })
    const text = renderPreview(s)
    expect(text).toContain('Tags:')
    expect(text).toContain('foo')
    expect(text).toContain('bar')
  })

  it('omits tags section when tags is empty', () => {
    const s = makeScenario({ tags: [] })
    const text = renderPreview(s)
    expect(text).not.toContain('Tags:')
  })

  it('omits tags section when tags is undefined', () => {
    const s = makeScenario({ tags: undefined })
    const text = renderPreview(s)
    expect(text).not.toContain('Tags:')
  })

  it('includes contracts when present', () => {
    const s = makeScenario({ contracts: ['main has 3 commits', 'worktree is clean'] })
    const text = renderPreview(s)
    expect(text).toContain('Contracts:')
    expect(text).toContain('main has 3 commits')
    expect(text).toContain('worktree is clean')
  })

  it('omits contracts section when contracts is undefined', () => {
    const s = makeScenario({ contracts: undefined })
    const text = renderPreview(s)
    expect(text).not.toContain('Contracts:')
  })

  it('returns a multi-line string', () => {
    const s = makeScenario()
    const lines = renderPreview(s).split('\n')
    expect(lines.length).toBeGreaterThan(1)
  })
})
