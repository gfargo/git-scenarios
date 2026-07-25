/**
 * Environment handling for git invocations.
 *
 * ## Why this module exists
 *
 * `simple-git`'s `.env()` has two properties that combine into a
 * footgun:
 *
 *   1. **It mutates the receiver.** `git.env({...})` sets
 *      `_executor.env` on the *same* instance and returns `this` — it
 *      does not clone. So `repo.git.env({...}).raw([...])` leaves the
 *      override in place for every subsequent command on `repo.git`.
 *   2. **The object form replaces the whole environment.**
 *      `_executor.env` is handed to `spawn` as `env:`, so
 *      `.env({ GIT_COMMITTER_DATE: d })` runs git with *only* that one
 *      variable — no `PATH`, no `HOME`.
 *
 * Both bite in practice:
 *
 *   - Pinning a commit date leaked onto the shared instance, so later
 *     atoms that don't pin (`startRebase`, `stashChanges`) silently
 *     inherited a stale timestamp — producing tied committer dates and
 *     defeating the monotonic commit clock.
 *   - Replacing the environment broke `installHook`: a `#!/bin/sh`
 *     hook that shells out to a toolchain binary can't find it,
 *     because `PATH` is gone.
 *   - `withAuthor` set the identity via `.env()`, then every commit
 *     atom's own `.env({dates})` replaced it — so the author was
 *     silently dropped.
 *
 * ## The rule
 *
 * Never call `.env()` on a shared instance, and always merge rather
 * than replace. Every git invocation that needs extra environment goes
 * through {@link gitAt} or {@link gitForRepo}, which build a **fresh**
 * instance whose env is `process.env` + any inherited scope + the
 * caller's additions.
 */

import { simpleGit, type SimpleGit } from 'simple-git'

import type { TempGitRepo } from '../tempGitRepo'

/** Extra environment variables layered onto a git invocation. */
export type GitEnv = Record<string, string>

/**
 * Environment variables that `simple-git` refuses to pass through
 * without an explicit `allowUnsafe*` opt-in, because they let the
 * surrounding shell redirect git into arbitrary executables.
 *
 * We strip them when inheriting `process.env` rather than opting in.
 * That serves two purposes:
 *
 *   1. `simple-git` throws `Use of "EDITOR" is not permitted…` if any
 *      are present, and `EDITOR` / `PAGER` / `PREFIX` are set in most
 *      developer shells and in npm script environments.
 *   2. Fixtures should be **hermetic**. A contributor's `$EDITOR` or
 *      `$GIT_SSH_COMMAND` must not change the repo a scenario builds,
 *      or scenarios stop being reproducible across machines.
 *
 * Mirrors `@simple-git/argv-parser`'s unsafe-env table.
 */
const UNSAFE_ENV_KEYS = new Set([
  'EDITOR',
  'GIT_ASKPASS',
  'GIT_CONFIG',
  'GIT_CONFIG_COUNT',
  'GIT_CONFIG_GLOBAL',
  'GIT_CONFIG_SYSTEM',
  'GIT_EDITOR',
  'GIT_EXEC_PATH',
  'GIT_EXTERNAL_DIFF',
  'GIT_PAGER',
  'GIT_PROXY_COMMAND',
  'GIT_SEQUENCE_EDITOR',
  'GIT_SSH',
  'GIT_SSH_COMMAND',
  'GIT_TEMPLATE_DIR',
  'PAGER',
  'PREFIX',
  'SSH_ASKPASS',
])

/**
 * `process.env` with the unsafe/git-redirecting keys removed, and
 * `undefined` values dropped so the result is a clean `GitEnv`.
 */
function inheritableProcessEnv(): GitEnv {
  const out: GitEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue
    if (UNSAFE_ENV_KEYS.has(key.toUpperCase())) continue
    out[key] = value
  }
  return out
}

/**
 * Scope-inherited environment (e.g. the author identity installed by
 * `withAuthor`), keyed by the `TempGitRepo` handle it applies to.
 *
 * A `WeakMap` keeps this out of the public `TempGitRepo` type — scopes
 * are an internal concern and shouldn't widen the API surface — while
 * letting entries be collected with the repo handle.
 */
const scopedEnv = new WeakMap<object, GitEnv>()

/**
 * Associate inherited environment with a repo handle. Called by the
 * scope atoms (`withAuthor`) so commit atoms running inside the scope
 * can merge the identity instead of clobbering it.
 */
export function setScopedEnv(repo: object, env: GitEnv): void {
  scopedEnv.set(repo, env)
}

/** Read the inherited scope environment for a repo handle (empty if none). */
export function getScopedEnv(repo: object): GitEnv {
  return scopedEnv.get(repo) ?? {}
}

/**
 * Build a fresh `SimpleGit` bound to `path` whose environment is
 * `process.env` merged with `inherited`, then `extra`.
 *
 * Use when you have a path but no `TempGitRepo` handle (submodule and
 * clone sub-repos).
 */
export function gitAt(path: string, extra: GitEnv = {}, inherited: GitEnv = {}): SimpleGit {
  return simpleGit(path).env({
    ...inheritableProcessEnv(),
    ...inherited,
    ...extra,
  })
}

/**
 * Build a fresh `SimpleGit` for `repo` with `extra` environment layered
 * on top of `process.env` and any scope-inherited environment.
 *
 * This is the standard way for an atom to pin a date (or any other
 * `GIT_*` variable) without mutating `repo.git` and without stripping
 * the child environment.
 *
 *   await gitForRepo(repo, {
 *     GIT_AUTHOR_DATE: date,
 *     GIT_COMMITTER_DATE: date,
 *   }).raw(['commit', '-m', message])
 */
export function gitForRepo(repo: TempGitRepo, extra: GitEnv = {}): SimpleGit {
  return gitAt(repo.path, extra, getScopedEnv(repo))
}

/**
 * Convenience for the overwhelmingly common case: pin author and
 * committer date to the same value.
 */
export function datePin(date: string): GitEnv {
  return { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }
}
