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

import { simpleGit } from 'simple-git'

import type { Scenario, ScenarioKind } from '../src/scenarios'
import {
  captureToJson,
  gatherRepoState,
  normalizeName,
  renderScenarioModule,
} from '../src/capture'
import { findRegistered, listRegistered } from '../src/registry'
import { createTempGitRepo } from '../src/tempGitRepo'

type ParsedArgs = {
  command?: 'list' | 'describe' | 'inspect' | 'create' | 'capture' | 'clean' | 'help'
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

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = []
  const flags: Record<string, string | boolean> = {}
  let command: ParsedArgs['command']

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=')
      if (eqIdx > 0) {
        flags[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1)
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        flags[arg.slice(2)] = argv[i + 1]
        i += 1
      } else {
        flags[arg.slice(2)] = true
      }
    } else if (!command) {
      if (arg === 'list' || arg === 'describe' || arg === 'inspect' || arg === 'create' || arg === 'capture' || arg === 'clean' || arg === 'help') {
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
    '  Usage:',
    '    git-scenarios list [--kind <k>] [--tag <t>] [--json]',
    '    git-scenarios describe <name> [--json]',
    '    git-scenarios inspect <name> [--json]',
    '    git-scenarios create <name> [options]',
    '    git-scenarios capture [path] [options]',
    '    git-scenarios clean [options]',
    '',
    '  List options:',
    '    --kind <kind>    Filter by kind (branch | worktree | operation |',
    '                     history | stash | submodule)',
    '    --tag <tag>      Filter by tag (e.g. conflict, dirty, upstream)',
    '    --json           Machine-readable JSON output',
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
    `  Available scenarios (${listRegistered().length}):`,
    ...listRegistered().map((s) => `    ${s.name.padEnd(28)} ${s.summary}`),
    '',
  ].join('\n'))
}

function commandList(options: { kind?: string; tag?: string; json?: boolean }): number {
  const scenarios = applyFilters(listRegistered(), options)

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

/**
 * Find and remove stale git-scenarios temp directories.
 * Looks for directories matching both `git-scenarios-*` (current) and
 * `coco-git-test-*` (legacy) patterns in the system temp directory.
 */
async function commandClean(options: {
  dryRun?: boolean
  olderThanHours?: number
}): Promise<number> {
  const tmp = tmpdir()
  const CURRENT_PREFIX = 'git-scenarios-'
  const LEGACY_PREFIX = 'coco-git-test-'
  const nowMs = Date.now()
  const maxAgeMs = (options.olderThanHours || 0) * 60 * 60 * 1000

  let entries: string[]
  try {
    entries = readdirSync(tmp)
  } catch {
    console.error(`Could not read temp directory: ${tmp}`)
    return 1
  }

  const scenarioDirs = entries
    .filter((name) => name.startsWith(CURRENT_PREFIX) || name.startsWith(LEGACY_PREFIX))
    .map((name) => {
      const fullPath = path.join(tmp, name)
      const isLegacy = name.startsWith(LEGACY_PREFIX)
      try {
        const stat = statSync(fullPath)
        return { path: fullPath, mtime: stat.mtimeMs, isDir: stat.isDirectory(), isLegacy }
      } catch {
        return null
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null && entry.isDir)
    .filter((entry) => {
      if (maxAgeMs === 0) return true
      return (nowMs - entry.mtime) > maxAgeMs
    })

  if (scenarioDirs.length === 0) {
    console.log('')
    console.log('  No stale scenario directories found.')
    console.log('')
    return 0
  }

  console.log('')
  console.log(`  Found ${scenarioDirs.length} scenario director${scenarioDirs.length === 1 ? 'y' : 'ies'}:`)
  console.log('')

  for (const dir of scenarioDirs) {
    const age = Math.round((nowMs - dir.mtime) / (60 * 60 * 1000))
    const label = dir.isLegacy ? ' (legacy)' : ''
    console.log(`    ${dir.path}${label}  (${age}h old)`)
  }

  if (options.dryRun) {
    console.log('')
    console.log('  (dry run — no directories removed)')
    console.log('')
    return 0
  }

  console.log('')
  let removed = 0
  for (const dir of scenarioDirs) {
    const label = dir.isLegacy ? ' (legacy)' : ''
    try {
      rmSync(dir.path, { recursive: true, force: true })
      removed += 1
      console.log(`  removing: ${path.basename(dir.path)}${label}`)
    } catch (error) {
      console.error(`  Failed to remove: ${dir.path} — ${(error as Error).message}`)
    }
  }

  console.log('')
  console.log(`  ✓ Removed ${removed} director${removed === 1 ? 'y' : 'ies'}.`)
  console.log('')
  return 0
}

async function main(): Promise<number> {
  const { command, positional, flags } = parseArgs(process.argv.slice(2))

  if (!command || command === 'help' || flags.help) {
    printHelp()
    return 0
  }

  if (command === 'list') {
    return commandList({
      kind: typeof flags.kind === 'string' ? flags.kind : undefined,
      tag: typeof flags.tag === 'string' ? flags.tag : undefined,
      json: Boolean(flags.json),
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
