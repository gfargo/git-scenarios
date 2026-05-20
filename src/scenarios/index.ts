/**
 * Scenario registry for `packages/git-scenarios/src/scenarios/`.
 *
 * Each named scenario produces a deterministic git-repo state useful
 * for testing the workstation, integration tests, and manual demos.
 * See `packages/git-scenarios/README.md` for the boundary rules and the
 * extraction plan to a standalone `git-scenarios` package.
 *
 * EXTRACTION DISCIPLINE: this file is the public surface. The registry
 * is the only thing consumers should depend on; individual scenario
 * modules can be re-shaped without breaking the API.
 */

import type { Scenario } from './types'
import { branchAheadOfUpstreamScenario } from './branch-ahead-of-upstream'
import { branchBehindUpstreamScenario } from './branch-behind-upstream'
import { branchDivergedScenario } from './branch-diverged'
import { branchSyncShowcaseScenario } from './branch-sync-showcase'
import { branchTrackingUpstreamScenario } from './branch-tracking-upstream'
import { chipRenderingShowcaseScenario } from './chip-rendering-showcase'
import { detachedHeadScenario } from './detached-head'
import { dirtyManyFilesScenario } from './dirty-many-files'
import { emptyRepoScenario } from './empty-repo'
import { featureBranchOneCommitScenario } from './feature-branch-one-commit'
import { featurePrReadyScenario } from './feature-pr-ready'
import { midBisectScenario } from './mid-bisect'
import { midMergeConflictScenario } from './mid-merge-conflict'
import { multiCommitBranchScenario } from './multi-commit-branch'
import { multiRemoteWithTrackingScenario } from './multi-remote-with-tracking'
import { richHistoryGraphScenario } from './rich-history-graph'
import { signedCommitsRequiredScenario } from './signed-commits-required'
import { singleStagedFileScenario } from './single-staged-file'
import { stashedChangesScenario } from './stashed-changes'
import { submoduleWithHistoryScenario } from './submodule-with-history'
import { twoCommitFeatureScenario } from './two-commit-feature'

/**
 * Ordered list of all available scenarios. The order is shown in
 * `npm run scenario list` so we group related ones together —
 * branch-y scenarios first, then worktree, then operations, then stash.
 */
export const allScenarios: readonly Scenario[] = [
  // empty-state edge cases (smallest first so it groups with the other
  // degenerate shapes a tool needs to handle gracefully)
  emptyRepoScenario,
  // branch shapes
  featurePrReadyScenario,
  featureBranchOneCommitScenario,
  multiCommitBranchScenario,
  twoCommitFeatureScenario,
  // upstream-tracking shapes
  branchTrackingUpstreamScenario,
  branchAheadOfUpstreamScenario,
  branchBehindUpstreamScenario,
  branchDivergedScenario,
  branchSyncShowcaseScenario,
  multiRemoteWithTrackingScenario,
  // detached / config shapes
  detachedHeadScenario,
  signedCommitsRequiredScenario,
  // worktree shapes
  singleStagedFileScenario,
  dirtyManyFilesScenario,
  // in-progress operations
  midBisectScenario,
  midMergeConflictScenario,
  // history shapes
  richHistoryGraphScenario,
  chipRenderingShowcaseScenario,
  // stash shapes
  stashedChangesScenario,
  // submodule shapes
  submoduleWithHistoryScenario,
]

/**
 * Lookup helper. Returns undefined for an unknown name so callers can
 * surface a helpful error (CLI prints the list; programmatic API
 * throws with a suggestion).
 */
export function findScenario(name: string): Scenario | undefined {
  return allScenarios.find((s) => s.name === name)
}

export type { Scenario, ScenarioKind } from './types'
export { branchAheadOfUpstreamScenario } from './branch-ahead-of-upstream'
export { branchBehindUpstreamScenario } from './branch-behind-upstream'
export { branchDivergedScenario } from './branch-diverged'
export { branchSyncShowcaseScenario } from './branch-sync-showcase'
export { branchTrackingUpstreamScenario } from './branch-tracking-upstream'
export { chipRenderingShowcaseScenario } from './chip-rendering-showcase'
export { detachedHeadScenario } from './detached-head'
export { dirtyManyFilesScenario } from './dirty-many-files'
export { emptyRepoScenario } from './empty-repo'
export { featureBranchOneCommitScenario } from './feature-branch-one-commit'
export { featurePrReadyScenario } from './feature-pr-ready'
export { midBisectScenario } from './mid-bisect'
export { midMergeConflictScenario } from './mid-merge-conflict'
export { multiCommitBranchScenario } from './multi-commit-branch'
export { multiRemoteWithTrackingScenario } from './multi-remote-with-tracking'
export { richHistoryGraphScenario } from './rich-history-graph'
export { signedCommitsRequiredScenario } from './signed-commits-required'
export { singleStagedFileScenario } from './single-staged-file'
export { stashedChangesScenario } from './stashed-changes'
export { submoduleWithHistoryScenario } from './submodule-with-history'
export { twoCommitFeatureScenario } from './two-commit-feature'
