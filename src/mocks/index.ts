/**
 * Mock factory barrel export.
 *
 * Provides in-memory mock objects matching simple-git's type signatures
 * for fast unit tests — no disk I/O, no git dependency at runtime.
 *
 * @module @gfargo/git-scenarios/mocks
 */

// Functional factories
export { mockStatusResult } from './statusFactory'
export { mockLogResult } from './logFactory'
export { mockBranchSummary } from './branchFactory'
export { mockDiffResult } from './diffFactory'

// Fluent builders
export { mockStatus, StatusBuilder } from './statusFactory'
export { mockLog, LogBuilder } from './logFactory'
export { mockBranches, BranchBuilder } from './branchFactory'

// Full interface mock
export { mockSimpleGit } from './simpleGitMock'
export type { MockFnFactory, MockSimpleGitOptions } from './simpleGitMock'

// Scenario derivation
export { mockFromScenario, parseContracts } from './scenarioMocks'
export type { ScenarioMockResult } from './scenarioMocks'

// Pretty-printing / debugging
export { printMockStatus, printMockLog } from './prettyPrint'

// Core mapping (exposed for advanced consumers and property tests)
export { mapXYToBuckets, bucketsToXY } from './bucketMapping'
export type { BucketPlacement, XCode, YCode } from './bucketMapping'

// Types
export type { MockStatusOptions } from './statusFactory'
export type { MockLogOptions } from './logFactory'
export type { MockBranchOptions } from './branchFactory'
export type { MockDiffFileEntry, MockDiffOptions } from './diffFactory'
