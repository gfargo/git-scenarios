/**
 * Atom layer — composable building blocks for assembling scenarios.
 *
 * Two ways to use this package:
 *
 *   1. **Pick a named scenario** from the registry. `spinUpScenario`
 *      and `findScenario` cover this path. Default for test consumers.
 *   2. **Compose your own** from atoms. Use this when:
 *      - the registered scenarios don't match what your test needs
 *      - you're writing a tool's own scenario library and just want
 *        the building blocks
 *      - you're building inline in a test without registering
 *
 *   const repo = await createTempGitRepo()
 *   await chain(
 *     addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
 *     switchToBranch('feat/x'),
 *     seededFiles({ files: [{ path: 'src/foo.ts', tokens: 80 }], seed: 0xabc }),
 *     addCommit({ message: 'feat: add foo' }),
 *   )(repo)
 *
 * Every atom returns a `Step` — `(repo: TempGitRepo) => Promise<void>`.
 * Scenarios in the registry use these same atoms under the hood;
 * defining a custom scenario is `defineScenario({ setup: chain(…) })`.
 *
 * Atom catalog:
 *
 *   - **Control flow**: `chain`, `repeat`, `conditionally`
 *   - **Working tree**: `writeFiles`, `deleteFiles`, `renameFile`, `seededFiles`
 *   - **Staging + commits**: `stageFiles`, `commit`, `addCommit`,
 *     `emptyCommit`, `amendCommit`
 *   - **Branches**: `switchToBranch`, `checkoutBranch`, `createBranch`,
 *     `deleteBranch`
 *   - **Tags**: `createTag`, `deleteTag`
 *   - **Remotes**: `addRemote`, `removeRemote`, `renameRemote`
 *   - **Upstream tracking**: `setUpstream`, `setRemoteRef`
 *   - **Stash**: `stashChanges`, `applyStash`, `popStash`, `dropStash`
 *   - **Operations**: `startMerge`, `abortMerge`, `startBisect`,
 *     `bisectStep`, `resetBisect`, `resetTo`
 *   - **Rebase**: `startRebase`, `abortRebase`, `continueRebase`,
 *     `startInteractiveRebase`
 *   - **Submodules**: `addSubmodule`, `pinSubmodule`
 *   - **Scoping**: `onBranch`, `insideSubmodule`, `withAuthor`,
 *     `withRemoteTracking`
 *   - **Scenarios**: `defineScenario`
 */

export type { Step, FileMap } from './types'
export { chain, repeat, conditionally } from './chain'
export { writeFiles } from './writeFiles'
export { deleteFiles } from './deleteFiles'
export { renameFile } from './renameFile'
export { stageFiles, commit } from './staging'
export { unstageFiles } from './unstage'
export { addCommit } from './addCommit'
export { emptyCommit, amendCommit } from './commits'
export { bulkCommits, type BulkCommitSpec } from './bulkCommits'
export { gitClean } from './clean'
export { writeGitignore, writeGitattributes } from './gitFiles'
export { switchToBranch, checkoutBranch, createBranch, deleteBranch } from './branches'
export { createTag, deleteTag } from './tags'
export { addRemote, removeRemote, renameRemote } from './remotes'
export { setUpstream, setRemoteRef } from './upstream'
export { stashChanges, applyStash, popStash, dropStash } from './stash'
export {
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
} from './operations'
export { startRebase, abortRebase, continueRebase, startInteractiveRebase } from './rebase'
export { addSubmodule, pinSubmodule } from './submodule'
export { addWorktree, removeWorktree, lockWorktree, unlockWorktree } from './worktrees'
export { setConfig } from './config'
export {
  onBranch,
  insideSubmodule,
  withAuthor,
  withRemoteTracking,
  type AuthorIdentity,
} from './scopes'
export { seededFiles, type SeededFileSpec } from './seededFiles'
export { defineScenario } from './defineScenario'
export { daysAgo } from './time'
// Sparse checkout
export { enableSparseCheckout, disableSparseCheckout } from './sparseCheckout'
// Shallow repo simulation
export { shallowAt, unshallow } from './shallowClone'
// Git notes
export { addNote, appendNote, removeNote } from './notes'
// Git hooks
export { installHook, removeHook, type GitHookName } from './hooks'
// Error wrapping
export { withGitError } from './withGitError'
