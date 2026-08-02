/**
 * `verifyContracts(repo, scenario)` — machine-verify a scenario's
 * declared contracts against the materialized repository.
 *
 * Each contract is a human-readable string (e.g. "main has 3 commits",
 * "worktree is clean"). This module parses those strings against a
 * known grammar and checks the actual repo state.
 *
 * Contracts that don't match any known pattern are reported as
 * "unrecognized" — they pass (to avoid false negatives on
 * documentation-only contracts) but are flagged so authors know they
 * aren't being machine-verified.
 *
 * @example
 * ```ts
 * import { spinUpScenario, verifyContracts } from '@gfargo/git-scenarios'
 * import { featurePrReadyScenario } from '@gfargo/git-scenarios/scenarios'
 *
 * const repo = await spinUpScenario('feature-pr-ready')
 * const results = await verifyContracts(repo, featurePrReadyScenario)
 * // results: ContractResult[] — each with pass/fail + message
 * ```
 */

import type { SimpleGit } from 'simple-git'
import { access } from 'fs/promises'
import { constants } from 'fs'
import { isAbsolute, join } from 'path'

import type { TempGitRepo } from './tempGitRepo'
import type { Scenario } from './scenarios/types'
import { snapshotRepo, type RepoSnapshot } from './snapshot'

// ─── Public types ────────────────────────────────────────────────────

/** Result of verifying a single contract string. */
export type ContractResult = {
  /** The original contract string from the scenario definition. */
  contract: string
  /** Whether the contract passed verification. */
  pass: boolean
  /**
   * Human-readable explanation. On failure, describes the mismatch.
   * On pass, confirms the check. For unrecognized contracts, explains
   * that no parser matched.
   */
  message: string
  /**
   * Whether this contract was machine-verified. `false` means the
   * contract string didn't match any known pattern — it's reported as
   * passing but not actually checked.
   */
  verified: boolean
}

/** Aggregate result of verifying all contracts for a scenario. */
export type VerifyContractsResult = {
  /** The scenario name. */
  scenario: string
  /** Per-contract results in declaration order. */
  results: ContractResult[]
  /** True when every contract passed (including unrecognized ones). */
  allPassed: boolean
  /** Count of contracts that were machine-verified (matched a pattern). */
  verifiedCount: number
  /** Count of contracts that didn't match any known pattern. */
  unrecognizedCount: number
}

// ─── Contract matchers ───────────────────────────────────────────────

type Matcher = {
  /** Regex to test the contract string. Named groups feed the checker. */
  pattern: RegExp
  /**
   * Async checker: receives the regex match + repo state, returns pass/fail + message.
   * Returning `null` signals that the pattern matched syntactically but the target
   * ref/resource doesn't exist — the contract should be treated as unrecognized.
   */
  check: (match: RegExpMatchArray, snap: RepoSnapshot, git: SimpleGit, repoPath: string) => Promise<{ pass: boolean; message: string } | null>
}

const matchers: Matcher[] = [
  // ── "<branch> is checked out" ──
  {
    pattern: /^(?<branch>.+?) is checked out$/,
    check: async (m, snap) => {
      const branch = m.groups!.branch
      const actual = snap.head.branch
      if (actual === branch) {
        return { pass: true, message: `"${branch}" is checked out.` }
      }
      return { pass: false, message: `Expected "${branch}" to be checked out, but HEAD is on "${actual ?? '(detached)'}"` }
    },
  },

  // ── "main is the current branch" (variant used by empty-repo) ──
  {
    pattern: /^(?<branch>.+?) is the current branch$/,
    check: async (m, snap) => {
      const branch = m.groups!.branch
      const actual = snap.head.branch
      if (actual === branch) {
        return { pass: true, message: `"${branch}" is the current branch.` }
      }
      return { pass: false, message: `Expected "${branch}" to be the current branch, but HEAD is on "${actual ?? '(detached)'}"` }
    },
  },

  // ── "HEAD is detached" ──
  {
    pattern: /^HEAD is detached$/,
    check: async (_m, snap) => {
      if (snap.head.detached) {
        return { pass: true, message: 'HEAD is detached.' }
      }
      return { pass: false, message: `Expected detached HEAD, but it is on "${snap.head.branch}"` }
    },
  },

  // ── "HEAD is unborn (no commits)" ──
  {
    pattern: /^HEAD is unborn \(no commits\)$/,
    check: async (_m, snap) => {
      if (snap.commitCount === 0) {
        return { pass: true, message: 'HEAD is unborn (no commits).' }
      }
      return { pass: false, message: `Expected unborn HEAD (0 commits), but found ${snap.commitCount} commits.` }
    },
  },

  // ── "<branch> has N commits" ──
  {
    pattern: /^(?<branch>.+?) has (?<n>\d+) commits?$/,
    check: async (m, snap, git) => {
      const branch = m.groups!.branch
      const expected = parseInt(m.groups!.n, 10)
      let actual: number
      try {
        const out = await git.raw(['rev-list', '--count', branch])
        actual = parseInt(out.trim(), 10)
      } catch {
        // If the ref doesn't resolve, this contract likely uses a
        // contextual/qualified name (e.g. "parent main") that isn't a
        // real git ref. Return null to signal "unrecognized."
        return null
      }
      if (actual === expected) {
        return { pass: true, message: `"${branch}" has ${expected} commit(s).` }
      }
      return { pass: false, message: `Expected "${branch}" to have ${expected} commit(s), but found ${actual}.` }
    },
  },

  // ── "<branch> is N commits ahead of <ref>" ──
  {
    pattern: /^(?<branch>.+?) is (?<n>\d+) commits? ahead of (?<ref>.+)$/,
    check: async (m, _snap, git) => {
      const branch = m.groups!.branch
      const expected = parseInt(m.groups!.n, 10)
      const ref = m.groups!.ref
      let actual: number
      try {
        const out = await git.raw(['rev-list', '--count', `${ref}..${branch}`])
        actual = parseInt(out.trim(), 10)
      } catch {
        // If either ref doesn't resolve, treat as unrecognized
        return null
      }
      if (actual === expected) {
        return { pass: true, message: `"${branch}" is ${expected} commit(s) ahead of "${ref}".` }
      }
      return { pass: false, message: `Expected "${branch}" to be ${expected} commit(s) ahead of "${ref}", but found ${actual}.` }
    },
  },

  // ── "<branch> is N commits behind <ref>" ──
  {
    pattern: /^(?<branch>.+?) is (?<n>\d+) commits? behind (?<ref>.+)$/,
    check: async (m, _snap, git) => {
      const branch = m.groups!.branch
      const expected = parseInt(m.groups!.n, 10)
      const ref = m.groups!.ref
      let actual: number
      try {
        const out = await git.raw(['rev-list', '--count', `${branch}..${ref}`])
        actual = parseInt(out.trim(), 10)
      } catch {
        // If either ref doesn't resolve, treat as unrecognized
        return null
      }
      if (actual === expected) {
        return { pass: true, message: `"${branch}" is ${expected} commit(s) behind "${ref}".` }
      }
      return { pass: false, message: `Expected "${branch}" to be ${expected} commit(s) behind "${ref}", but found ${actual}.` }
    },
  },

  // ── "<branch> is N ahead and M behind <ref>" ──
  {
    pattern: /^(?<branch>.+?) is (?<ahead>\d+) ahead and (?<behind>\d+) behind (?<ref>.+)$/,
    check: async (m, _snap, git) => {
      const branch = m.groups!.branch
      const expectedAhead = parseInt(m.groups!.ahead, 10)
      const expectedBehind = parseInt(m.groups!.behind, 10)
      const ref = m.groups!.ref
      let actualAhead: number
      let actualBehind: number
      try {
        const outA = await git.raw(['rev-list', '--count', `${ref}..${branch}`])
        actualAhead = parseInt(outA.trim(), 10)
        const outB = await git.raw(['rev-list', '--count', `${branch}..${ref}`])
        actualBehind = parseInt(outB.trim(), 10)
      } catch {
        // If either ref doesn't resolve, treat as unrecognized
        return null
      }
      if (actualAhead === expectedAhead && actualBehind === expectedBehind) {
        return { pass: true, message: `"${branch}" is ${expectedAhead} ahead and ${expectedBehind} behind "${ref}".` }
      }
      return { pass: false, message: `Expected "${branch}" to be ${expectedAhead} ahead / ${expectedBehind} behind "${ref}", but found ${actualAhead} ahead / ${actualBehind} behind.` }
    },
  },

  // ── "worktree is clean" ──
  {
    pattern: /^worktree is clean$/,
    check: async (_m, snap) => {
      if (snap.status.clean) {
        return { pass: true, message: 'Worktree is clean.' }
      }
      const parts = []
      if (snap.status.staged.length) parts.push(`${snap.status.staged.length} staged`)
      if (snap.status.modified.length) parts.push(`${snap.status.modified.length} modified`)
      if (snap.status.untracked.length) parts.push(`${snap.status.untracked.length} untracked`)
      return { pass: false, message: `Expected clean worktree, but found: ${parts.join(', ')}.` }
    },
  },

  // ── "working tree is empty" (variant for empty-repo) ──
  {
    pattern: /^working tree is empty$/,
    check: async (_m, snap) => {
      if (snap.status.clean && snap.commitCount === 0) {
        return { pass: true, message: 'Working tree is empty.' }
      }
      return { pass: false, message: 'Expected an empty working tree (no files, no commits).' }
    },
  },

  // ── "worktree has N staged files" ──
  {
    pattern: /^worktree has (?<n>\d+) staged files?$/,
    check: async (m, snap) => {
      const expected = parseInt(m.groups!.n, 10)
      const actual = snap.status.staged.length
      if (actual === expected) {
        return { pass: true, message: `Worktree has ${expected} staged file(s).` }
      }
      return { pass: false, message: `Expected ${expected} staged file(s), but found ${actual}.` }
    },
  },

  // ── "worktree has N unstaged files" ──
  {
    pattern: /^worktree has (?<n>\d+) unstaged files?$/,
    check: async (m, snap) => {
      const expected = parseInt(m.groups!.n, 10)
      const actual = snap.status.modified.length
      if (actual === expected) {
        return { pass: true, message: `Worktree has ${expected} unstaged file(s).` }
      }
      return { pass: false, message: `Expected ${expected} unstaged file(s), but found ${actual}.` }
    },
  },

  // ── "worktree has N untracked files" ──
  {
    pattern: /^worktree has (?<n>\d+) untracked files?$/,
    check: async (m, snap) => {
      const expected = parseInt(m.groups!.n, 10)
      const actual = snap.status.untracked.length
      if (actual === expected) {
        return { pass: true, message: `Worktree has ${expected} untracked file(s).` }
      }
      return { pass: false, message: `Expected ${expected} untracked file(s), but found ${actual}.` }
    },
  },

  // ── "worktree has N uncommitted changes" (from capture.ts) ──
  {
    pattern: /^worktree has (?<n>\d+) uncommitted changes?$/,
    check: async (m, snap) => {
      const expected = parseInt(m.groups!.n, 10)
      const actual = snap.status.staged.length + snap.status.modified.length + snap.status.untracked.length
      if (actual === expected) {
        return { pass: true, message: `Worktree has ${expected} uncommitted change(s).` }
      }
      return { pass: false, message: `Expected ${expected} uncommitted change(s), but found ${actual}.` }
    },
  },

  // ── "exactly N unresolved conflict(s)" ──
  {
    pattern: /^exactly (?<n>\d+) unresolved conflicts?$/,
    check: async (m, snap) => {
      const expected = parseInt(m.groups!.n, 10)
      const actual = snap.conflicts.length
      if (actual === expected) {
        return { pass: true, message: `Exactly ${expected} unresolved conflict(s).` }
      }
      return { pass: false, message: `Expected ${expected} conflict(s), but found ${actual}.` }
    },
  },

  // ── "a merge is in progress (MERGE_HEAD exists)" ──
  {
    pattern: /^a merge is in progress/,
    check: async (_m, snap) => {
      if (snap.operation === 'merge') {
        return { pass: true, message: 'A merge is in progress.' }
      }
      return { pass: false, message: `Expected a merge in progress, but operation is "${snap.operation ?? 'none'}".` }
    },
  },

  // ── "a rebase is in progress" ──
  {
    pattern: /^a rebase is in progress/,
    check: async (_m, snap) => {
      if (snap.operation === 'rebase') {
        return { pass: true, message: 'A rebase is in progress.' }
      }
      return { pass: false, message: `Expected a rebase in progress, but operation is "${snap.operation ?? 'none'}".` }
    },
  },

  // ── "a cherry-pick is in progress" ──
  {
    pattern: /^a cherry-pick is in progress/,
    check: async (_m, snap) => {
      if (snap.operation === 'cherry-pick') {
        return { pass: true, message: 'A cherry-pick is in progress.' }
      }
      return { pass: false, message: `Expected a cherry-pick in progress, but operation is "${snap.operation ?? 'none'}".` }
    },
  },

  // ── "a revert is in progress" ──
  {
    pattern: /^a revert is in progress/,
    check: async (_m, snap) => {
      if (snap.operation === 'revert') {
        return { pass: true, message: 'A revert is in progress.' }
      }
      return { pass: false, message: `Expected a revert in progress, but operation is "${snap.operation ?? 'none'}".` }
    },
  },

  // ── "bisect is active" or "a bisect is in progress" ──
  {
    pattern: /^(?:bisect is active|a bisect is in progress)/,
    check: async (_m, snap) => {
      if (snap.operation === 'bisect') {
        return { pass: true, message: 'Bisect is active.' }
      }
      return { pass: false, message: `Expected bisect to be active, but operation is "${snap.operation ?? 'none'}".` }
    },
  },

  // ── "git stash list reports N entries" ──
  {
    pattern: /^git stash list reports (?<n>\d+) entr(?:y|ies)$/,
    check: async (m, snap) => {
      const expected = parseInt(m.groups!.n, 10)
      const actual = snap.stashes
      if (actual === expected) {
        return { pass: true, message: `Git stash list reports ${expected} entry/entries.` }
      }
      return { pass: false, message: `Expected ${expected} stash entries, but found ${actual}.` }
    },
  },

  // ── "no stashes" ──
  {
    pattern: /^no stashes$/,
    check: async (_m, snap) => {
      if (snap.stashes === 0) {
        return { pass: true, message: 'No stashes.' }
      }
      return { pass: false, message: `Expected no stashes, but found ${snap.stashes}.` }
    },
  },

  // ── "no remotes configured" ──
  {
    pattern: /^no remotes configured$/,
    check: async (_m, _snap, git) => {
      const out = await git.raw(['remote'])
      const remotes = out.trim().split('\n').filter(Boolean)
      if (remotes.length === 0) {
        return { pass: true, message: 'No remotes configured.' }
      }
      return { pass: false, message: `Expected no remotes, but found: [${remotes.join(', ')}].` }
    },
  },

  // ── "no tags" ──
  {
    pattern: /^no tags$/,
    check: async (_m, _snap, git) => {
      const out = await git.raw(['tag'])
      const tags = out.trim().split('\n').filter(Boolean)
      if (tags.length === 0) {
        return { pass: true, message: 'No tags.' }
      }
      return { pass: false, message: `Expected no tags, but found ${tags.length}: [${tags.join(', ')}].` }
    },
  },

  // ── "<branch> still exists as a branch" ──
  {
    pattern: /^(?<branch>.+?) still exists as a branch$/,
    check: async (m, snap) => {
      const branch = m.groups!.branch
      if (snap.branches.includes(branch)) {
        return { pass: true, message: `"${branch}" still exists as a branch.` }
      }
      return { pass: false, message: `Expected "${branch}" to exist as a branch, but it does not. Branches: [${snap.branches.join(', ')}].` }
    },
  },

  // ── "HEAD is N commits behind <ref>" ──
  {
    pattern: /^HEAD is (?<n>\d+) commits? behind (?<ref>.+)$/,
    check: async (m, _snap, git) => {
      const expected = parseInt(m.groups!.n, 10)
      const ref = m.groups!.ref
      let actual: number
      try {
        const out = await git.raw(['rev-list', '--count', `HEAD..${ref}`])
        actual = parseInt(out.trim(), 10)
      } catch {
        return { pass: false, message: `Could not count commits between HEAD and "${ref}".` }
      }
      if (actual === expected) {
        return { pass: true, message: `HEAD is ${expected} commit(s) behind "${ref}".` }
      }
      return { pass: false, message: `Expected HEAD to be ${expected} commit(s) behind "${ref}", but found ${actual}.` }
    },
  },

  // ── "<branch> tracks <remote>" ──
  {
    pattern: /^(?<branch>.+?) tracks (?<remote>.+)$/,
    check: async (m, _snap, git) => {
      const branch = m.groups!.branch
      const remote = m.groups!.remote
      let upstream: string
      try {
        upstream = (await git.raw(['config', `branch.${branch}.remote`])).trim()
        const merge = (await git.raw(['config', `branch.${branch}.merge`])).trim()
        const remoteBranch = merge.replace('refs/heads/', '')
        const fullUpstream = `${upstream}/${remoteBranch}`
        if (fullUpstream === remote) {
          return { pass: true, message: `"${branch}" tracks "${remote}".` }
        }
        return { pass: false, message: `Expected "${branch}" to track "${remote}", but it tracks "${fullUpstream}".` }
      } catch {
        return { pass: false, message: `"${branch}" does not have an upstream configured.` }
      }
    },
  },

  // ── "<branch> has no upstream configured" ──
  {
    pattern: /^(?<branch>.+?) has no upstream configured$/,
    check: async (m, _snap, git) => {
      const branch = m.groups!.branch
      try {
        const remote = (await git.raw(['config', `branch.${branch}.remote`])).trim()
        if (!remote) {
          // Empty value means no real upstream
          return { pass: true, message: `"${branch}" has no upstream configured.` }
        }
        return { pass: false, message: `Expected "${branch}" to have no upstream, but it has one configured (remote: "${remote}").` }
      } catch {
        return { pass: true, message: `"${branch}" has no upstream configured.` }
      }
    },
  },

  // ── "<branch> is at the same commit as <ref>" ──
  {
    pattern: /^(?<branch>.+?) is at the same commit as (?<ref>.+)$/,
    check: async (m, _snap, git) => {
      const branch = m.groups!.branch
      const ref = m.groups!.ref
      try {
        const sha1 = (await git.raw(['rev-parse', branch])).trim()
        const sha2 = (await git.raw(['rev-parse', ref])).trim()
        if (sha1 === sha2) {
          return { pass: true, message: `"${branch}" is at the same commit as "${ref}".` }
        }
        return { pass: false, message: `Expected "${branch}" and "${ref}" to be at the same commit, but they differ (${sha1.slice(0, 7)} vs ${sha2.slice(0, 7)}).` }
      } catch {
        return { pass: false, message: `Could not resolve "${branch}" or "${ref}".` }
      }
    },
  },

  // ── "<path> has unresolved conflict markers" ──
  {
    pattern: /^(?<path>.+?) has unresolved conflict markers$/,
    check: async (m, _snap, git, repoPath) => {
      const filePath = m.groups!.path
      try {
        const { readFile: rf } = await import('fs/promises')
        const content = await rf(join(repoPath, filePath), 'utf-8')
        if (content.includes('<<<<<<<') && content.includes('>>>>>>>')) {
          return { pass: true, message: `"${filePath}" has unresolved conflict markers.` }
        }
        return { pass: false, message: `Expected "${filePath}" to have conflict markers, but none found.` }
      } catch {
        return { pass: false, message: `Could not read "${filePath}" — file may not exist.` }
      }
    },
  },

  // ── "N linked worktree(s) exist(s)" ──
  {
    pattern: /^(?<n>\d+) linked worktrees? exists?$/,
    check: async (m, _snap, git) => {
      const expected = parseInt(m.groups!.n, 10)
      try {
        const out = await git.raw(['worktree', 'list', '--porcelain'])
        // Each worktree entry starts with "worktree " — subtract 1 for the main worktree
        const count = out.split('\n').filter((l) => l.startsWith('worktree ')).length - 1
        if (count === expected) {
          return { pass: true, message: `${expected} linked worktree(s) exist.` }
        }
        return { pass: false, message: `Expected ${expected} linked worktree(s), but found ${count}.` }
      } catch {
        return { pass: false, message: 'Could not list worktrees.' }
      }
    },
  },

  // ── ".git/rebase-merge/interactive exists" ──
  {
    pattern: /^\.git\/(?<path>.+?) exists$/,
    check: async (m, _snap, git, repoPath) => {
      const relPath = m.groups!.path
      // `--git-path` routes shared files to the common dir and
      // per-worktree files to the worktree's own git dir.
      const resolved = (await git.raw(['rev-parse', '--git-path', relPath])).trim()
      const fullPath = isAbsolute(resolved) ? resolved : join(repoPath, resolved)
      try {
        await access(fullPath, constants.F_OK)
        return { pass: true, message: `".git/${relPath}" exists.` }
      } catch {
        return { pass: false, message: `Expected ".git/${relPath}" to exist, but it does not.` }
      }
    },
  },

  // ── ".git/rebase-merge/git-rebase-todo has at least N remaining pick" ──
  {
    pattern: /^\.git\/rebase-merge\/git-rebase-todo has at least (?<n>\d+) remaining picks?$/,
    check: async (m, _snap, git, repoPath) => {
      const expected = parseInt(m.groups!.n, 10)
      const resolved = (
        await git.raw(['rev-parse', '--git-path', 'rebase-merge/git-rebase-todo'])
      ).trim()
      const todoPath = isAbsolute(resolved) ? resolved : join(repoPath, resolved)
      try {
        const { readFile: rf } = await import('fs/promises')
        const content = await rf(todoPath, 'utf-8')
        const picks = content.split('\n').filter((l) => /^(pick|p|reword|r|edit|e|squash|s|fixup|f|drop|d)\s/.test(l.trim()))
        if (picks.length >= expected) {
          return { pass: true, message: `Rebase todo has ${picks.length} remaining action(s) (>= ${expected}).` }
        }
        return { pass: false, message: `Expected at least ${expected} remaining pick(s) in todo, but found ${picks.length}.` }
      } catch {
        return { pass: false, message: 'Could not read .git/rebase-merge/git-rebase-todo.' }
      }
    },
  },
]

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Verify a scenario's contracts against a materialized repo.
 *
 * @param repo - A `TempGitRepo` (or anything with `.git: SimpleGit` and `.path: string`)
 * @param scenario - The scenario definition whose contracts to verify
 * @returns Aggregate result with per-contract pass/fail
 */
export async function verifyContracts(
  repo: TempGitRepo | { git: SimpleGit; path: string },
  scenario: Scenario,
): Promise<VerifyContractsResult> {
  const contracts = scenario.contracts ?? []
  const git = repo.git
  const repoPath = repo.path

  // Take a single snapshot to reuse across all matchers that need it
  const snap = await snapshotRepo(git)

  const results: ContractResult[] = []

  for (const contract of contracts) {
    let matched = false

    for (const matcher of matchers) {
      const m = contract.match(matcher.pattern)
      if (m) {
        matched = true
        try {
          const result = await matcher.check(m, snap, git, repoPath)
          // A null result means the pattern matched syntactically but
          // the ref/target doesn't exist — treat as unrecognized.
          if (result === null) {
            matched = false
            break
          }
          const { pass, message } = result
          results.push({ contract, pass, message, verified: true })
        } catch (err) {
          results.push({
            contract,
            pass: false,
            message: `Verification threw: ${err instanceof Error ? err.message : String(err)}`,
            verified: true,
          })
        }
        break
      }
    }

    if (!matched) {
      // Unrecognized contract — pass but flag as unverified
      results.push({
        contract,
        pass: true,
        message: `Unrecognized contract pattern — not machine-verified.`,
        verified: false,
      })
    }
  }

  return {
    scenario: scenario.name,
    results,
    allPassed: results.every((r) => r.pass),
    verifiedCount: results.filter((r) => r.verified).length,
    unrecognizedCount: results.filter((r) => !r.verified).length,
  }
}
