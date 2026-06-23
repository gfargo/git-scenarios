/**
 * Capture the *shape* of a real git repository as a reusable scenario
 * definition.
 *
 * The use case: you hit a bug in some git tool against a repo in a
 * peculiar state. Instead of hand-writing a scenario to reproduce it,
 * run `git-scenarios capture <path>` and get a `defineScenario(...)`
 * module that reproduces the *structure* — branch layout, commit-graph
 * shape, and working-tree dirty state — deterministically.
 *
 * What capture reproduces faithfully:
 *   - the current branch (and whether HEAD is detached)
 *   - the linear commit history of the current branch, including each
 *     commit's message and author date
 *   - divergence from a base branch (`main`/`master`) — i.e. "N commits
 *     ahead of main" — by replaying base commits on `main` then the
 *     branch-only commits on the captured branch
 *   - the working tree's dirty state: which paths are staged, modified,
 *     or untracked (with their current content, size-capped)
 *
 * What it deliberately does NOT reproduce:
 *   - exact commit hashes (impossible without identical trees + dates +
 *     parents; the whole point of the library is deterministic *fresh*
 *     hashes)
 *   - file *contents* of historical commits (placeholders are emitted so
 *     each commit is non-empty and the count matches)
 *   - merge topology and the contents of non-current local branches
 *     (those are surfaced as a comment for the user to fill in)
 *
 * The emitted module is a starting point you edit — not a byte-perfect
 * clone. That distinction is called out in the generated header comment.
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import type { SimpleGit } from 'simple-git'

import type { ScenarioKind } from './scenarios/types'

/** A single commit reduced to the fields a scenario can reproduce. */
export type CapturedCommit = {
  /** Commit subject (first line of the message). */
  message: string
  /** Author date as an ISO-8601 string, suitable for `addCommit({ date })`. */
  date: string
}

/** A single working-tree change. */
export type CapturedChange = {
  /** Path relative to the repo root. */
  path: string
  /** True if the change is present in the index (staged). */
  staged: boolean
  /**
   * True if the path is untracked (vs. a modification to a tracked
   * file). Reproduction differs slightly — see `renderScenarioModule`.
   */
  untracked: boolean
  /** Current working-tree content, or null if binary / too large / unreadable. */
  content: string | null
}

/** The full captured shape of a repository. */
export type CapturedState = {
  /** Current branch name, or null when HEAD is detached. */
  currentBranch: string | null
  /** True when HEAD points at a commit rather than a branch. */
  detached: boolean
  /** Base branch the current branch diverges from (`main`/`master`), if distinct. */
  baseBranch: string | null
  /** Commits on the base branch (oldest first). Empty when there's no distinct base. */
  baseCommits: CapturedCommit[]
  /**
   * Commits unique to the current branch (`base..HEAD`), oldest first.
   * When there's no distinct base branch, this holds the entire history.
   */
  branchCommits: CapturedCommit[]
  /** All local branch names. */
  localBranches: string[]
  /** Configured remotes. */
  remotes: { name: string; url: string }[]
  /** Working-tree changes (staged, modified, untracked). */
  changes: CapturedChange[]
  /** True when the working tree is clean. */
  clean: boolean
}

const MAX_CONTENT_BYTES = 4096
const UNIT_SEP = '\x1f'

/** Branch names tried, in order, as the divergence base. */
const BASE_CANDIDATES = ['main', 'master']

async function safeRaw(git: SimpleGit, args: string[]): Promise<string> {
  try {
    return (await git.raw(args)).trimEnd()
  } catch {
    return ''
  }
}

/**
 * Parse `git log` output produced with the unit-separated format used
 * below. Each line is `subject␟author-ISO-date`.
 */
function parseCommits(raw: string): CapturedCommit[] {
  if (!raw) return []
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [message, date] = line.split(UNIT_SEP)
      return { message: message ?? '', date: date ?? '' }
    })
}

async function logCommits(git: SimpleGit, range: string): Promise<CapturedCommit[]> {
  // %s = subject, %aI = author date (strict ISO-8601). --reverse →
  // oldest first, which is replay order. --first-parent keeps the line
  // linear through merges so the replayed history stays tractable.
  const raw = await safeRaw(git, [
    'log',
    '--first-parent',
    '--reverse',
    `--format=%s${UNIT_SEP}%aI`,
    range,
  ])
  return parseCommits(raw)
}

async function readChangeContent(cwd: string, path: string): Promise<string | null> {
  try {
    const buf = await readFile(join(cwd, path))
    if (buf.length > MAX_CONTENT_BYTES) return null
    // Heuristic binary check: a NUL byte means "not text".
    if (buf.includes(0)) return null
    return buf.toString('utf8')
  } catch {
    return null
  }
}

/**
 * Inspect a repository and return its captured shape. Pure read-only —
 * runs only `git` plumbing/porcelain and reads working-tree files.
 */
export async function gatherRepoState(git: SimpleGit, cwd: string): Promise<CapturedState> {
  const headRef = await safeRaw(git, ['rev-parse', '--abbrev-ref', 'HEAD'])
  const detached = headRef === 'HEAD' || headRef === ''
  const currentBranch = detached ? null : headRef

  const branchRaw = await safeRaw(git, ['branch', '--format=%(refname:short)'])
  const localBranches = branchRaw ? branchRaw.split('\n').filter(Boolean) : []

  // Pick a base branch to diverge from: the first of main/master that
  // exists and isn't the current branch.
  const baseBranch =
    BASE_CANDIDATES.find((b) => localBranches.includes(b) && b !== currentBranch) ?? null

  let baseCommits: CapturedCommit[] = []
  let branchCommits: CapturedCommit[] = []
  if (baseBranch) {
    baseCommits = await logCommits(git, baseBranch)
    branchCommits = await logCommits(git, `${baseBranch}..HEAD`)
  } else {
    // No distinct base — replay the entire current history on `main`.
    branchCommits = await logCommits(git, 'HEAD')
  }

  // Remotes — `git remote -v` lists fetch + push; collapse to one per name.
  const remoteRaw = await safeRaw(git, ['remote', '-v'])
  const remoteMap = new Map<string, string>()
  for (const line of remoteRaw.split('\n').filter(Boolean)) {
    const [name, rest] = line.split('\t')
    if (name && rest) remoteMap.set(name, rest.replace(/\s+\((fetch|push)\)$/, ''))
  }
  const remotes = [...remoteMap].map(([name, url]) => ({ name, url }))

  // Working tree — porcelain v1: each line is `XY <path>`, X = index
  // (staged) status, Y = worktree (unstaged) status, `??` = untracked.
  const statusRaw = await safeRaw(git, ['status', '--porcelain=v1', '-uall'])
  const changes: CapturedChange[] = []
  const seen = new Set<string>()
  for (const line of statusRaw.split('\n').filter(Boolean)) {
    const x = line[0]
    const y = line[1]
    let path = line.slice(3)
    // Renames show as `orig -> new`; capture the new path.
    if (path.includes(' -> ')) path = path.split(' -> ')[1]
    if (seen.has(path)) continue
    seen.add(path)

    const untracked = x === '?' && y === '?'
    const staged = !untracked && x !== ' ' && x !== '?'
    changes.push({
      path,
      staged,
      untracked,
      content: await readChangeContent(cwd, path),
    })
  }

  return {
    currentBranch,
    detached,
    baseBranch,
    baseCommits,
    branchCommits,
    localBranches,
    remotes,
    changes,
    clean: changes.length === 0,
  }
}

/** kebab-case → camelCase, e.g. `my-bug-repro` → `myBugRepro`. */
function toCamel(kebab: string): string {
  return kebab.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

/** Validate / normalize a proposed scenario name to kebab-case. */
export function normalizeName(raw: string): string {
  const name = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return name || 'captured-scenario'
}

function placeholderFile(prefix: string, index: number, message: string): [string, string] {
  const num = String(index + 1).padStart(3, '0')
  const path = `history/${prefix}-${num}.txt`
  // Content embeds the index so re-touched paths never collide and the
  // commit is always non-empty.
  const content = `${message}\n\n(placeholder content captured from a real commit — replace as needed)\n`
  return [path, content]
}

function emitFileMap(entries: [string, string][], indent: string): string {
  const inner = entries
    .map(([p, c]) => `${indent}  ${JSON.stringify(p)}: ${JSON.stringify(c)},`)
    .join('\n')
  return `{\n${inner}\n${indent}}`
}

export type RenderOptions = {
  name: string
  summary?: string
  kind?: ScenarioKind
  /** Import specifier for the atoms (lets tests target the local source). */
  importFrom?: string
}

/**
 * Build the `contracts` list from the captured state — the same kind of
 * human-readable assertions the built-in scenarios carry.
 */
export function deriveContracts(state: CapturedState): string[] {
  const contracts: string[] = []
  const branch = state.currentBranch ?? 'main'

  if (state.detached) {
    contracts.push('HEAD is detached')
  } else {
    contracts.push(`${branch} is checked out`)
  }

  if (state.baseBranch) {
    contracts.push(`${state.baseBranch} has ${state.baseCommits.length} commits`)
    contracts.push(
      `${branch} is ${state.branchCommits.length} commits ahead of ${state.baseBranch}`,
    )
  } else {
    const total = state.branchCommits.length
    contracts.push(`${state.detached ? 'main' : branch} has ${total} commits`)
  }

  if (state.clean) {
    contracts.push('worktree is clean')
  } else {
    const n = state.changes.length
    contracts.push(`worktree has ${n} uncommitted change${n === 1 ? '' : 's'}`)
  }

  return contracts
}

/**
 * Render a captured state as a TypeScript scenario module: a complete,
 * importable `defineScenario(...)` definition that reproduces the
 * captured shape.
 */
export function renderScenarioModule(state: CapturedState, opts: RenderOptions): string {
  const name = normalizeName(opts.name)
  const varName = `${toCamel(name)}Scenario`
  const importFrom = opts.importFrom ?? '@gfargo/git-scenarios'
  const kind: ScenarioKind = opts.kind ?? (state.clean ? 'branch' : 'worktree')
  const branch = state.currentBranch ?? 'main'

  const contracts = deriveContracts(state)

  // ── Build the setup() steps as source lines ──
  const steps: string[] = []
  const STEP_INDENT = '    '

  // Base-branch commits (land on `main`).
  if (state.baseBranch) {
    steps.push(`${STEP_INDENT}// ${state.baseBranch}: ${state.baseCommits.length} commit(s)`)
    state.baseCommits.forEach((c, i) => {
      const [p, content] = placeholderFile('main', i, c.message)
      steps.push(
        `${STEP_INDENT}addCommit({ message: ${JSON.stringify(c.message)}, date: ${JSON.stringify(c.date)}, files: ${emitFileMap([[p, content]], STEP_INDENT)} }),`,
      )
    })
    steps.push('')
    steps.push(`${STEP_INDENT}// ${branch}: ${state.branchCommits.length} commit(s) ahead`)
    steps.push(`${STEP_INDENT}switchToBranch(${JSON.stringify(branch)}),`)
  } else {
    const where = state.detached ? 'main (HEAD was detached in the source repo)' : branch
    steps.push(`${STEP_INDENT}// ${where}: ${state.branchCommits.length} commit(s)`)
    if (!state.detached && branch !== 'main') {
      steps.push(
        `${STEP_INDENT}// NOTE: source branch was ${JSON.stringify(branch)} with no main/master to`,
      )
      steps.push(`${STEP_INDENT}// diverge from; history is replayed on \`main\`. Rename if needed.`)
    }
  }

  const branchPrefix = state.baseBranch
    ? toCamel(branch).replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'feat'
    : 'main'
  state.branchCommits.forEach((c, i) => {
    const [p, content] = placeholderFile(branchPrefix, i, c.message)
    steps.push(
      `${STEP_INDENT}addCommit({ message: ${JSON.stringify(c.message)}, date: ${JSON.stringify(c.date)}, files: ${emitFileMap([[p, content]], STEP_INDENT)} }),`,
    )
  })

  // Working-tree changes.
  if (state.changes.length > 0) {
    steps.push('')
    steps.push(`${STEP_INDENT}// Working-tree changes (${state.changes.length})`)
    steps.push(
      `${STEP_INDENT}// NOTE: modified-vs-added nuance is approximated — every path below`,
    )
    steps.push(`${STEP_INDENT}// is written fresh, so tracked-file edits reproduce as new files.`)
    const fileEntries: [string, string][] = state.changes.map((ch) => [
      ch.path,
      ch.content ?? `// content omitted (binary or >${MAX_CONTENT_BYTES}B)\n`,
    ])
    steps.push(`${STEP_INDENT}writeFiles(${emitFileMap(fileEntries, STEP_INDENT)}),`)
    const stagedPaths = state.changes.filter((c) => c.staged).map((c) => c.path)
    if (stagedPaths.length > 0) {
      const args = stagedPaths.map((p) => JSON.stringify(p)).join(', ')
      steps.push(`${STEP_INDENT}stageFiles(${args}),`)
    }
  }

  // ── Assemble imports actually used ──
  const used = new Set<string>(['chain', 'defineScenario', 'addCommit'])
  if (state.baseBranch) used.add('switchToBranch')
  if (state.changes.length > 0) {
    used.add('writeFiles')
    if (state.changes.some((c) => c.staged)) used.add('stageFiles')
  }
  const importNames = [...used].sort().join(', ')

  // ── Remotes & extra branches as guidance ──
  const notes: string[] = []
  if (state.remotes.length > 0) {
    notes.push(
      ` * Remotes in the source repo (add with the addRemote atom if needed):`,
      ...state.remotes.map((r) => ` *   ${r.name} → ${r.url}`),
    )
  }
  const extraBranches = state.localBranches.filter(
    (b) => b !== branch && b !== state.baseBranch,
  )
  if (extraBranches.length > 0) {
    notes.push(
      ` * Other local branches not reproduced (topology not captured):`,
      ` *   ${extraBranches.join(', ')}`,
    )
  }

  const summary =
    opts.summary ??
    (state.clean
      ? `captured ${branch} (${state.branchCommits.length} commit(s)), clean worktree`
      : `captured ${branch} with ${state.changes.length} uncommitted change(s)`)

  const description = [
    `Captured from a real repository with \`git-scenarios capture\`.`,
    ``,
    `This reproduces the *shape* — branch layout, commit-graph structure,`,
    `and working-tree state — not the exact commit hashes or historical`,
    `file contents (those are placeholders). Edit freely.`,
  ].join('\n')

  return `${[
    '/**',
    ` * ${name} — captured scenario.`,
    ' *',
    ' * Generated by `git-scenarios capture`. This is a starting point, not a',
    ' * byte-perfect clone: commit messages and dates are preserved, but file',
    ' * contents are placeholders and exact hashes will differ (by design —',
    ' * the library produces fresh deterministic hashes).',
    ...(notes.length > 0 ? [' *', ...notes] : []),
    ' */',
  ].join('\n')}

import { ${importNames} } from '${importFrom}'

export const ${varName} = defineScenario({
  name: ${JSON.stringify(name)},
  summary: ${JSON.stringify(summary)},
  description: [
${description
  .split('\n')
  .map((l) => `    ${JSON.stringify(l)},`)
  .join('\n')}
  ].join('\\n'),
  kind: ${JSON.stringify(kind)},
  contracts: [
${contracts.map((c) => `    ${JSON.stringify(c)},`).join('\n')}
  ],
  setup: chain(
${steps.join('\n')}
  ),
})
`
}

/** Serialize captured state to a plain JSON-friendly object. */
export function captureToJson(state: CapturedState, name: string): object {
  return {
    name: normalizeName(name),
    currentBranch: state.currentBranch,
    detached: state.detached,
    baseBranch: state.baseBranch,
    baseCommits: state.baseCommits,
    branchCommits: state.branchCommits,
    localBranches: state.localBranches,
    remotes: state.remotes,
    changes: state.changes.map((c) => ({
      path: c.path,
      staged: c.staged,
      untracked: c.untracked,
    })),
    clean: state.clean,
    contracts: deriveContracts(state),
  }
}
