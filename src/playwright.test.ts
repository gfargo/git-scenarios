/**
 * Smoke test for the Playwright adapter.
 *
 * `@playwright/test` is not installed in this project (we use Jest).
 * We verify:
 *   1. The module exports the expected surface
 *   2. scenarioFixtures has the right shape (option tuples + repo function)
 *   3. createScenarioTest calls base.extend with the fixtures and returns the result
 *   4. The repo fixture function works end-to-end (spinUp → use → cleanup)
 */

import { existsSync } from 'fs'
import { scenarioFixtures, createScenarioTest } from './playwright'
import type { TempGitRepo } from './tempGitRepo'

describe('playwright adapter', () => {
  describe('scenarioFixtures', () => {
    it('exports scenarioFixtures as an object', () => {
      expect(typeof scenarioFixtures).toBe('object')
    })

    it('scenarioName is an option fixture tuple with empty-string default', () => {
      const [defaultValue, config] = scenarioFixtures.scenarioName
      expect(defaultValue).toBe('')
      expect(config).toEqual({ option: true })
    })

    it('scenarioOptions is an option fixture tuple with empty-object default', () => {
      const [defaultValue, config] = scenarioFixtures.scenarioOptions
      expect(defaultValue).toEqual({})
      expect(config).toEqual({ option: true })
    })

    it('repo is a function', () => {
      expect(typeof scenarioFixtures.repo).toBe('function')
    })
  })

  describe('createScenarioTest', () => {
    it('exports createScenarioTest as a function', () => {
      expect(typeof createScenarioTest).toBe('function')
    })

    it('calls base.extend with scenarioFixtures and returns the result', () => {
      const extended = { __extended: true }
      const base = { extend: jest.fn().mockReturnValue(extended) }
      const result = createScenarioTest(base as never)
      expect(base.extend).toHaveBeenCalledWith(scenarioFixtures)
      expect(result).toBe(extended)
    })
  })

  describe('repo fixture lifecycle', () => {
    it('spinUp → use → cleanup works for feature-pr-ready', async () => {
      let capturedRepo: TempGitRepo | undefined

      await scenarioFixtures.repo(
        { scenarioName: 'feature-pr-ready', scenarioOptions: {} },
        async (repo) => {
          capturedRepo = repo
          expect(repo.path).toBeDefined()
          expect(typeof repo.git.status).toBe('function')
          const status = await repo.git.status()
          expect(status.current).toBe('feat/widget-v2')
        },
      )

      // After use() returns, cleanup() has run — path no longer exists on disk
      expect(existsSync(capturedRepo!.path)).toBe(false)
    }, 30_000)

    it('throws on unknown scenario name', async () => {
      await expect(
        scenarioFixtures.repo(
          { scenarioName: 'totally-fake-xyz', scenarioOptions: {} },
          async () => {},
        ),
      ).rejects.toThrow(/Unknown scenario/)
    })
  })
})
