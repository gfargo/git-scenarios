import { execFile } from 'child_process'
import { rm } from 'fs/promises'
import { join } from 'path'
import { promisify } from 'util'
import { createTempGitRepo } from '../tempGitRepo'
import type { Step } from './types'

const execFileAsync = promisify(execFile)

/**
 * Apply the same user identity + gpgsign config to a submodule clone
 * that `createTempGitRepo` sets up on the parent. `git submodule add`
 * clones the source's history but does NOT carry over per-repo config
 * — so without this step the submodule clone falls back to the
 * caller's global git config. On CI runners (no global config),
 * subsequent commits made inside the submodule (via `insideSubmodule`)
 * fail with "Author identity unknown".
 */
async function configureSubmoduleClone(submoduleAbsolutePath: string): Promise<void> {
  await execFileAsync('git', ['config', 'user.name', 'Coco Test'], { cwd: submoduleAbsolutePath })
  await execFileAsync('git', ['config', 'user.email', 'coco@example.com'], { cwd: submoduleAbsolutePath })
  await execFileAsync('git', ['config', 'commit.gpgsign', 'false'], { cwd: submoduleAbsolutePath })
}

/**
 * Add a submodule to the parent repo. The submodule's own commit
 * history is set up by running `setup` against a fresh temp repo,
 * which is then cloned in via `git submodule add`. After the add,
 * the source temp repo is removed — the submodule clone inside
 * `<parent>/<path>` is self-contained.
 *
 * Because `setup` is a `Step`, every atom in this package composes
 * inside it. You can use `addCommit`, `switchToBranch`, `repeat`, or
 * even nested `addSubmodule` to build the source history:
 *
 *   addSubmodule({
 *     path: 'vendor/lib',
 *     branch: 'main',
 *     setup: chain(
 *       addCommit({
 *         message: 'chore: scaffold',
 *         files: { 'README.md': '# lib' },
 *       }),
 *       seededFiles({ files: [{ path: 'src/lib.ts', tokens: 80 }], seed: 0xfeed }),
 *       addCommit({ message: 'feat: add lib' }),
 *     ),
 *   })
 *
 * After this atom runs, the parent's `.gitmodules` registers the
 * submodule but the parent has NOT committed the registration. Pair
 * with `addCommit({ message: 'chore: add submodule' })` to land the
 * registration in a commit.
 *
 * Shells out to `git submodule add` via `child_process` because
 * simple-git's unsafe-operations plugin blocks the `-c
 * protocol.allow=...` override needed on git ≥ 2.38 for file-protocol
 * submodule URLs.
 *
 * To produce an "out-of-date submodule" state (parent's pinned sha is
 * older than the submodule's HEAD), combine with `insideSubmodule`:
 *
 *   chain(
 *     addSubmodule({ path: 'vendor/lib', setup: chain(addCommit({ … })) }),
 *     addCommit({ message: 'chore: pin submodule' }),
 *     // Drift the submodule's HEAD without updating the parent's pin
 *     insideSubmodule('vendor/lib', chain(
 *       addCommit({ message: 'feat: post-pin', files: { … } }),
 *     )),
 *     // Parent's `.gitmodules` pin is unchanged; `git submodule status`
 *     // now shows the `+` modified flag.
 *   )
 */
export function addSubmodule(opts: {
  path: string
  setup: Step
  branch?: string
}): Step {
  return async (parentRepo) => {
    const source = await createTempGitRepo()
    try {
      await opts.setup(source)
      await execFileAsync(
        'git',
        [
          '-c',
          'protocol.file.allow=always',
          'submodule',
          'add',
          ...(opts.branch ? ['-b', opts.branch] : []),
          source.path,
          opts.path,
        ],
        { cwd: parentRepo.path },
      )
      // Set up the submodule clone's per-repo identity + gpgsign config
      // so subsequent commits made inside it (via `insideSubmodule`)
      // don't fall back to the caller's global git config. CI runners
      // typically have no global config — without this, the first
      // commit inside the submodule fails with "Author identity
      // unknown".
      await configureSubmoduleClone(join(parentRepo.path, opts.path))
    } finally {
      await rm(source.path, { recursive: true, force: true })
    }
  }
}

/**
 * Update the parent's recorded pin for a submodule to a specific sha
 * inside the submodule's own history. Runs `git -C <submodule>
 * checkout <sha>` then stages the gitlink change in the parent.
 *
 * Does NOT commit the pin update — pair with `addCommit({ message:
 * '...' })` to land the new pin in a commit. Without that commit,
 * the parent's worktree shows `+` modified on the submodule and the
 * pin change sits in the index.
 */
export function pinSubmodule(path: string, sha: string): Step {
  return async (parentRepo) => {
    await execFileAsync('git', ['checkout', sha], {
      cwd: `${parentRepo.path}/${path}`,
    })
    await parentRepo.git.add(path)
  }
}
