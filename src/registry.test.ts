/**
 * Tests for the programmatic scenario registry.
 */

import {
    registerScenario,
    registerScenarios,
    unregisterScenario,
    listRegistered,
    findRegistered,
    findRegisteredByTag,
    resetRegistry,
} from './registry'
import { defineScenario } from './atoms'
import { chain, addCommit } from './atoms'
import { spinUpScenario } from './spinUpScenario'
import type { TempGitRepo } from './tempGitRepo'

const customScenario = defineScenario({
  name: 'test-custom-scenario',
  summary: 'A custom scenario for testing registration',
  description: 'Used in registry tests to verify custom scenario registration works.',
  kind: 'branch',
  tags: ['custom', 'test'],
  setup: chain(
    addCommit({ message: 'custom init', files: { 'custom.ts': 'export const custom = true\n' } }),
  ),
})

describe('registry', () => {
  afterEach(() => {
    // Reset after each test to avoid leaking between tests
    resetRegistry()
  })

  describe('registerScenario', () => {
    it('registers a custom scenario', () => {
      registerScenario(customScenario)
      const found = findRegistered('test-custom-scenario')
      expect(found).toBeDefined()
      expect(found!.name).toBe('test-custom-scenario')
    })

    it('throws on duplicate name', () => {
      registerScenario(customScenario)
      expect(() => registerScenario(customScenario)).toThrow(
        /already registered/,
      )
    })

    it('throws when shadowing a built-in scenario', () => {
      const shadow = defineScenario({
        name: 'empty-repo',
        summary: 'shadow',
        description: 'shadow of built-in',
        kind: 'branch',
        setup: chain(),
      })
      expect(() => registerScenario(shadow)).toThrow(/already registered/)
    })
  })

  describe('registerScenarios', () => {
    it('registers multiple scenarios at once', () => {
      const second = defineScenario({
        name: 'test-second-custom',
        summary: 'Second custom',
        description: 'Another custom scenario.',
        kind: 'branch',
        setup: chain(addCommit({ message: 'init', files: { 'a.ts': 'a\n' } })),
      })

      registerScenarios([customScenario, second])
      expect(findRegistered('test-custom-scenario')).toBeDefined()
      expect(findRegistered('test-second-custom')).toBeDefined()
    })
  })

  describe('unregisterScenario', () => {
    it('removes a registered scenario', () => {
      registerScenario(customScenario)
      expect(unregisterScenario('test-custom-scenario')).toBe(true)
      expect(findRegistered('test-custom-scenario')).toBeUndefined()
    })

    it('returns false for unknown names', () => {
      expect(unregisterScenario('nonexistent-xyz')).toBe(false)
    })

    it('allows re-registration after unregister', () => {
      registerScenario(customScenario)
      unregisterScenario('test-custom-scenario')
      // Should not throw now
      registerScenario(customScenario)
      expect(findRegistered('test-custom-scenario')).toBeDefined()
    })

    it('can remove built-in scenarios', () => {
      expect(findRegistered('empty-repo')).toBeDefined()
      unregisterScenario('empty-repo')
      expect(findRegistered('empty-repo')).toBeUndefined()
    })
  })

  describe('listRegistered', () => {
    it('includes built-in scenarios', () => {
      const list = listRegistered()
      expect(list.length).toBeGreaterThanOrEqual(27)
      expect(list.some((s) => s.name === 'feature-pr-ready')).toBe(true)
    })

    it('includes custom scenarios after registration', () => {
      registerScenario(customScenario)
      const list = listRegistered()
      expect(list.some((s) => s.name === 'test-custom-scenario')).toBe(true)
    })
  })

  describe('resetRegistry', () => {
    it('removes custom scenarios and restores built-ins', () => {
      registerScenario(customScenario)
      unregisterScenario('empty-repo')

      resetRegistry()

      expect(findRegistered('test-custom-scenario')).toBeUndefined()
      expect(findRegistered('empty-repo')).toBeDefined()
    })
  })

  describe('findRegisteredByTag', () => {
    it('finds built-in scenarios by tag', () => {
      const conflicts = findRegisteredByTag(['conflict'])
      expect(conflicts.length).toBeGreaterThanOrEqual(3)
      for (const s of conflicts) {
        expect(s.tags).toContain('conflict')
      }
    })

    it('finds custom-registered scenarios by tag', () => {
      registerScenario(customScenario)
      const results = findRegisteredByTag(['custom'])
      expect(results.some((s) => s.name === 'test-custom-scenario')).toBe(true)
    })

    it('honors match: all', () => {
      const merge = findRegisteredByTag(['conflict', 'merge'], 'all')
      expect(merge.length).toBeGreaterThanOrEqual(1)
      for (const s of merge) {
        expect(s.tags).toContain('conflict')
        expect(s.tags).toContain('merge')
      }
    })

    it('returns empty array for no matches', () => {
      expect(findRegisteredByTag(['nonexistent-xyz-tag'])).toEqual([])
    })
  })

  describe('integration with spinUpScenario', () => {
    let repo: TempGitRepo

    afterEach(async () => {
      await repo?.cleanup()
    })

    it('spinUpScenario finds custom-registered scenarios', async () => {
      registerScenario(customScenario)
      repo = await spinUpScenario('test-custom-scenario')

      const log = await repo.git.log()
      expect(log.latest?.message).toBe('custom init')
    })
  })
})
