/**
 * Smoke test for the AVA adapter.
 *
 * AVA isn't installed in this project (we use Jest), so we can't run
 * the adapter end-to-end. But we CAN verify:
 *   1. The module exports the expected surface
 *   2. withScenario returns a handle with setup/cleanup/getRepo
 *   3. getRepo throws before setup runs
 *   4. setup/cleanup actually work (they use the same internals as
 *      spinUpScenario, which is well-tested)
 */

import { withScenario, withScenarios } from './ava'

describe('ava adapter', () => {
  describe('withScenario', () => {
    it('exports withScenario as a function', () => {
      expect(typeof withScenario).toBe('function')
    })

    it('returns a handle with setup, cleanup, getRepo', () => {
      const handle = withScenario('empty-repo')
      expect(typeof handle.setup).toBe('function')
      expect(typeof handle.cleanup).toBe('function')
      expect(typeof handle.getRepo).toBe('function')
    })

    it('getRepo throws before setup is called', () => {
      const handle = withScenario('empty-repo')
      expect(() => handle.getRepo()).toThrow(/before setup/)
    })

    it('setup + getRepo + cleanup lifecycle works', async () => {
      const handle = withScenario('feature-pr-ready')
      await handle.setup()
      try {
        const repo = handle.getRepo()
        expect(repo.path).toBeDefined()
        expect(typeof repo.git.status).toBe('function')
        const status = await repo.git.status()
        expect(status.current).toBe('feat/widget-v2')
      } finally {
        await handle.cleanup()
      }
      // After cleanup, getRepo throws again
      expect(() => handle.getRepo()).toThrow(/before setup/)
    })

    it('throws on unknown scenario name', async () => {
      const handle = withScenario('totally-fake-xyz')
      await expect(handle.setup()).rejects.toThrow(/Unknown scenario/)
    })
  })

  describe('withScenarios', () => {
    it('exports withScenarios as a function', () => {
      expect(typeof withScenarios).toBe('function')
    })

    it('returns a handle per scenario name', () => {
      const handles = withScenarios(['empty-repo', 'feature-pr-ready'])
      expect(Object.keys(handles)).toEqual(['empty-repo', 'feature-pr-ready'])
      expect(typeof handles['empty-repo'].setup).toBe('function')
      expect(typeof handles['feature-pr-ready'].getRepo).toBe('function')
    })
  })
})
