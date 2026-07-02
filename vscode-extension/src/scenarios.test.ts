import { listScenarios } from './scenarios'
import { isScenarioDir, CURRENT_PREFIX, LEGACY_PREFIX, CACHE_DIR_NAME } from './cleanup'

describe('listScenarios()', () => {
  it('returns a non-empty list', () => {
    expect(listScenarios().length).toBeGreaterThan(0)
  })

  it('maps each scenario to { label, description, detail }', () => {
    for (const item of listScenarios()) {
      expect(typeof item.label).toBe('string')
      expect(item.label.length).toBeGreaterThan(0)
      expect(typeof item.description).toBe('string')
      expect(typeof item.detail).toBe('string')
    }
  })

  it('uses scenario name as label', () => {
    const items = listScenarios()
    expect(items[0].label).toBe('feature-pr-ready')
  })

  it('uses scenario kind as description', () => {
    const items = listScenarios()
    expect(items[0].description).toBe('branch')
  })

  it('uses scenario summary as detail', () => {
    const items = listScenarios()
    expect(items[0].detail).toBe('Branch with one ahead commit and staged files')
  })
})

describe('isScenarioDir()', () => {
  it('matches the current prefix', () => {
    expect(isScenarioDir(`${CURRENT_PREFIX}abc123`)).toBe(true)
    expect(isScenarioDir(`${CURRENT_PREFIX}feature-pr-ready-xyz`)).toBe(true)
  })

  it('matches the legacy prefix', () => {
    expect(isScenarioDir(`${LEGACY_PREFIX}old-repo`)).toBe(true)
  })

  it('excludes the cache directory name', () => {
    expect(isScenarioDir(CACHE_DIR_NAME)).toBe(false)
  })

  it('excludes unrelated directory names', () => {
    expect(isScenarioDir('my-project')).toBe(false)
    expect(isScenarioDir('tmp-workspace')).toBe(false)
    expect(isScenarioDir('some-other-tool-abc')).toBe(false)
    expect(isScenarioDir('')).toBe(false)
  })
})
