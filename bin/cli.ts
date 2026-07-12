#!/usr/bin/env node
/**
 * CLI driver for `@gfargo/git-scenarios` — spin up a temp git repo
 * in a named state for manual testing or tool development.
 *
 * Usage:
 *   git-scenarios list                              # show all scenarios
 *   git-scenarios list --json                       # machine-readable
 *   git-scenarios list --kind operation             # filter by kind
 *   git-scenarios list --tag conflict               # filter by tag
 *   git-scenarios describe <name>                   # describe one
 *   git-scenarios describe <name> --json            # machine-readable
 *   git-scenarios create <name>                     # create in /tmp
 *   git-scenarios create <name> --path <dir>        # create at <dir>
 *   git-scenarios create <name> --run "<cmd>"       # create AND launch <cmd>
 *                                                   # against the scenario dir
 *   git-scenarios create <name> --remote <url>      # add an `origin` remote
 *
 * By default, `create` PERSISTS the scenario (doesn't auto-clean) —
 * that's what manual testing wants. Use `--ephemeral` to clean up on
 * exit (handy for one-shot smoke tests). The cleanup hint is printed
 * at the end either way.
 */

import { spawnSync } from 'node:child_process'
import { readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { emitKeypressEvents } from 'node:readline'
import * as tty from 'node:tty'

import { simpleGit } from 'simple-git'

import type { Scenario, ScenarioKind } from '../src/scenarios'
import {
  captureToJson,
  gatherRepoState,
  normalizeName,
  renderScenarioModule,
} from '../src/capture'
import { SUPPORTED_SHELLS, generateCompletion, type CompletionShell } from '../src/completions'
import { filterScenarios, renderPreview } from '../src/interactive'
import { findRegistered, listRegistered } from '../src/registry'
import type { RepoSnapshot } from '../src/snapshot'
import { createTempGitRepo } from '../src/tempGitRepo'

type ParsedArgs = {
  command?: 'list' | 'describe' | 'inspect' | 'create' | 'capture' | 'clean' | 'diff' | 'doctor' | 'completions' | 'help'
  positional: string[]
  flags: Record<string, string | boolean>
}

const VALID_KINDS: readonly ScenarioKind[] = [
  'branch',
  'worktree',
  'operation',
  'history',
  'stash',
  'submodule',
]

// Flags that never take a value — always `true` when present. Any flag not
// listed here is treated as value-taking when followed by a non-flag token,
// so it must be kept in sync with every `flags.<name>`/`flags['<name>']`
// boolean read in commandRun below.
const BOOLEAN_FLAGS = new Set([
  'help',
  'no-interactive',
  'json',
  'names',
  'dry-run',
  'ephemeral',
])

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = []
  const flags: Record<string, string | boolean> = {}
  let command: ParsedArgs['command']

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=')
      const name = eqIdx > 0 ? arg.slice(2, eqIdx) : arg.slice(2)
      if (eqIdx > 0) {
        flags[name] = arg.slice(eqIdx + 1)
      } else if (
        !BOOLEAN_FLAGS.has(name) &&
        i + 1 < argv.length &&
        !argv[i + 1].startsWith('-')
      ) {
        flags[name] = argv[i + 1]
        i += 1
      } else {
        flags[name] = true
      }
    } else if (!command) {
      if (arg === 'list' || arg === 'describe' || arg === 'inspect' || arg === 'create' || arg === 'capture' || arg === 'clean' || arg === 'diff' || arg === 'doctor' || arg === 'completions' || arg === 'help') {
        command = arg
      } else {
        positional.push(arg)
      }
    } else {
      positional.push(arg)
    }
  }

  return { command, positional, flags }
}

/**
 * Apply --kind / --tag filters to a scenario list. Both filters are
 * AND'd: scenarios must match `kind` (if given) AND match `tag`
 * (if given).
 */
function applyFilters(
  scenarios: readonly Scenario[],
  filters: { kind?: string; tag?: string },
): readonly Scenario[] {
  return scenarios.filter((s) => {
    if (filters.kind && s.kind !== filters.kind) return false
    if (filters.tag && (!s.tags || !s.tags.includes(filters.tag))) return false
    return true
  })
}

function printHelp(): void {
  console.log([
    '',
    '  git-scenarios — manage temp git repo states for testing',
    '',
    '  Run without arguments (TTY) to open the interactive scenario picker.',
    '',
    '  Usage:',
    '    git-scenarios list [--kind <k>] [--tag <t>] [--json] [--names]',
    '    git-scenarios describe <name> [--json]',
    '    git-scenarios inspect <name> [--json]',
    '    git-scenarios create <name> [options]',
    '    git-scenarios capture [path] [options]',
    '    git-scenarios diff <name-a> <name-b> [--json]',
    '    git-scenarios clean [options]',
    '    git-scenarios doctor [--json]',
    '    git-scenarios completions <bash|zsh|fish>',
    '',
    '  List options:',
    '    --kind <kind>    Filter by kind (branch | worktree | operation |',
    '                     history | stash | submodule)',
    '    --tag <tag>      Filter by tag (e.g. conflict, dirty, upstream)',
    '    --json           Machine-readable JSON output',
    '    --names          Print scenario names only, one per line (for',
    '                     shell completion scripts)',
    '',
    '  Describe options:',
    '    --json           Machine-readable JSON output',
    '',
    '  Inspect options:',
    '    Materializes the scenario in a throwaway temp dir, prints its',
    '    commit graph, branches, and working-tree status, then cleans up.',
    '    Use it to see a scenario\'s shape without keeping anything on disk.',
    '    --json           Machine-readable JSON (graph / branches / status)',
    '',
    '  Diff options:',
    '    Materializes two scenarios in throwaway temp dirs, captures their',
    '    shape (HEAD, branches, status, in-progress operation, contracts),',
    '    and prints a structured side-by-side comparison. SHA values and',
    '    raw commit graphs are excluded from the differences summary.',
    '    --json           Machine-readable JSON ({ a, b, same, differences })',
    '',
    '  Create options:',
    '    --path <dir>     Materialize the scenario at <dir> instead of /tmp',
    '    --run <cmd>      Launch <cmd> (shell string) against the scenario',
    '                     directory after creation. Examples:',
    '                       --run "lazygit"',
    '                       --run "gitui"',
    '                       --run "code -n"   (opens the dir in VS Code)',
    '                       --run "coco ui"',
    '    --remote <url>   Add `origin` pointing at <url> so gh-aware tools detect',
    '                     a remote on launch. Pass any gh-shaped URL — a real one',
    '                     for live data, a fake one to render the views without',
    '                     risking destructive actions against a real repo.',
    '    --ephemeral      Remove the scenario directory when the CLI exits',
    '                     (default: persist, print the cleanup hint)',
    '',
    '  Capture options:',
    '    Reads a real repo (default: current dir) and prints a',
    '    defineScenario(...) module that reproduces its shape — branch',
    '    layout, commit-graph structure, and working-tree state. A',
    '    starting point you edit, not a byte-perfect clone.',
    '    --name <name>    Scenario name (kebab-case; default: repo dir name)',
    '    --summary <s>    One-line summary for the scenario',
    '    --kind <kind>    Override the inferred kind (branch | worktree | …)',
    '    --out <file>     Write the module to <file> instead of stdout',
    '    --json           Emit structured capture data instead of a TS module',
    '',
    '  Clean options:',
    '    --dry-run        List stale scenario dirs without deleting them',
    '    --older-than <h> Only remove dirs older than <h> hours (default: 0 = all)',
    '',
    '  Doctor options:',
    '    Checks git version (≥ 2.25.0), temp-dir writability, leftover',
    '    scenario dirs, and optional deps (git-lfs). Exits non-zero on',
    '    hard failures (git missing/below minimum, temp dir not writable).',
    '    --json           Machine-readable JSON output',
    '',
    '  Completions:',
    '    Print a shell completion script to stdout. Pipe into your shell\'s',
    '    eval or save to a completions directory:',
    '      bash:  eval "$(git-scenarios completions bash)"',
    '      zsh:   eval "$(git-scenarios completions zsh)"',
    '      fish:  git-scenarios completions fish | source',
    '',
    `  Available scenarios (${listRegistered().length}):`,
    ...listRegistered().map((s) => `    ${s.name.padEnd(28)} ${s.summary}`),
    '',
  ].join('\n'))
}

function commandList(options: { kind?: string; tag?: string; json?: boolean; names?: boolean }): number {
  const scenarios = applyFilters(listRegistered(), options)

  if (options.names) {
    console.log(scenarios.map((s) => s.name).join('\n'))
    return 0
  }

  if (options.json) {
    const payload = scenarios.map((s) => ({
      name: s.name,
      summary: s.summary,
      kind: s.kind,
      tags: s.tags ?? [],
      contracts: s.contracts ?? [],
    }))
    console.log(JSON.stringify(payload, null, 2))
    return 0
  }

  console.log('')
  const totalCount = listRegistered().length
  const isFiltered = options.kind || options.tag
  if (isFiltered) {
    console.log(`Matching scenarios (${scenarios.length} of ${totalCount}):`)
  } else {
    console.log(`Available scenarios (${scenarios.length}):`)
  }
  console.log('')

  if (scenarios.length === 0) {
    console.log('  (no scenarios match the given filters)')
    console.log('')
    return 0
  }

  const byKind = new Map<string, Scenario[]>()
  for (const scenario of scenarios) {
    const bucket = byKind.get(scenario.kind) || []
    bucket.push(scenario)
    byKind.set(scenario.kind, bucket)
  }
  for (const [kind, group] of byKind) {
    console.log(`  ${kind}:`)
    for (const s of group) {
      console.log(`    ${s.name.padEnd(28)} ${s.summary}`)
    }
    console.log('')
  }
  return 0
}

function commandDescribe(name: string, options: { json?: boolean } = {}): number {
  const scenario = findRegistered(name)
  if (!scenario) {
    if (options.json) {
      console.error(JSON.stringify({ error: `Unknown scenario "${name}"` }))
    } else {
      console.error(`Unknown scenario "${name}". Try \`git-scenarios list\`.`)
    }
    return 2
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          name: scenario.name,
          summary: scenario.summary,
          description: scenario.description,
          kind: scenario.kind,
          tags: scenario.tags ?? [],
          contracts: scenario.contracts ?? [],
        },
        null,
        2,
      ),
    )
    return 0
  }

  console.log('')
  console.log(`  ${scenario.name}`)
  console.log(`  ${'-'.repeat(scenario.name.length)}`)
  console.log('')
  console.log(`  Summary: ${scenario.summary}`)
  console.log(`  Kind:    ${scenario.kind}`)
  if (scenario.tags && scenario.tags.length > 0) {
    console.log(`  Tags:    ${scenario.tags.join(', ')}`)
  }
  console.log('')
  console.log(scenario.description.split('\n').map((l) => `  ${l}`).join('\n'))
  if (scenario.contracts && scenario.contracts.length > 0) {
    console.log('')
    console.log('  Contracts:')
    for (const c of scenario.contracts) {
      console.log(`    - ${c}`)
    }
  }
  console.log('')
  return 0
}

/**
 * Materialize a scenario into a throwaway temp repo, capture its shape
 * (commit graph, branches, working-tree status), tear it down, and
 * print the captured snapshot. Lets you *see* what a scenario produces
 * without leaving anything on disk — the read-only counterpart to
 * `create`.
 *
 * Empty repos (no commits yet) have no `git log` output; that's not an
 * error, so the graph section is simply reported as empty.
 */
async function commandInspect(name: string, options: { json?: boolean } = {}): Promise<number> {
  const scenario = findRegistered(name)
  if (!scenario) {
    if (options.json) {
      console.error(JSON.stringify({ error: `Unknown scenario "${name}"` }))
    } else {
      console.error(`Unknown scenario "${name}". Try \`git-scenarios list\`.`)
    }
    return 2
  }

  const repo = await createTempGitRepo()
  let graph = ''
  let branches = ''
  let status = ''
  try {
    await scenario.setup(repo)

    // `--color=never` keeps the captured text clean for JSON / piping.
    try {
      graph = (
        await repo.git.raw(['log', '--graph', '--oneline', '--all', '--decorate', '--color=never'])
      ).trimEnd()
    } catch {
      // No commits yet (e.g. empty-repo) — git log exits non-zero.
      graph = ''
    }
    branches = (await repo.git.raw(['branch', '-a', '--no-color'])).trimEnd()
    // `git status` has no `--no-color` flag; simple-git pipes stdout
    // (non-TTY), so output is uncolored anyway.
    status = (await repo.git.raw(['status', '-sb'])).trimEnd()
  } catch (error) {
    console.error(`Scenario setup failed: ${(error as Error).message}`)
    await repo.cleanup()
    return 1
  } finally {
    await repo.cleanup()
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          name: scenario.name,
          kind: scenario.kind,
          graph: graph ? graph.split('\n') : [],
          branches: branches ? branches.split('\n').map((l) => l.trim()) : [],
          status: status ? status.split('\n') : [],
          contracts: scenario.contracts ?? [],
        },
        null,
        2,
      ),
    )
    return 0
  }

  const indent = (text: string): string =>
    text.length === 0
      ? '    (none)'
      : text.split('\n').map((l) => `    ${l}`).join('\n')

  console.log('')
  console.log(`  ${scenario.name}  ·  ${scenario.kind}`)
  console.log(`  ${'-'.repeat(scenario.name.length + scenario.kind.length + 5)}`)
  console.log(`  ${scenario.summary}`)
  console.log('')
  console.log('  Commit graph:')
  console.log(indent(graph))
  console.log('')
  console.log('  Branches:')
  console.log(indent(branches))
  console.log('')
  console.log('  Status (git status -sb):')
  console.log(indent(status))
  if (scenario.contracts && scenario.contracts.length > 0) {
    console.log('')
    console.log('  Contracts:')
    for (const c of scenario.contracts) {
      console.log(`    - ${c}`)
    }
  }
  console.log('')
  return 0
}

/**
 * Materialize two scenarios into throwaway temp repos, capture each repo's
 * shape via `repo.snapshot()`, compare the structural fields, and print a
 * side-by-side diff. SHA values and raw commit graphs are excluded from the
 * differences summary — those change for nearly any two distinct scenarios
 * and would make the summary noisy without revealing anything about shape.
 */
async function commandDiff(
  nameA: string,
  nameB: string,
  options: { json?: boolean } = {},
): Promise<number> {
  const scenarioA = findRegistered(nameA)
  if (!scenarioA) {
    if (options.json) {
      console.error(JSON.stringify({ error: `Unknown scenario "${nameA}"` }))
    } else {
      console.error(`Unknown scenario "${nameA}". Try \`git-scenarios list\`.`)
    }
    return 2
  }
  const scenarioB = findRegistered(nameB)
  if (!scenarioB) {
    if (options.json) {
      console.error(JSON.stringify({ error: `Unknown scenario "${nameB}"` }))
    } else {
      console.error(`Unknown scenario "${nameB}". Try \`git-scenarios list\`.`)
    }
    return 2
  }

  async function materialize(scenario: Scenario): Promise<{ snapshot: RepoSnapshot; contracts: string[] }> {
    const repo = await createTempGitRepo()
    try {
      await scenario.setup(repo)
      const snapshot = await repo.snapshot()
      return { snapshot, contracts: scenario.contracts ?? [] }
    } finally {
      await repo.cleanup()
    }
  }

  const resultA = await materialize(scenarioA).catch((error: Error) => {
    if (options.json) {
      console.error(JSON.stringify({ error: `Scenario setup failed for "${nameA}": ${error.message}` }))
    } else {
      console.error(`Scenario setup failed for "${nameA}": ${error.message}`)
    }
    return null
  })
  if (!resultA) return 1

  const resultB = await materialize(scenarioB).catch((error: Error) => {
    if (options.json) {
      console.error(JSON.stringify({ error: `Scenario setup failed for "${nameB}": ${error.message}` }))
    } else {
      console.error(`Scenario setup failed for "${nameB}": ${error.message}`)
    }
    return null
  })
  if (!resultB) return 1

  const { snapshot: snapA, contracts: contractsA } = resultA
  const { snapshot: snapB, contracts: contractsB } = resultB

  // Compare shape fields. head.sha and graph are intentionally excluded — they
  // differ for nearly any two scenarios and would swamp the structural signal.
  const differences: string[] = []
  if (snapA.head.branch !== snapB.head.branch) differences.push('head.branch')
  if (snapA.head.detached !== snapB.head.detached) differences.push('head.detached')
  if (snapA.commitCount !== snapB.commitCount) differences.push('commitCount')
  if (JSON.stringify([...snapA.branches].sort()) !== JSON.stringify([...snapB.branches].sort()))
    differences.push('branches')
  if (snapA.status.clean !== snapB.status.clean) differences.push('status.clean')
  if (snapA.status.staged.length !== snapB.status.staged.length) differences.push('status.staged')
  if (snapA.status.modified.length !== snapB.status.modified.length) differences.push('status.modified')
  if (snapA.status.untracked.length !== snapB.status.untracked.length)
    differences.push('status.untracked')
  if (snapA.status.ahead !== snapB.status.ahead) differences.push('status.ahead')
  if (snapA.status.behind !== snapB.status.behind) differences.push('status.behind')
  if (snapA.operation !== snapB.operation) differences.push('operation')
  if (snapA.conflicts.length !== snapB.conflicts.length) differences.push('conflicts')
  if (snapA.stashes !== snapB.stashes) differences.push('stashes')
  if (JSON.stringify(contractsA) !== JSON.stringify(contractsB)) differences.push('contracts')

  const same = differences.length === 0

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          a: { name: nameA, kind: scenarioA.kind, contracts: contractsA, snapshot: snapA },
          b: { name: nameB, kind: scenarioB.kind, contracts: contractsB, snapshot: snapB },
          same,
          differences,
        },
        null,
        2,
      ),
    )
    return 0
  }

  // Human-readable side-by-side comparison
  const LABEL_W = 12
  const VAL_W = 32

  const row = (label: string, valA: string, valB: string, differs: boolean): void => {
    const g = differs ? '≠' : '='
    console.log(
      `  ${label.padEnd(LABEL_W)} ${valA.slice(0, VAL_W).padEnd(VAL_W)}  ${g}  ${valB.slice(0, VAL_W)}`,
    )
  }

  console.log('')
  console.log(`  a: ${nameA}  (${scenarioA.kind})`)
  console.log(`  b: ${nameB}  (${scenarioB.kind})`)
  console.log('')
  console.log(`  ${'Field'.padEnd(LABEL_W)} ${'a'.padEnd(VAL_W)}     ${'b'}`)
  console.log(`  ${'-'.repeat(LABEL_W + VAL_W + 7)}`)

  const headDiffers = differences.includes('head.branch') || differences.includes('head.detached')
  row(
    'Branch',
    snapA.head.detached ? '(detached)' : (snapA.head.branch ?? '(none)'),
    snapB.head.detached ? '(detached)' : (snapB.head.branch ?? '(none)'),
    headDiffers,
  )
  row('Commits', String(snapA.commitCount), String(snapB.commitCount), differences.includes('commitCount'))
  row(
    'Branches',
    snapA.branches.join(', ') || '(none)',
    snapB.branches.join(', ') || '(none)',
    differences.includes('branches'),
  )

  const statusA = snapA.status.clean
    ? 'clean'
    : `dirty (s:${snapA.status.staged.length} m:${snapA.status.modified.length} u:${snapA.status.untracked.length})`
  const statusB = snapB.status.clean
    ? 'clean'
    : `dirty (s:${snapB.status.staged.length} m:${snapB.status.modified.length} u:${snapB.status.untracked.length})`
  const statusDiffers = ['status.clean', 'status.staged', 'status.modified', 'status.untracked'].some(
    (d) => differences.includes(d),
  )
  row('Status', statusA, statusB, statusDiffers)

  row(
    'Operation',
    snapA.operation ?? '(none)',
    snapB.operation ?? '(none)',
    differences.includes('operation'),
  )
  row(
    'Conflicts',
    String(snapA.conflicts.length),
    String(snapB.conflicts.length),
    differences.includes('conflicts'),
  )
  row('Stashes', String(snapA.stashes), String(snapB.stashes), differences.includes('stashes'))

  if (contractsA.length > 0 || contractsB.length > 0) {
    console.log('')
    console.log('  Contracts:')
    const maxLen = Math.max(contractsA.length, contractsB.length)
    for (let i = 0; i < maxLen; i++) {
      const ca = contractsA[i] ?? ''
      const cb = contractsB[i] ?? ''
      row(`  [${i}]`, ca, cb, ca !== cb)
    }
  }

  console.log('')
  if (same) {
    console.log('  Scenarios are structurally identical.')
  } else {
    console.log(`  Differences: ${differences.join(', ')}`)
  }
  console.log('')

  return 0
}

async function commandCreate(
  name: string,
  options: {
    targetPath?: string
    runCommand?: string
    ephemeral?: boolean
    remote?: string
  },
): Promise<number> {
  const scenario = findRegistered(name)
  if (!scenario) {
    console.error(`Unknown scenario "${name}". Try \`git-scenarios list\`.`)
    return 2
  }

  console.log(`Building scenario "${scenario.name}"…`)
  const repo = await createTempGitRepo()

  try {
    await scenario.setup(repo)
  } catch (error) {
    console.error(`Scenario setup failed: ${(error as Error).message}`)
    return 1
  }

  // Optional origin remote. Scenarios default to no remote so the test
  // isolation story stays simple, but `--remote` lets manual testers
  // exercise gh-aware features against a real-shaped URL.
  if (options.remote) {
    try {
      await repo.git.addRemote('origin', options.remote)
    } catch (error) {
      console.error(`Failed to add origin remote: ${(error as Error).message}`)
      return 1
    }
  }

  let finalPath = repo.path
  if (options.targetPath) {
    const target = path.resolve(options.targetPath)
    // Plain rename keeps the worktree state intact and is what manual
    // testers expect when they say "put this scenario at ~/sandbox".
    const renameResult = spawnSync('mv', [repo.path, target])
    if (renameResult.status !== 0) {
      console.error(`Failed to move scenario to ${target}`)
      return 1
    }
    finalPath = target
  }

  console.log('')
  console.log(`✓ Scenario "${scenario.name}" ready at:`)
  console.log(`    ${finalPath}`)
  console.log('')
  if (scenario.contracts && scenario.contracts.length > 0) {
    console.log('  Contracts:')
    for (const c of scenario.contracts) {
      console.log(`    - ${c}`)
    }
    console.log('')
  }

  if (options.runCommand) {
    console.log(`Launching \`${options.runCommand}\` against the scenario…`)
    console.log('')
    // Pass through the shell so users can write `--run "code -n"` and
    // get shell-style argument splitting.
    const result = spawnSync(options.runCommand, {
      shell: true,
      stdio: 'inherit',
      cwd: finalPath,
    })
    if (result.status !== 0 && result.status !== null) {
      // Non-zero exit on quit (q / Ctrl+C) is normal for TUIs; only
      // warn if it's a setup-level failure.
      if (result.status > 1) {
        console.warn(`${options.runCommand} exited with status ${result.status}`)
      }
    }
  }

  if (options.ephemeral) {
    await repo.cleanup()
    console.log('')
    console.log('  (ephemeral — scenario directory has been removed)')
  } else {
    console.log('')
    console.log('  When you\'re done, clean up with:')
    console.log(`    rm -rf ${finalPath}`)
    console.log('')
  }

  return 0
}

/**
 * Capture a real repository's shape as a reusable scenario module.
 *
 * Read-only against the target repo — runs git plumbing and reads
 * working-tree files, never writes to it. Output goes to stdout (so it
 * pipes into a file or clipboard) unless `--out` is given.
 */
async function commandCapture(
  targetPath: string,
  options: {
    name?: string
    summary?: string
    kind?: string
    out?: string
    json?: boolean
  },
): Promise<number> {
  const repoPath = path.resolve(targetPath)
  const git = simpleGit(repoPath)

  // Confirm it's actually a git repo before doing anything else.
  try {
    const isRepo = await git.checkIsRepo()
    if (!isRepo) {
      console.error(`Not a git repository: ${repoPath}`)
      return 1
    }
  } catch {
    console.error(`Not a git repository: ${repoPath}`)
    return 1
  }

  if (options.kind && !VALID_KINDS.includes(options.kind as ScenarioKind)) {
    console.error(
      `Invalid --kind "${options.kind}". Expected one of: ${VALID_KINDS.join(', ')}.`,
    )
    return 2
  }

  const derivedName = options.name ?? path.basename(repoPath)
  const name = normalizeName(derivedName)

  const state = await gatherRepoState(git, repoPath)

  if (options.json) {
    console.log(JSON.stringify(captureToJson(state, name), null, 2))
    return 0
  }

  const moduleSource = renderScenarioModule(state, {
    name,
    summary: options.summary,
    kind: options.kind as ScenarioKind | undefined,
  })

  if (options.out) {
    const outPath = path.resolve(options.out)
    try {
      writeFileSync(outPath, moduleSource)
    } catch (error) {
      console.error(`Failed to write ${outPath}: ${(error as Error).message}`)
      return 1
    }
    console.error(`✓ Wrote captured scenario "${name}" to ${outPath}`)
    return 0
  }

  // Module to stdout (pipeable); progress note to stderr so it doesn't
  // pollute the captured source when redirected.
  console.error(`✓ Captured "${name}" from ${repoPath}`)
  console.log(moduleSource)
  return 0
}

function commandCompletions(shell: string): number {
  if (!(SUPPORTED_SHELLS as readonly string[]).includes(shell)) {
    console.error(
      `Unknown shell "${shell}". Expected one of: ${SUPPORTED_SHELLS.join(', ')}.`,
    )
    return 2
  }
  console.log(generateCompletion(shell as CompletionShell))
  return 0
}

/**
 * Find and remove stale git-scenarios temp directories AND cached
 * scenario templates.
 *
 * Temp dirs: `git-scenarios-*` (current) and `coco-git-test-*` (legacy)
 * in the system temp directory.
 *
 * Cache templates: individual `<name>@<version>` dirs inside
 * `<tmpdir>/git-scenarios-cache` (or `$GIT_SCENARIOS_CACHE_DIR`).
 */
async function commandClean(options: {
  dryRun?: boolean
  olderThanHours?: number
}): Promise<number> {
  const tmp = tmpdir()
  const CURRENT_PREFIX = 'git-scenarios-'
  const LEGACY_PREFIX = 'coco-git-test-'
  const CACHE_DIR_NAME = 'git-scenarios-cache'
  const nowMs = Date.now()
  const maxAgeMs = (options.olderThanHours || 0) * 60 * 60 * 1000

  let entries: string[]
  try {
    entries = readdirSync(tmp)
  } catch {
    console.error(`Could not read temp directory: ${tmp}`)
    return 1
  }

  type DirEntry = { path: string; mtime: number; isDir: boolean; label: string }

  const scenarioDirs: DirEntry[] = entries
    .filter(
      (name) =>
        (name.startsWith(CURRENT_PREFIX) || name.startsWith(LEGACY_PREFIX)) &&
        name !== CACHE_DIR_NAME,
    )
    .map((name) => {
      const fullPath = path.join(tmp, name)
      const label = name.startsWith(LEGACY_PREFIX) ? ' (legacy)' : ''
      try {
        const st = statSync(fullPath)
        return { path: fullPath, mtime: st.mtimeMs, isDir: st.isDirectory(), label }
      } catch {
        return null
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null && entry.isDir)
    .filter((entry) => {
      if (maxAgeMs === 0) return true
      return (nowMs - entry.mtime) > maxAgeMs
    })

  // Also scan inside the cache root for individual template dirs
  const cacheRootPath =
    process.env['GIT_SCENARIOS_CACHE_DIR'] ?? path.join(tmp, CACHE_DIR_NAME)
  const cacheDirs: DirEntry[] = []
  try {
    const cacheEntries = readdirSync(cacheRootPath)
    for (const name of cacheEntries) {
      const fullPath = path.join(cacheRootPath, name)
      try {
        const st = statSync(fullPath)
        if (st.isDirectory() && (maxAgeMs === 0 || (nowMs - st.mtimeMs) > maxAgeMs)) {
          cacheDirs.push({ path: fullPath, mtime: st.mtimeMs, isDir: true, label: ' (cache)' })
        }
      } catch {
        // skip unreadable entries
      }
    }
  } catch {
    // cache root doesn't exist — normal when cache has never been populated
  }

  const allDirs = [...scenarioDirs, ...cacheDirs]

  if (allDirs.length === 0) {
    console.log('')
    console.log('  No stale scenario directories found.')
    console.log('')
    return 0
  }

  console.log('')
  console.log(`  Found ${allDirs.length} director${allDirs.length === 1 ? 'y' : 'ies'}:`)
  console.log('')

  for (const dir of allDirs) {
    const age = Math.round((nowMs - dir.mtime) / (60 * 60 * 1000))
    console.log(`    ${dir.path}${dir.label}  (${age}h old)`)
  }

  if (options.dryRun) {
    console.log('')
    console.log('  (dry run — no directories removed)')
    console.log('')
    return 0
  }

  console.log('')
  let removed = 0
  for (const dir of allDirs) {
    try {
      rmSync(dir.path, { recursive: true, force: true })
      removed += 1
      console.log(`  removing: ${path.basename(dir.path)}${dir.label}`)
    } catch (error) {
      console.error(`  Failed to remove: ${dir.path} — ${(error as Error).message}`)
    }
  }

  console.log('')
  console.log(`  ✓ Removed ${removed} director${removed === 1 ? 'y' : 'ies'}.`)
  console.log('')
  return 0
}

type KeyEvent = { name?: string; ctrl?: boolean; meta?: boolean }

async function runActionMenu(scenario: Scenario): Promise<number> {
  console.log('')
  console.log(`  \x1B[1m${scenario.name}\x1B[0m  ·  ${scenario.kind}`)
  console.log(`  ${scenario.summary}`)
  console.log('')
  console.log('  Actions:')
  console.log('    [c] create   — materialize scenario in /tmp')
  console.log('    [i] inspect  — show commit graph, branches, status')
  console.log('    [d] describe — print description and contracts')
  console.log('    [q] cancel')
  console.log('')
  process.stdout.write('  Action: ')

  const stdin = process.stdin as tty.ReadStream
  emitKeypressEvents(process.stdin)
  stdin.setRawMode(true)
  process.stdin.resume()

  return new Promise<number>((resolve) => {
    const onAction = (_str: string | undefined, key: KeyEvent | undefined): void => {
      if (!key) return
      process.stdin.removeListener('keypress', onAction)
      stdin.setRawMode(false)
      process.stdin.pause()

      if (key.name === 'c') {
        console.log('create')
        console.log('')
        void commandCreate(scenario.name, {}).then(resolve)
      } else if (key.name === 'i') {
        console.log('inspect')
        console.log('')
        void commandInspect(scenario.name).then(resolve)
      } else if (key.name === 'd') {
        console.log('describe')
        console.log('')
        resolve(commandDescribe(scenario.name))
      } else {
        console.log('')
        console.log('  (cancelled)')
        resolve(0)
      }
    }
    process.stdin.on('keypress', onAction)
  })
}

/**
 * Interactive fuzzy-find scenario picker. Opens when the CLI is invoked
 * with no arguments in a TTY. Falls back to printHelp() when stdin/stdout
 * is not a TTY, when CI=true, or when --no-interactive is passed.
 */
async function commandPick(options: { noInteractive?: boolean } = {}): Promise<number> {
  const isTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY)
  if (!isTTY || options.noInteractive || process.env['CI']) {
    printHelp()
    return 0
  }

  const all = listRegistered()
  if (all.length === 0) {
    printHelp()
    return 0
  }

  const R = '\x1B[0m'   // reset
  const B = '\x1B[1m'   // bold
  const D = '\x1B[2m'   // dim
  const V = '\x1B[7m'   // reverse video (selection highlight)
  const MAX_LIST = 10

  let query = ''
  let filtered = filterScenarios('', all)
  let selIdx = 0
  let lastLines = 0

  const stdin = process.stdin as tty.ReadStream

  function cols(): number { return process.stdout.columns || 80 }

  function trunc(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + '…' : s
  }

  function draw(): void {
    const w = cols()
    const divider = '  ' + '─'.repeat(Math.min(w - 4, 58))
    const lines: string[] = []

    lines.push(`${B}  git-scenarios${R}  ↑↓ navigate · Enter select · Esc exit`)
    lines.push(`  Filter: ${query}▌`)
    lines.push(divider)

    if (filtered.length === 0) {
      lines.push(`  ${D}(no matches)${R}`)
    } else {
      const pageStart = Math.max(0, selIdx - MAX_LIST + 1)
      const pageItems = filtered.slice(pageStart, pageStart + MAX_LIST)
      for (let i = 0; i < pageItems.length; i++) {
        const s = pageItems[i]
        const absIdx = pageStart + i
        const isSel = absIdx === selIdx
        const nameStr = s.name.padEnd(28)
        const sumStr = trunc(s.summary, Math.max(10, w - 36))
        const row = `  ${isSel ? '▶ ' : '  '}${nameStr} ${sumStr}`
        lines.push(isSel ? `${V}${row}${R}` : `${D}${row}${R}`)
      }
      if (filtered.length > MAX_LIST) {
        lines.push(`  ${D}  (${filtered.length} total — keep typing to narrow)${R}`)
      }
    }

    lines.push(divider)

    const sel = filtered[selIdx]
    if (sel) {
      const rows = process.stdout.rows || 24
      const maxPvLines = Math.max(3, rows - lines.length - 2)
      for (const pl of renderPreview(sel).split('\n').slice(0, maxPvLines)) {
        lines.push(trunc(pl, w - 2))
      }
    }

    if (lastLines > 0) {
      process.stdout.write(`\x1B[${lastLines}A\x1B[J`)
    }
    process.stdout.write(lines.join('\n') + '\n')
    lastLines = lines.length
  }

  function restoreTerminal(): void {
    process.stdout.write('\x1B[?25h')
    stdin.setRawMode(false)
    process.stdin.pause()
  }

  emitKeypressEvents(process.stdin)
  stdin.setRawMode(true)
  process.stdout.write('\x1B[?25l')
  draw()

  return new Promise<number>((resolve) => {
    const onKeypress = (str: string | undefined, key: KeyEvent | undefined): void => {
      if (!key) return

      if ((key.ctrl && key.name === 'c') || key.name === 'escape') {
        process.stdin.removeListener('keypress', onKeypress)
        restoreTerminal()
        if (lastLines > 0) process.stdout.write(`\x1B[${lastLines}A\x1B[J`)
        resolve(0)
        return
      }

      if (key.name === 'up') {
        selIdx = Math.max(0, selIdx - 1)
        draw()
        return
      }

      if (key.name === 'down') {
        selIdx = Math.min(filtered.length - 1, selIdx + 1)
        draw()
        return
      }

      if (key.name === 'backspace') {
        query = query.slice(0, -1)
        filtered = filterScenarios(query, all)
        selIdx = 0
        draw()
        return
      }

      if (key.name === 'return') {
        const scenario = filtered[selIdx]
        if (!scenario) return
        process.stdin.removeListener('keypress', onKeypress)
        restoreTerminal()
        if (lastLines > 0) process.stdout.write(`\x1B[${lastLines}A\x1B[J`)
        void runActionMenu(scenario).then(resolve)
        return
      }

      if (str && str.length === 1 && !key.ctrl && !key.meta) {
        query += str
        filtered = filterScenarios(query, all)
        selIdx = 0
        draw()
      }
    }

    process.stdin.on('keypress', onKeypress)
  })
}

type CheckResult = {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
}

export function parseGitVersion(raw: string): [number, number, number] | null {
  const m = raw.match(/git version (\d+)\.(\d+)\.(\d+)/)
  if (!m) return null
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)]
}

async function commandDoctor(options: { json?: boolean }): Promise<number> {
  const checks: CheckResult[] = []

  // 1. Git version check
  const gitResult = spawnSync('git', ['--version'], { encoding: 'utf-8' })
  if (gitResult.status !== 0 || !gitResult.stdout) {
    checks.push({ name: 'git-version', status: 'fail', message: 'git not found in PATH' })
  } else {
    const parsed = parseGitVersion(gitResult.stdout.trim())
    if (!parsed) {
      checks.push({ name: 'git-version', status: 'fail', message: `Could not parse git version: "${gitResult.stdout.trim()}"` })
    } else {
      const [major, minor] = parsed
      const isOk = major > 2 || (major === 2 && minor >= 25)
      if (isOk) {
        checks.push({ name: 'git-version', status: 'pass', message: `git ${parsed.join('.')} (≥ 2.25.0)` })
      } else {
        checks.push({ name: 'git-version', status: 'fail', message: `git ${parsed.join('.')} is below required 2.25.0` })
      }
    }
  }

  // 2. Temp dir writability
  const tmp = tmpdir()
  const probeFile = path.join(tmp, `.git-scenarios-doctor-probe-${process.pid}`)
  try {
    writeFileSync(probeFile, '')
    checks.push({ name: 'temp-dir-writable', status: 'pass', message: `${tmp} is writable` })
  } catch (error) {
    checks.push({ name: 'temp-dir-writable', status: 'fail', message: `${tmp} is not writable: ${(error as Error).message}` })
  } finally {
    try { rmSync(probeFile) } catch { /* best effort */ }
  }

  // 3. Leftover scenario dirs
  const CURRENT_PREFIX = 'git-scenarios-'
  const LEGACY_PREFIX = 'coco-git-test-'
  let leftovers: string[] = []
  try {
    const entries = readdirSync(tmp)
    leftovers = entries.filter(
      (name) => name.startsWith(CURRENT_PREFIX) || name.startsWith(LEGACY_PREFIX),
    )
  } catch {
    // readdirSync failure already covered by the writability check
  }

  if (leftovers.length > 0) {
    checks.push({
      name: 'leftover-dirs',
      status: 'warn',
      message: `${leftovers.length} leftover scenario dir${leftovers.length === 1 ? '' : 's'} in ${tmp} — run \`git-scenarios clean\` to remove`,
    })
  } else {
    checks.push({ name: 'leftover-dirs', status: 'pass', message: 'No leftover scenario directories' })
  }

  // 4. Optional git-lfs
  const lfsResult = spawnSync('git-lfs', ['version'], { encoding: 'utf-8' })
  if (lfsResult.status === 0 && lfsResult.stdout) {
    checks.push({ name: 'git-lfs', status: 'pass', message: `git-lfs found: ${lfsResult.stdout.split('\n')[0].trim()}` })
  } else {
    checks.push({ name: 'git-lfs', status: 'warn', message: 'git-lfs not found — LFS scenarios will not work (optional)' })
  }

  if (options.json) {
    console.log(JSON.stringify({ checks }, null, 2))
  } else {
    console.log('')
    console.log('  git-scenarios doctor')
    console.log('  --------------------')
    console.log('')
    for (const check of checks) {
      const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗'
      const label = check.status.toUpperCase().padEnd(4)
      console.log(`  ${icon} ${label}  ${check.name}`)
      console.log(`         ${check.message}`)
    }
    console.log('')
  }

  return checks.some((c) => c.status === 'fail') ? 1 : 0
}

async function main(): Promise<number> {
  const { command, positional, flags } = parseArgs(process.argv.slice(2))

  if (command === 'help' || flags.help) {
    printHelp()
    return 0
  }

  if (!command) {
    return commandPick({ noInteractive: Boolean(flags['no-interactive']) })
  }

  if (command === 'list') {
    return commandList({
      kind: typeof flags.kind === 'string' ? flags.kind : undefined,
      tag: typeof flags.tag === 'string' ? flags.tag : undefined,
      json: Boolean(flags.json),
      names: Boolean(flags.names),
    })
  }

  if (command === 'describe') {
    const name = positional[0]
    if (!name) {
      console.error('Missing scenario name. Try `git-scenarios list`.')
      return 2
    }
    return commandDescribe(name, { json: Boolean(flags.json) })
  }

  if (command === 'inspect') {
    const name = positional[0]
    if (!name) {
      console.error('Missing scenario name. Try `git-scenarios list`.')
      return 2
    }
    return commandInspect(name, { json: Boolean(flags.json) })
  }

  if (command === 'diff') {
    const nameA = positional[0]
    const nameB = positional[1]
    if (!nameA || !nameB) {
      console.error('Missing scenario names. Usage: git-scenarios diff <name-a> <name-b>')
      return 2
    }
    return commandDiff(nameA, nameB, { json: Boolean(flags.json) })
  }

  if (command === 'capture') {
    const targetPath = positional[0] ?? '.'
    return commandCapture(targetPath, {
      name: typeof flags.name === 'string' ? flags.name : undefined,
      summary: typeof flags.summary === 'string' ? flags.summary : undefined,
      kind: typeof flags.kind === 'string' ? flags.kind : undefined,
      out: typeof flags.out === 'string' ? flags.out : undefined,
      json: Boolean(flags.json),
    })
  }

  if (command === 'clean') {
    return commandClean({
      dryRun: Boolean(flags['dry-run']),
      olderThanHours: typeof flags['older-than'] === 'string' ? parseInt(flags['older-than'], 10) : 0,
    })
  }

  if (command === 'doctor') {
    return commandDoctor({ json: Boolean(flags.json) })
  }

  if (command === 'completions') {
    const shell = positional[0]
    if (!shell) {
      console.error(`Missing shell argument. Expected one of: ${SUPPORTED_SHELLS.join(', ')}.`)
      return 2
    }
    return commandCompletions(shell)
  }

  if (command === 'create') {
    const name = positional[0]
    if (!name) {
      console.error('Missing scenario name. Try `git-scenarios list`.')
      return 2
    }
    return commandCreate(name, {
      targetPath: typeof flags.path === 'string' ? flags.path : undefined,
      runCommand: typeof flags.run === 'string' ? flags.run : undefined,
      ephemeral: Boolean(flags.ephemeral),
      remote: typeof flags.remote === 'string' ? flags.remote : undefined,
    })
  }

  return 0
}

if (require.main === module) {
  main()
    .then((code) => {
      // Setting exitCode (instead of calling process.exit) lets Node
      // drain stdout/stderr buffers naturally before exiting. Calling
      // process.exit synchronously can truncate piped output —
      // especially on Linux where the pipe buffer is ~8KB.
      process.exitCode = code
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}
