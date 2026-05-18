import type { Step } from './types'

/**
 * Set the upstream-tracking configuration for a local branch
 * (`git branch --set-upstream-to=<remote>/<remoteBranch> <localBranch>`).
 * Writes both `branch.<X>.remote` and `branch.<X>.merge` so `git status`
 * can report ahead/behind counts.
 *
 *   chain(
 *     addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
 *     addRemote('origin', '/fake/url'),
 *     setRemoteRef('origin', 'main', 'HEAD'),  // make origin/main exist
 *     setUpstream('main', 'origin'),           // and have main track it
 *   )
 *
 * **Precondition**: the remote-tracking ref (`refs/remotes/<remote>/<remoteBranch>`)
 * must already exist. Use `setRemoteRef` or `withRemoteTracking` to
 * create it. `setUpstream` only writes the config; it doesn't
 * fabricate refs.
 *
 * `remoteBranch` defaults to `localBranch` when omitted — the common
 * case where a branch tracks the same-named remote branch.
 */
export function setUpstream(localBranch: string, remote: string, remoteBranch?: string): Step {
  return async (repo) => {
    const target = remoteBranch ?? localBranch
    await repo.git.raw([
      'branch',
      `--set-upstream-to=${remote}/${target}`,
      localBranch,
    ])
  }
}

/**
 * Write a remote-tracking ref to point at a specific commit. Low-level
 * primitive — directly manipulates `refs/remotes/<remote>/<branch>`
 * via `git update-ref`. No fetch happens; no commits are created.
 *
 *   chain(
 *     addCommit({ message: 'init' }),
 *     addCommit({ message: 'feat: one' }),
 *     addCommit({ message: 'feat: two' }),
 *     addRemote('origin', '/fake/url'),
 *     // Pretend origin/main is at the older commit, leaving local 2 ahead.
 *     setRemoteRef('origin', 'main', 'HEAD~2'),
 *     setUpstream('main', 'origin'),
 *   )
 *
 * `sha` can be any ref git understands (`HEAD`, `HEAD~2`, a branch
 * name, a tag, or a full/short sha). For "behind"-type scenarios
 * where the upstream needs commits the local branch doesn't have,
 * use `withRemoteTracking` instead — it generates those commits in
 * the objects DB and points the ref at the new tip.
 */
export function setRemoteRef(remote: string, branch: string, sha: string): Step {
  return async (repo) => {
    // Resolve `sha` to a full hash so the update-ref call doesn't
    // depend on the ref being resolvable later.
    const resolved = (await repo.git.revparse([sha])).trim()
    await repo.git.raw(['update-ref', `refs/remotes/${remote}/${branch}`, resolved])
  }
}
