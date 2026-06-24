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
import { caseCollisionScenario } from './case-collision'
import { crlfNormalizationScenario } from './crlf-normalization'
import { gitLfsPointerScenario } from './git-lfs-pointer'
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
import { mergeNoConflictScenario } from './merge-no-conflict'
import { midBisectScenario } from './mid-bisect'
import { midCherryPickConflictScenario } from './mid-cherry-pick-conflict'
import { midMergeConflictScenario } from './mid-merge-conflict'
import { midRebaseConflictScenario } from './mid-rebase-conflict'
import { midRevertConflictScenario } from './mid-revert-conflict'
import { monorepoMultiPackageScenario } from './monorepo-multi-package'
import { multiCommitBranchScenario } from './multi-commit-branch'
import { multiRemoteWithTrackingScenario } from './multi-remote-with-tracking'
import { multipleWorktreesScenario } from './multiple-worktrees'
import { largeRepoScenario } from './large-repo'
import { orphanBranchScenario } from './orphan-branch'
import { partialStageScenario } from './partial-stage'
import { richHistoryGraphScenario } from './rich-history-graph'
import { shallowCloneScenario } from './shallow-clone'
import { signedCommitsRequiredScenario } from './signed-commits-required'
import { singleStagedFileScenario } from './single-staged-file'
import { stashWithUntrackedScenario } from './stash-with-untracked'
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
  orphanBranchScenario,
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
  // in-progress operations
  midBisectScenario,
  midMergeConflictScenario,
  midRebaseConflictScenario,
  midCherryPickConflictScenario,
  midRevertConflictScenario,
  // history shapes
  mergeNoConflictScenario,
  richHistoryGraphScenario,
  chipRenderingShowcaseScenario,
  shallowCloneScenario,
  largeRepoScenario,
  // stash shapes
  stashedChangesScenario,
  stashWithUntrackedScenario,
  // worktree shapes
  singleStagedFileScenario,
  partialStageScenario,
  monorepoMultiPackageScenario,
  dirtyManyFilesScenario,
  multipleWorktreesScenario,
  // submodule shapes
  submoduleWithHistoryScenario,
  // encoding / filesystem edge cases
  gitLfsPointerScenario,
  crlfNormalizationScenario,
  caseCollisionScenario,
]

/**
 * Lookup helper. Returns undefined for an unknown name so callers can
 * surface a helpful error (CLI prints the list; programmatic API
 * throws with a suggestion).
 */
export function findScenario(name: string): Scenario | undefined {
  return allScenarios.find((s) => s.name === name)
}

/**
 * Filter scenarios by tag. Returns all scenarios that include at
 * least one of the specified tags. Useful for running a subset of
 * scenarios in tests or listing related scenarios in the CLI.
 *
 * @param tags - One or more tags to match against
 * @param match - 'any' (default) returns scenarios matching ANY tag;
 *   'all' returns only scenarios matching ALL tags.
 */
export function findScenariosByTag(
  tags: string[],
  match: 'any' | 'all' = 'any',
): readonly Scenario[] {
  return allScenarios.filter((s) => {
    if (!s.tags || s.tags.length === 0) return false
    if (match === 'all') {
      return tags.every((t) => s.tags!.includes(t))
    }
    return tags.some((t) => s.tags!.includes(t))
  })
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
export { mergeNoConflictScenario } from './merge-no-conflict'
export { midBisectScenario } from './mid-bisect'
export { midCherryPickConflictScenario } from './mid-cherry-pick-conflict'
export { midMergeConflictScenario } from './mid-merge-conflict'
export { midRebaseConflictScenario } from './mid-rebase-conflict'
export { midRevertConflictScenario } from './mid-revert-conflict'
export { monorepoMultiPackageScenario } from './monorepo-multi-package'
export { multiCommitBranchScenario } from './multi-commit-branch'
export { multiRemoteWithTrackingScenario } from './multi-remote-with-tracking'
export { multipleWorktreesScenario } from './multiple-worktrees'
export { largeRepoScenario } from './large-repo'
export { orphanBranchScenario } from './orphan-branch'
export { partialStageScenario } from './partial-stage'
export { richHistoryGraphScenario } from './rich-history-graph'
export { shallowCloneScenario } from './shallow-clone'
export { signedCommitsRequiredScenario } from './signed-commits-required'
export { singleStagedFileScenario } from './single-staged-file'
export { stashWithUntrackedScenario } from './stash-with-untracked'
export { stashedChangesScenario } from './stashed-changes'
export { submoduleWithHistoryScenario } from './submodule-with-history'
export { twoCommitFeatureScenario } from './two-commit-feature'
export { gitLfsPointerScenario } from './git-lfs-pointer'
export { crlfNormalizationScenario } from './crlf-normalization'
export { caseCollisionScenario } from './case-collision'
