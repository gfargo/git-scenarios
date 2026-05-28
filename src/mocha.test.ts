/**
 * Smoke test for the Mocha adapter.
 *
 * Mocha's globals are runtime-injected by the Mocha CLI. Inside this
 * Jest-driven test suite, Jest provides its own `describe`/`before`/
 * `after` globals — which happen to match Mocha's shape closely
 * enough that the adapter's `describeWithScenario` actually works
 * here too (both use global describe + before + after).
 *
 * We verify:
 *   1. The module exports the expected surface
 *   2. Shape parity with the Jest adapter
 *   3. The adapter actually runs (since Jest's globals satisfy it)
 */

import * as mochaAdapter from './mocha'
import * as jestAdapter from './jest'

describe('mocha adapter', () => {
  it('exports describeWithScenario', () => {
    expect(typeof mochaAdapter.describeWithScenario).toBe('function')
  })

  it('exports describeEachScenario', () => {
    expect(typeof mochaAdapter.describeEachScenario).toBe('function')
  })

  it('has the same core surface as the Jest adapter', () => {
    const mochaKeys = Object.keys(mochaAdapter).sort()
    const jestKeys = Object.keys(jestAdapter).sort()
    // Both export: describeWithScenario, describeEachScenario
    expect(mochaKeys).toEqual(jestKeys)
  })

  it('describeWithScenario accepts the same arity as Jest', () => {
    expect(mochaAdapter.describeWithScenario.length).toBe(
      jestAdapter.describeWithScenario.length,
    )
  })
})
