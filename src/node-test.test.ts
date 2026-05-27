/**
 * Smoke test for the node:test adapter.
 *
 * The adapter imports from `node:test` which is available in our
 * supported Node versions (22+). We can't run the adapter's
 * `describeWithScenario` inside Jest (it would register suites in
 * Node's test runner, not Jest's), but we CAN verify:
 *
 *   1. The module exports the expected surface
 *   2. The exports are the same shape as the Jest/Vitest adapters
 *   3. The `it` re-export is the real `node:test` `it` function
 */

import * as nodeTestAdapter from './node-test'
import * as jestAdapter from './jest'

describe('node-test adapter', () => {
  it('exports describeWithScenario', () => {
    expect(typeof nodeTestAdapter.describeWithScenario).toBe('function')
  })

  it('exports describeEachScenario', () => {
    expect(typeof nodeTestAdapter.describeEachScenario).toBe('function')
  })

  it('exports it (re-exported from node:test)', () => {
    expect(typeof nodeTestAdapter.it).toBe('function')
  })

  it('has the same core surface as the Jest adapter', () => {
    // Both should export describeWithScenario + describeEachScenario.
    // The node-test adapter additionally exports `it` for convenience.
    const jestKeys = Object.keys(jestAdapter).sort()
    const nodeKeys = Object.keys(nodeTestAdapter).sort()

    // Jest exports: describeWithScenario, describeEachScenario
    expect(jestKeys).toEqual(['describeEachScenario', 'describeWithScenario'])

    // Node-test exports: describeEachScenario, describeWithScenario, it
    expect(nodeKeys).toEqual(['describeEachScenario', 'describeWithScenario', 'it'])
  })

  it('describeWithScenario accepts the same options shape', () => {
    // Type-level check: both accept (name, fn, options?) with the same
    // DescribeWithScenarioOptions shape. At runtime we just verify the
    // function arity matches.
    expect(nodeTestAdapter.describeWithScenario.length).toBe(
      jestAdapter.describeWithScenario.length,
    )
  })
})
