/**
 * Public entry point for `@gfargo/git-scenarios`.
 *
 * Four concentric layers:
 *
 *   1. `spinUpScenario(name)` — the one-shot API for tests. Creates a
 *      temp repo, runs the named scenario, and returns the result.
 *      90% of test consumers want this.
 *   2. `createTempGitRepo()` — the raw primitive. A fresh git repo on
 *      disk with user identity + a `main` branch. Build whatever you
 *      need from there. For the rare case no named scenario fits.
 *   3. `allScenarios` / `findScenario` / `Scenario` / `ScenarioKind` —
 *      the registry surface. Tools that want to enumerate, describe,
 *      or filter scenarios (the CLI is one such consumer; the
 *      structural-extract eval harness is another) hit these.
 *   4. **Atom layer** (`chain`, `addCommit`, `switchToBranch`,
 *      `seededFiles`, `defineScenario`, …) — composable building
 *      blocks for assembling custom scenarios inline or registering
 *      new ones. See `./atoms` for the full set.
 *
 * Individual scenario exports are also re-exported from `./scenarios`
 * for fine-grained selection — e.g. running just `feature-pr-ready` in
 * a unit test without going through `spinUpScenario`.
 */

export {
  GitScenariosError,
  ScenarioNotFoundError,
  GitCommandError,
  InvalidArgumentError,
  RepoAssertionError,
} from './errors'

export { assertRepo, RepoAssertion, type SnapshotSource } from './assert'

export { spinUpScenario, type SpinUpScenarioOptions } from './spinUpScenario'
export { fromScenario, type FromScenarioOptions } from './fromScenario'
export { createTempGitRepo, type TempGitRepo, type CreateTempGitRepoOptions } from './tempGitRepo'
export { clearScenarioCache, cacheRoot } from './scenarioCache'
export {
  snapshotRepo,
  type RepoSnapshot,
  type HeadSnapshot,
  type StatusSnapshot,
  type InProgressOperation,
} from './snapshot'
export {
  registerScenario,
  registerScenarios,
  unregisterScenario,
  listRegistered,
  findRegistered,
  findRegisteredByTag,
  resetRegistry,
} from './registry'

// Atom layer — see ./atoms/index.ts for the full catalog.
export {
  // Control flow
  chain,
  repeat,
  conditionally,
  // Working tree
  writeFiles,
  deleteFiles,
  renameFile,
  seededFiles,
  // Staging + commits
  stageFiles,
  unstageFiles,
  commit,
  addCommit,
  emptyCommit,
  amendCommit,
  bulkCommits,
  // Working tree cleanup
  gitClean,
  // Git meta files
  writeGitignore,
  writeGitattributes,
  // Branches
  switchToBranch,
  checkoutBranch,
  createBranch,
  deleteBranch,
  // Tags
  createTag,
  deleteTag,
  // Remotes
  addRemote,
  removeRemote,
  renameRemote,
  // Upstream tracking
  setUpstream,
  setRemoteRef,
  // Stash
  stashChanges,
  applyStash,
  popStash,
  dropStash,
  // Operations
  startMerge,
  abortMerge,
  cherryPick,
  abortCherryPick,
  continueCherryPick,
  revert,
  abortRevert,
  continueRevert,
  startBisect,
  bisectStep,
  resetBisect,
  resetTo,
  // Rebase
  startRebase,
  abortRebase,
  continueRebase,
  startInteractiveRebase,
  // Submodules
  addSubmodule,
  pinSubmodule,
  // Linked worktrees
  addWorktree,
  removeWorktree,
  lockWorktree,
  unlockWorktree,
  // Config
  setConfig,
  // Scoping
  onBranch,
  insideSubmodule,
  withAuthor,
  withRemoteTracking,
  // Scenarios
  defineScenario,
  // Time helpers
  daysAgo,
  // Sparse checkout
  enableSparseCheckout,
  disableSparseCheckout,
  // Shallow repo
  shallowAt,
  unshallow,
  // Git notes
  addNote,
  appendNote,
  removeNote,
  // Git hooks
  installHook,
  removeHook,
  // Types
  type Step,
  type FileMap,
  type SeededFileSpec,
  type AuthorIdentity,
  type GitHookName,
  type BulkCommitSpec,
} from './atoms'

export {
  allScenarios,
  findScenario,
  findScenariosByTag,
  type Scenario,
  type ScenarioKind,
  // Individual scenarios — exported so consumers can opt out of the
  // registry and run just one scenario directly when that's what
  // their test wants.
  branchAheadOfUpstreamScenario,
  branchBehindUpstreamScenario,
  branchDivergedScenario,
  branchSyncShowcaseScenario,
  branchTrackingUpstreamScenario,
  chipRenderingShowcaseScenario,
  danglingCommitScenario,
  detachedHeadScenario,
  resetRecoverableHeadScenario,
  dirtyManyFilesScenario,
  emptyRepoScenario,
  featureBranchOneCommitScenario,
  featurePrReadyScenario,
  mergeNoConflictScenario,
  midBisectScenario,
  midCherryPickConflictScenario,
  midMergeConflictScenario,
  midRebaseConflictScenario,
  midRevertConflictScenario,
  monorepoMultiPackageScenario,
  multiCommitBranchScenario,
  multiRemoteWithTrackingScenario,
  multipleWorktreesScenario,
  lockedWorktreeScenario,
  largeRepoScenario,
  orphanBranchScenario,
  partialStageScenario,
  richHistoryGraphScenario,
  shallowCloneScenario,
  signedCommitsRequiredScenario,
  singleStagedFileScenario,
  stashWithUntrackedScenario,
  stashedChangesScenario,
  submoduleWithHistoryScenario,
  outOfDateSubmoduleScenario,
  interactiveRebaseMidEditScenario,
  twoCommitFeatureScenario,
} from './scenarios'
