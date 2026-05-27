/**
 * Smoke test for the Vitest adapter.
 *
 * The adapter relies on Vitest's runtime globals, which we don't have
 * inside this Jest-driven test suite. So this test just verifies the
 * module shape — that it exports the same surface as the Jest adapter
 * (because consumers should be able to swap one import line and have
 * everything else work).
 */

import * as vitestAdapter from './vitest'
import * as jestAdapter from './jest'

describe('vitest adapter', () => {
  it('exports describeWithScenario', () => {
    expect(typeof vitestAdapter.describeWithScenario).toBe('function')
  })

  it('exports describeEachScenario', () => {
    expect(typeof vitestAdapter.describeEachScenario).toBe('function')
  })

  it('exports the same DescribeWithScenarioOptions shape as the Jest adapter', () => {
    // Type-only check at compile time would be ideal, but the runtime
    // assertion ensures the named exports line up.
    const vitestKeys = Object.keys(vitestAdapter).sort()
    const jestKeys = Object.keys(jestAdapter).sort()
    expect(vitestKeys).toEqual(jestKeys)
  })

  it('describeWithScenario references the runtime describe global', () => {
    // The adapter declares `describe` ambient and invokes it at call
    // time. We can't safely invoke it inside an `it` (Jest forbids
    // nested describe), so verify the function shape is correct
    // and contains the expected control flow by checking source.
    const adapterSource = vitestAdapter.describeWithScenario.toString()
    expect(adapterSource).toContain('describe')
    expect(adapterSource).toContain('beforeAll')
    expect(adapterSource).toContain('afterAll')
  })
})
