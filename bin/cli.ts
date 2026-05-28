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
import { readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as path from 'node:path'

import type { Scenario } from '../src/scenarios'
import { findRegistered, listRegistered } from '../src/registry'
import { createTempGitRepo } from '../src/tempGitRepo'

type ParsedArgs = {
  command?: 'list' | 'describe' | 'create' | 'clean' | 'help'
  positional: string[]
  flags: Record<string, string | boolean>
}

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
      if (arg === 'list' || arg === 'describe' || arg === 'create' || arg === 'clean' || arg === 'help') {
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
    '    git-scenarios create <name> [options]',
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
