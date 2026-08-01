/**
 * Capture a structured, point-in-time description of a git repository's
 * state — the programmatic counterpart to the `inspect` CLI command.
 *
 * `inspect`, `capture`, the planned test matchers, the `diff`/`doctor`
 * CLI commands, and contract verification all need the same "describe
 * the current state" logic. `snapshotRepo` is that single source of
 * truth: given a `simple-git` instance and the repo path, it returns a
 * `RepoSnapshot` covering HEAD, branches, working-tree status,
 * in-progress operation, conflicts, and the commit graph.
 *
 * It is read-only — it runs git plumbing and reads a few files under the
 * git dir, and never mutates the repo.
 */

import { access } from 'fs/promises'
import { constants } from 'fs'
import { join } from 'path'
import type { SimpleGit } from 'simple-git'

/** An in-progress, resumable git operation, or `null` when none is active. */
export type InProgressOperation =
  | 'merge'
  | 'rebase'
  | 'cherry-pick'
  | 'revert'
  | 'bisect'
  | null

/** Where HEAD points right now. */
export type HeadSnapshot = {
  /** Current branch name, or `null` when HEAD is detached or the repo is empty. */
  branch: string | null
  /** True when HEAD points directly at a commit rather than a branch. */
  detached: boolean
  /** Short SHA of the commit HEAD resolves to, or `null` on an empty repo. */
  sha: string | null
}

/** Working-tree status, split by stage. */
export type StatusSnapshot = {
  /** True when there are no staged, unstaged, or untracked changes. */
  clean: boolean
  /** Paths with staged (index) changes. */
  staged: string[]
  /** Tracked paths with unstaged working-tree modifications or deletions. */
  modified: string[]
  /** Untracked paths. */
  untracked: string[]
  /** Commits the current branch is ahead of its upstream (0 when no upstream). */
  ahead: number
  /** Commits the current branch is behind its upstream (0 when no upstream). */
  behind: number
  /**
   * Upstream tracking ref for the current branch (e.g. `"origin/main"`),
   * or `null` when the branch has no upstream configured.
   */
  upstream: string | null
}

/** The full structured state of a repository at one moment. */
export type RepoSnapshot = {
  head: HeadSnapshot
  /** Local branch names (sorted as git reports them). */
  branches: string[]
  status: StatusSnapshot
  /** Total commits reachable from HEAD (0 on an empty repo). */
  commitCount: number
  /** The resumable operation currently in progress, or `null`. */
  operation: InProgressOperation
  /** Unmerged (conflicted) paths. Empty unless a merge/rebase/etc. is mid-conflict. */
  conflicts: string[]
  /** Number of entries in the stash. */
  stashes: number
  /**
   * `git log --graph --oneline --all` lines (decorations included,
   * never colored). Empty on a repo with no commits.
   */
  graph: string[]
}

async function safeRaw(git: SimpleGit, args: string[]): Promise<string> {
  try {
    return (await git.raw(args)).trimEnd()
  } catch {
    return ''
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p, constants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Detect a resumable operation by probing for the marker files git
 * writes under its git dir. Order matters: a rebase that hits a conflict
 * during a pick also writes MERGE_HEAD, so rebase is checked first.
 */
async function detectOperation(git: SimpleGit): Promise<InProgressOperation> {
  // `--absolute-git-dir` resolves correctly for linked worktrees, where
  // the git dir lives under `.git/worktrees/<name>` rather than `.git`.
  const gitDir = await safeRaw(git, ['rev-parse', '--absolute-git-dir'])
  if (!gitDir) return null

  if (
    (await pathExists(join(gitDir, 'rebase-merge'))) ||
    (await pathExists(join(gitDir, 'rebase-apply')))
  ) {
    return 'rebase'
  }
  if (await pathExists(join(gitDir, 'MERGE_HEAD'))) return 'merge'
  if (await pathExists(join(gitDir, 'CHERRY_PICK_HEAD'))) return 'cherry-pick'
  if (await pathExists(join(gitDir, 'REVERT_HEAD'))) return 'revert'
  if (await pathExists(join(gitDir, 'BISECT_LOG'))) return 'bisect'
  return null
}

/**
 * Parse `git status --porcelain=v1 -b` output into the staged /
 * modified / untracked split plus upstream ahead/behind counts.
 *
 * Porcelain XY codes: X is the index (staged) state, Y the worktree
 * (unstaged) state. `??` is untracked; `U`/`DD`/`AA` etc. are conflicts
 * and are reported separately via the diff-filter below, so they're not
 * double-counted as staged/modified here.
 */
function parseStatus(raw: string): Omit<StatusSnapshot, 'clean'> {
  const staged: string[] = []
  const modified: string[] = []
  const untracked: string[] = []
  let ahead = 0
  let behind = 0
  let upstream: string | null = null

  for (const line of raw.split('\n')) {
    if (!line) continue

    if (line.startsWith('## ')) {
      const aheadMatch = line.match(/\bahead (\d+)/)
      const behindMatch = line.match(/\bbehind (\d+)/)
      if (aheadMatch) ahead = Number(aheadMatch[1])
      if (behindMatch) behind = Number(behindMatch[1])
      // Parse the upstream ref from the branch header: "## branch...upstream [ahead/behind N]"
      // The "..." separator is unambiguous because git forbids ".." in ref names.
      const dotdotdot = line.indexOf('...')
      if (dotdotdot !== -1) {
        // Upstream ref follows "...", ends at the next space (before "[ahead N]" etc.)
        const afterSep = line.slice(dotdotdot + 3)
        const spaceIdx = afterSep.indexOf(' ')
        upstream = spaceIdx === -1 ? afterSep : afterSep.slice(0, spaceIdx)
      }
      continue
    }

    const x = line[0]
    const y = line[1]
    let path = line.slice(3)
    // Renames show as `orig -> new`; report the new path.
    if (path.includes(' -> ')) path = path.split(' -> ')[1]

    if (x === '?' && y === '?') {
      untracked.push(path)
      continue
    }
    // Conflicts (any side 'U', or the symmetric AA/DD pairs) are handled
    // by the dedicated diff-filter=U pass; skip them here.
    if (x === 'U' || y === 'U' || (x === 'A' && y === 'A') || (x === 'D' && y === 'D')) {
      continue
    }
    if (x !== ' ' && x !== '?') staged.push(path)
    if (y !== ' ' && y !== '?') modified.push(path)
  }

  return { staged, modified, untracked, ahead, behind, upstream }
}

/**
 * Build a {@link RepoSnapshot} from the provided `simple-git` instance.
 * Read-only — runs git plumbing and reads a few marker files under the
 * git dir, never mutating the repo.
 *
 * The git dir (needed for in-progress-operation detection) is resolved
 * via `rev-parse --absolute-git-dir`, so this works for linked worktrees
 * as well as ordinary repos — no working-tree path argument required.
 *
 * @param git - a `simple-git` instance bound to the repo
 */
export async function snapshotRepo(git: SimpleGit): Promise<RepoSnapshot> {
  // HEAD. `symbolic-ref` succeeds (and names the branch) whenever HEAD
  // points at a branch — including a fresh repo whose branch has no
  // commits yet. It fails only when HEAD is detached.
  const branch = await safeRaw(git, ['symbolic-ref', '--short', '-q', 'HEAD'])
  const sha = await safeRaw(git, ['rev-parse', '--short', 'HEAD'])
  const hasCommits = sha.length > 0
  const detached = hasCommits && branch.length === 0

  const branchesRaw = await safeRaw(git, ['branch', '--format=%(refname:short)'])
  const branches = branchesRaw ? branchesRaw.split('\n').filter(Boolean) : []

  const statusRaw = await safeRaw(git, ['status', '--porcelain=v1', '-b'])
  const status = parseStatus(statusRaw)

  const conflictsRaw = await safeRaw(git, ['diff', '--name-only', '--diff-filter=U'])
  const conflicts = conflictsRaw ? conflictsRaw.split('\n').filter(Boolean) : []

  const commitCountRaw = await safeRaw(git, ['rev-list', '--count', 'HEAD'])
  const commitCount = commitCountRaw ? Number(commitCountRaw) : 0

  const stashRaw = await safeRaw(git, ['stash', 'list'])
  const stashes = stashRaw ? stashRaw.split('\n').filter(Boolean).length : 0

  const operation = await detectOperation(git)

  const graphRaw = await safeRaw(git, [
    'log',
    '--graph',
    '--oneline',
    '--all',
    '--decorate',
    '--color=never',
  ])
  const graph = graphRaw ? graphRaw.split('\n') : []

  const clean =
    status.staged.length === 0 &&
    status.modified.length === 0 &&
    status.untracked.length === 0 &&
    conflicts.length === 0

  return {
    head: {
      branch: branch.length > 0 ? branch : null,
      detached,
      sha: hasCommits ? sha : null,
    },
    branches,
    status: { clean, ...status },
    commitCount,
    operation,
    conflicts,
    stashes,
    graph,
  }
}
