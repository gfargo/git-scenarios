import { execFile } from 'child_process'
import { existsSync } from 'fs'
import { mkdir, mkdtemp, readFile as readFileFs, rm, writeFile as writeFileFs } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { simpleGit } from 'simple-git'
import { promisify } from 'util'
import { nextCommitDate } from '../commitClock'
import type { TempGitRepo } from '../tempGitRepo'
import type { Step } from './types'

const execFileAsync = promisify(execFile)

/**
 * Author identity for the `withAuthor` scope. All four fields land
 * in the wrapped scope's env vars (`GIT_AUTHOR_*` /
 * `GIT_COMMITTER_*`); `date` is optional and pins both author and
 * committer dates the same way `addCommit({ date })` does.
 */
export type AuthorIdentity = {
  name: string
  email: string
  date?: string
}

/**
 * Run a step on a named branch, then restore the previous branch.
 * Sugar over `checkoutBranch(name) → step → checkoutBranch(previous)`.
 *
 *   onBranch('feat/x', chain(
 *     addCommit({ message: 'wip', files: { 'src/x.ts': '…' } }),
 *   ))
 *
 * The pre-step branch is captured at run time, so this composes
 * cleanly inside `repeat()` or other dynamic contexts. If the repo
 * is in detached-HEAD state, the restore step is a no-op (which
 * matches what `git checkout -` would do).
 *
 * The atom does NOT create the branch — pair with `createBranch` or
 * `switchToBranch` if the target doesn't exist yet:
 *
 *   chain(
 *     createBranch('feat/x'),                 // creates feat/x at HEAD, doesn't switch
 *     onBranch('feat/x', addCommit({ … })),   // runs on feat/x, returns to wherever we were
 *   )
 */
export function onBranch(name: string, step: Step): Step {
  return async (repo) => {
    const status = await repo.git.status()
    const previous = status.current
    await repo.git.checkout(name)
    try {
      await step(repo)
    } finally {
      if (previous && previous !== name) {
        await repo.git.checkout(previous)
      }
    }
  }
}

/**
 * Run any step against a submodule's working tree. The submodule is
 * presented to the step as a `TempGitRepo`-shaped object bound to
 * the submodule's path, so every atom in this package — `addCommit`,
 * `switchToBranch`, `seededFiles`, even nested `addSubmodule` — works
 * inside.
 *
 *   chain(
 *     addSubmodule({ path: 'vendor/lib', setup: chain(…) }),
 *     addCommit({ message: 'chore: add submodule' }),
 *     // Now make a commit inside the submodule that DOESN'T update
 *     // the parent's pin — produces the "out of date submodule" state
 *     // where the parent points at an older sha.
 *     insideSubmodule('vendor/lib', chain(
 *       addCommit({ message: 'feat: post-pin change', files: { … } }),
 *     )),
 *   )
 *
 * The wrapped repo's `cleanup` is a no-op — the submodule's lifetime
 * is owned by the parent. Calling cleanup on the parent removes the
 * submodule clone too.
 */
/**
 * Run a step with a specific author identity. Any commit-producing
 * atom inside the step (`addCommit`, `commit`, `emptyCommit`,
 * `amendCommit`, `cherryPick`, `revert`, `startMerge`) attributes
 * to the named author/email/(date) via the standard `GIT_AUTHOR_*`
 * + `GIT_COMMITTER_*` env vars.
 *
 *   withAuthor({ name: 'Alice', email: 'alice@example.com' }, chain(
 *     addCommit({ message: 'feat: alice work', files: { 'a.ts': '…' } }),
 *   ))
 *
 *   // Multi-contributor history:
 *   chain(
 *     withAuthor({ name: 'Alice', email: 'alice@x' }, addCommit({ message: 'feat: a' })),
 *     withAuthor({ name: 'Bob', email: 'bob@x' }, addCommit({ message: 'fix: b' })),
 *   )
 *
 * **Footgun**: simple-git's `env()` replaces (doesn't merge) env
 * vars. If an atom inside `withAuthor` also specifies its own
 * `date`, that atom's env override will clobber the author env for
 * that one command. To pin a date *and* author together, pass the
 * date into `withAuthor`:
 *
 *   withAuthor(
 *     { name: 'Alice', email: 'alice@x', date: daysAgo(30) },
 *     addCommit({ message: 'feat: a' }),   // no `date` here
 *   )
 *
 * The wrapped repo's `cleanup` is a no-op — the underlying repo is
 * owned by the caller; this scope only swaps the git instance for
 * the duration of `step`.
 */
export function withAuthor(identity: AuthorIdentity, step: Step): Step {
  return async (repo) => {
    const env: Record<string, string> = {
      GIT_AUTHOR_NAME: identity.name,
      GIT_AUTHOR_EMAIL: identity.email,
      GIT_COMMITTER_NAME: identity.name,
      GIT_COMMITTER_EMAIL: identity.email,
    }
    if (identity.date) {
      env.GIT_AUTHOR_DATE = identity.date
      env.GIT_COMMITTER_DATE = identity.date
    }
    // simple-git's `env()` MUTATES the receiver instance — chaining
    // `repo.git.env(...)` would leak the override outside this scope.
    // Build a fresh SimpleGit bound to the same workdir so the
    // original `repo.git` stays untouched.
    const scopedGit = simpleGit(repo.path).env(env)
    const scopedRepo: TempGitRepo = {
      path: repo.path,
      git: scopedGit,
      writeFile: repo.writeFile,
      readFile: repo.readFile,
      exists: repo.exists,
      commitAll: async (message) => {
        await scopedGit.add('.')
        // Pin a deterministic date (continuing the parent repo's clock)
        // while preserving the author identity env. Build a fresh
        // instance so we don't mutate `scopedGit` across commits.
        const date = identity.date ?? nextCommitDate(repo.path)
        await simpleGit(repo.path)
          .env({ ...env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date })
          .commit(message)
      },
      cleanup: async () => {
        // No-op: the parent's cleanup owns the actual repo.
      },
    }
    await step(scopedRepo)
  }
}

export function insideSubmodule(submodulePath: string, step: Step): Step {
  return async (parentRepo) => {
    const submoduleRoot = join(parentRepo.path, submodulePath)
    const submoduleGit = simpleGit(submoduleRoot)
    const submoduleRepo: TempGitRepo = {
      path: submoduleRoot,
      git: submoduleGit,
      writeFile: async (filePath, content) => {
        const abs = join(submoduleRoot, filePath)
        await mkdir(dirname(abs), { recursive: true })
        await writeFileFs(abs, content)
      },
      readFile: async (filePath) => {
        return readFileFs(join(submoduleRoot, filePath), 'utf8')
      },
      exists: async (filePath) => {
        return existsSync(join(submoduleRoot, filePath))
      },
      commitAll: async (message) => {
        await submoduleGit.add('.')
        // The submodule is its own repo with its own history, so it
        // gets its own deterministic clock keyed by its path.
        const date = nextCommitDate(submoduleRoot)
        await simpleGit(submoduleRoot)
          .env({ GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date })
          .commit(message)
      },
      cleanup: async () => {
        // No-op: the parent's cleanup removes the submodule clone too.
      },
    }
    await step(submoduleRepo)
  }
}

/**
 * Simulate "the remote has commits we don't" — runs `step` against a
 * temporary clone of the parent (starting from the parent's current
 * branch state), then fetches the clone's resulting branch tip back
 * into the parent as `refs/remotes/<remote>/<branch>`.
 *
 * The clone uses the parent's history as the baseline, so commits
 * inside the step build on top of whatever local state already
 * exists. The parent's working tree, refs, and current branch are
 * **untouched** — only the remote-tracking ref gets updated.
 *
 *   chain(
 *     addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
 *     addCommit({ message: 'feat: A', files: { 'a.ts': 'a' } }),
 *     addRemote('origin', '/fake/url'),
 *
 *     // Simulate upstream having 2 commits we don't.
 *     withRemoteTracking('origin', 'main', chain(
 *       addCommit({ message: 'upstream feat B', files: { 'b.ts': 'b' } }),
 *       addCommit({ message: 'upstream feat C', files: { 'c.ts': 'c' } }),
 *     )),
 *
 *     setUpstream('main', 'origin'),
 *     // git status now reports: "Your branch is behind 'origin/main' by 2 commits"
 *   )
 *
 * For "diverged" scenarios (both ahead and behind), compose with
 * additional local commits after `withRemoteTracking`:
 *
 *   chain(
 *     addCommit({ message: 'init' }),
 *     addRemote('origin', '/fake/url'),
 *     withRemoteTracking('origin', 'main', chain(
 *       addCommit({ message: 'upstream only' }),
 *     )),
 *     addCommit({ message: 'local only' }),  // diverges from upstream
 *     setUpstream('main', 'origin'),
 *   )
 *
 * **Precondition**: the named branch must exist on the parent at the
 * time this atom runs. The clone is initialized from the parent's
 * current state of that branch.
 *
 * Shells out to `git clone` + `git fetch` via `child_process` so the
 * `-c protocol.file.allow=always` config can be passed (required on
 * git ≥ 2.38 for file-protocol URLs — CVE-2022-39253).
 */
export function withRemoteTracking(remote: string, branch: string, step: Step): Step {
  return async (parentRepo) => {
    const clonePath = await mkdtemp(join(tmpdir(), 'coco-remote-track-'))
    try {
      // Clone parent into the temp dir. `protocol.file.allow=always`
      // is needed for file-protocol clones on git ≥ 2.38.
      await execFileAsync(
        'git',
        ['-c', 'protocol.file.allow=always', 'clone', parentRepo.path, clonePath],
      )

      const cloneGit = simpleGit(clonePath)
      // Identity + gpgsign on the clone so commits made inside `step`
      // don't fall back to global git config (which CI runners lack).
      await cloneGit.addConfig('user.name', 'Git Scenarios Test')
      await cloneGit.addConfig('user.email', 'test@git-scenarios.dev')
      await cloneGit.addConfig('commit.gpgsign', 'false')

      // The clone's local branches only include the parent's currently-
      // active branch (default clone behavior). Check out `branch` —
      // create a local one from `origin/<branch>` if needed.
      const localBranches = await cloneGit.branchLocal()
      if (localBranches.all.includes(branch)) {
        await cloneGit.checkout(branch)
      } else {
        await cloneGit.checkout(['-b', branch, `origin/${branch}`])
      }

      // Wrap the clone as a TempGitRepo so the step sees the same
      // shape it would on the parent.
      const cloneRepo: TempGitRepo = {
        path: clonePath,
        git: cloneGit,
        writeFile: async (filePath, content) => {
          const abs = join(clonePath, filePath)
          await mkdir(dirname(abs), { recursive: true })
          await writeFileFs(abs, content)
        },
        readFile: async (filePath) => {
          return readFileFs(join(clonePath, filePath), 'utf8')
        },
        exists: async (filePath) => {
          return existsSync(join(clonePath, filePath))
        },
        commitAll: async (message) => {
          await cloneGit.add('.')
          // Continue the PARENT's clock (keyed by parentRepo.path), not
          // the clone's — otherwise upstream commits would reuse the same
          // timestamps as the parent's local commits and `git log --all`
          // ordering between the diverged tips would tie (non-deterministic).
          const date = nextCommitDate(parentRepo.path)
          await simpleGit(clonePath)
            .env({ GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date })
            .commit(message)
        },
        cleanup: async () => {
          // No-op: outer finally handles cleanup.
        },
      }
      await step(cloneRepo)

      // Fetch the clone's resulting branch tip back into the parent's
      // remote-tracking ref. The `+` prefix forces non-fast-forward
      // updates (useful for divergent histories).
      await execFileAsync(
        'git',
        [
          '-c',
          'protocol.file.allow=always',
          'fetch',
          clonePath,
          `+${branch}:refs/remotes/${remote}/${branch}`,
        ],
        { cwd: parentRepo.path },
      )
    } finally {
      await rm(clonePath, { recursive: true, force: true })
    }
  }
}
