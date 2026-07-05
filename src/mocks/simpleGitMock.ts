/**
 * SimpleGit mock factory.
 *
 * Produces a Proxy-based object matching simple-git's `SimpleGit` interface
 * with all methods stubbed as mock functions. Framework-agnostic — the test
 * framework's mock function factory (`jest.fn`, `vi.fn`) is injected via
 * the `createMockFn` parameter.
 *
 * @module
 */

import type { SimpleGit, StatusResult, BranchSummary, DiffResult } from 'simple-git'
import type { DefaultLogFields, LogResult } from 'simple-git'
import { mockStatusResult } from './statusFactory'
import { mockLogResult } from './logFactory'
import { mockBranchSummary } from './branchFactory'
import { mockDiffResult } from './diffFactory'

/**
 * A function that creates a mock/spy function. Matches `jest.fn()` and `vi.fn()`.
 * Consumers pass their framework's mock factory.
 */
export type MockFnFactory = <T extends (...args: any[]) => any>(
  impl?: T
) => T & { mockResolvedValue?: (val: any) => void }

/**
 * Configuration for `mockSimpleGit`.
 */
export type MockSimpleGitOptions = {
  /** The mock function factory. Pass `jest.fn` or `vi.fn`. */
  createMockFn: MockFnFactory
  /** Override specific method results. */
  overrides?: {
    status?: StatusResult
    log?: LogResult<DefaultLogFields>
    branch?: BranchSummary
    branchLocal?: BranchSummary
    diffSummary?: DiffResult
    raw?: (args: string[]) => string
  }
}

/** Methods with known type-safe defaults. */
const KNOWN_METHODS = ['status', 'log', 'branch', 'branchLocal', 'diffSummary'] as const
type KnownMethod = (typeof KNOWN_METHODS)[number]

/**
 * Returns the type-safe default for a known method when no override is provided.
 */
function getDefault(method: KnownMethod): StatusResult | LogResult<DefaultLogFields> | BranchSummary | DiffResult {
  switch (method) {
    case 'status':
      return mockStatusResult()
    case 'log':
      return mockLogResult()
    case 'branch':
      return mockBranchSummary()
    case 'branchLocal':
      return mockBranchSummary()
    case 'diffSummary':
      return mockDiffResult()
  }
}

/**
 * Create a fully-typed SimpleGit mock with all methods stubbed.
 *
 * Uses a Proxy to intercept property access. Known methods return a mock
 * function resolving to either the configured override or a type-safe
 * default. Unknown methods return a mock function resolving to `undefined`.
 *
 * @example
 * // Jest usage
 * const git = mockSimpleGit({
 *   createMockFn: jest.fn,
 *   overrides: {
 *     status: mockStatusResult({ staged: ['src/a.ts'] }),
 *   },
 * })
 * const status = await git.status()
 * // status.staged === ['src/a.ts']
 *
 * @example
 * // Vitest usage
 * const git = mockSimpleGit({
 *   createMockFn: vi.fn,
 *   overrides: { branch: mockBranchSummary({ current: 'develop' }) },
 * })
 */
export function mockSimpleGit(options: MockSimpleGitOptions): SimpleGit {
  const { createMockFn, overrides = {} } = options

  // Cache created mock fns so repeated access returns the same instance
  const cache = new Map<string | symbol, unknown>()

  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      // Non-string props (symbols like Symbol.toPrimitive) — pass through
      if (typeof prop !== 'string') {
        return undefined
      }

      // Return cached mock fn if already created
      if (cache.has(prop)) {
        return cache.get(prop)
      }

      let mockFn: unknown

      if (prop === 'raw') {
        // raw: if override function provided, use it; otherwise resolve to ''
        // simple-git's raw() accepts variadic strings: git.raw('rev-parse', 'HEAD')
        if (overrides.raw) {
          const rawOverride = overrides.raw
          mockFn = createMockFn((...args: any[]) => {
            // Normalize: if first arg is an array, use it; otherwise collect all args
            const normalizedArgs = Array.isArray(args[0]) ? args[0] : args
            return Promise.resolve(rawOverride(normalizedArgs))
          })
        } else {
          mockFn = createMockFn(() => Promise.resolve(''))
        }
      } else if ((KNOWN_METHODS as readonly string[]).includes(prop)) {
        // Known method: resolve to override or type-safe default
        const method = prop as KnownMethod
        const value = overrides[method] ?? getDefault(method)
        mockFn = createMockFn(() => Promise.resolve(value))
      } else {
        // Unknown method: resolve to undefined
        mockFn = createMockFn(() => Promise.resolve(undefined))
      }

      cache.set(prop, mockFn)
      return mockFn
    },
  }

  return new Proxy({}, handler) as unknown as SimpleGit
}
