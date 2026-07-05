/* eslint-disable @typescript-eslint/no-explicit-any */
import { mockSimpleGit } from '../simpleGitMock'
import type { MockFnFactory } from '../simpleGitMock'
import { mockStatusResult } from '../statusFactory'
import { mockLogResult } from '../logFactory'
import { mockBranchSummary } from '../branchFactory'
import { mockDiffResult } from '../diffFactory'

/**
 * Simple spy factory for framework-agnostic testing.
 * Wraps an implementation in a function that tracks calls.
 */
const createMockFn: MockFnFactory = ((impl?: (...args: any[]) => any) => {
  const calls: any[][] = []
  const fn = (...args: any[]) => {
    calls.push(args)
    return impl ? impl(...args) : undefined
  }
  fn.mock = { calls }
  return fn
}) as MockFnFactory

describe('mockSimpleGit', () => {
  describe('default returns for unconfigured methods', () => {
    it('status() resolves to a clean StatusResult by default', async () => {
      const git = mockSimpleGit({ createMockFn })
      const status = await git.status()
      const expected = mockStatusResult()

      expect(status.current).toBe(expected.current)
      expect(status.files).toEqual(expected.files)
      expect(status.staged).toEqual(expected.staged)
      expect(status.modified).toEqual(expected.modified)
      expect(status.isClean()).toBe(true)
    })

    it('log() resolves to an empty LogResult by default', async () => {
      const git = mockSimpleGit({ createMockFn })
      const log = await git.log()
      const expected = mockLogResult()

      expect(log.total).toBe(expected.total)
      expect(log.all).toEqual(expected.all)
    })

    it('branch() resolves to a default BranchSummary', async () => {
      const git = mockSimpleGit({ createMockFn })
      const branch = await git.branch()
      const expected = mockBranchSummary()

      expect(branch.current).toBe(expected.current)
      expect(branch.all).toEqual(expected.all)
      expect(branch.detached).toBe(expected.detached)
    })

    it('branchLocal() resolves to a default BranchSummary', async () => {
      const git = mockSimpleGit({ createMockFn })
      const branch = await git.branchLocal()
      const expected = mockBranchSummary()

      expect(branch.current).toBe(expected.current)
      expect(branch.all).toEqual(expected.all)
    })

    it('diffSummary() resolves to an empty DiffResult', async () => {
      const git = mockSimpleGit({ createMockFn })
      const diff = await git.diffSummary()
      const expected = mockDiffResult()

      expect(diff.changed).toBe(expected.changed)
      expect(diff.files).toEqual(expected.files)
      expect(diff.insertions).toBe(expected.insertions)
      expect(diff.deletions).toBe(expected.deletions)
    })

    it('raw() resolves to empty string by default', async () => {
      const git = mockSimpleGit({ createMockFn })
      const result = await git.raw('rev-parse', 'HEAD')

      expect(result).toBe('')
    })
  })

  describe('override returns', () => {
    it('status override is returned instead of default', async () => {
      const customStatus = mockStatusResult({ staged: ['src/app.ts'] })
      const git = mockSimpleGit({
        createMockFn,
        overrides: { status: customStatus },
      })

      const status = await git.status()
      expect(status).toBe(customStatus)
      expect(status.staged).toEqual(['src/app.ts'])
    })

    it('log override is returned instead of default', async () => {
      const customLog = mockLogResult({ count: 5 })
      const git = mockSimpleGit({
        createMockFn,
        overrides: { log: customLog },
      })

      const log = await git.log()
      expect(log).toBe(customLog)
      expect(log.total).toBe(5)
    })

    it('branch override is returned instead of default', async () => {
      const customBranch = mockBranchSummary({
        current: 'develop',
        branches: ['main', 'develop', 'feature/x'],
      })
      const git = mockSimpleGit({
        createMockFn,
        overrides: { branch: customBranch },
      })

      const branch = await git.branch()
      expect(branch).toBe(customBranch)
      expect(branch.current).toBe('develop')
    })

    it('branchLocal override is independent from branch override', async () => {
      const localBranch = mockBranchSummary({ current: 'local-only' })
      const remoteBranch = mockBranchSummary({ current: 'all-branches' })
      const git = mockSimpleGit({
        createMockFn,
        overrides: { branchLocal: localBranch, branch: remoteBranch },
      })

      const local = await git.branchLocal()
      const all = await git.branch()
      expect(local).toBe(localBranch)
      expect(all).toBe(remoteBranch)
      expect(local.current).toBe('local-only')
      expect(all.current).toBe('all-branches')
    })

    it('diffSummary override is returned instead of default', async () => {
      const customDiff = mockDiffResult({
        files: [{ file: 'index.ts', insertions: 10, deletions: 2 }],
      })
      const git = mockSimpleGit({
        createMockFn,
        overrides: { diffSummary: customDiff },
      })

      const diff = await git.diffSummary()
      expect(diff).toBe(customDiff)
      expect(diff.changed).toBe(1)
    })

    it('raw override function is called with args', async () => {
      const rawFn = (args: string[]) => args.join(' ')
      const git = mockSimpleGit({
        createMockFn,
        overrides: { raw: rawFn },
      })

      const result = await git.raw('rev-parse', 'HEAD')
      expect(result).toBe('rev-parse HEAD')
    })
  })

  describe('Proxy dynamic access', () => {
    it('unknown methods resolve to undefined', async () => {
      const git = mockSimpleGit({ createMockFn })
      // Access an arbitrary unknown method
      const result = await (git as any).someUnknownMethod()

      expect(result).toBeUndefined()
    })

    it('repeated access to the same property returns the same mock fn', () => {
      const git = mockSimpleGit({ createMockFn })

      const fn1 = (git as any).status
      const fn2 = (git as any).status

      expect(fn1).toBe(fn2)
    })

    it('different properties return different mock fns', () => {
      const git = mockSimpleGit({ createMockFn })

      const statusFn = (git as any).status
      const logFn = (git as any).log

      expect(statusFn).not.toBe(logFn)
    })

    it('symbol properties return undefined', () => {
      const git = mockSimpleGit({ createMockFn })

      const result = (git as any)[Symbol.toPrimitive]
      expect(result).toBeUndefined()
    })
  })

  describe('mock fn factory integration', () => {
    it('createMockFn is called for each accessed method', () => {
      const factoryCalls: any[] = []
      const trackingFactory: MockFnFactory = ((impl?: any) => {
        factoryCalls.push(impl)
        const fn = (...args: any[]) => (impl ? impl(...args) : undefined)
        return fn
      }) as MockFnFactory

      const git = mockSimpleGit({ createMockFn: trackingFactory })

      // Access status and log
      ;(git as any).status
      ;(git as any).log

      expect(factoryCalls).toHaveLength(2)
    })

    it('createMockFn receives the correct implementation', async () => {
      const implementations: any[] = []
      const trackingFactory: MockFnFactory = ((impl?: any) => {
        implementations.push(impl)
        const fn = (...args: any[]) => (impl ? impl(...args) : undefined)
        return fn
      }) as MockFnFactory

      const git = mockSimpleGit({ createMockFn: trackingFactory })

      // Access raw (should get an impl that resolves to '')
      ;(git as any).raw

      expect(implementations).toHaveLength(1)
      expect(typeof implementations[0]).toBe('function')

      // The implementation should return a promise resolving to ''
      const result = await implementations[0]()
      expect(result).toBe('')
    })

    it('works with jest.fn as the factory', async () => {
      // jest.fn is available in our jest test environment
      const git = mockSimpleGit({ createMockFn: jest.fn as unknown as MockFnFactory })

      const status = await git.status()
      expect(status.isClean()).toBe(true)

      // Verify it's actually a jest mock
      expect(jest.isMockFunction((git as any).status)).toBe(true)
    })
  })
})
