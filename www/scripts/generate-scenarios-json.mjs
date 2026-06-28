#!/usr/bin/env node
/**
 * Build-time data generator: imports the `allScenarios` registry from
 * the parent package and emits a JSON file the browser-facing scenario
 * explorer reads at runtime.
 *
 * Single source of truth: the registry. Adding a scenario in
 * `src/scenarios/index.ts` automatically surfaces it on the website
 * the next build, no manual sync needed.
 *
 * The committed `scenarios.json` is the artifact Vercel builds against.
 * Locally, the prebuild + predev hooks invoke this script so the JSON
 * stays in sync with the source. On Vercel (where parent deps aren't
 * installed), the script gracefully falls back to the committed JSON
 * if the parent `dist/` is unavailable.
 *
 * Output: www/src/data/scenarios.json
 *
 * Run via:
 *   - npm run gen:scenarios          (manual)
 *   - npm run build                  (predev/prebuild hooks invoke this)
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const wwwRoot = resolve(__dirname, '..')
const repoRoot = resolve(wwwRoot, '..')
const distPath = join(repoRoot, 'dist', 'scenarios', 'index.cjs')
const parentNodeModules = join(repoRoot, 'node_modules')
const outDir = join(wwwRoot, 'src', 'data')
const outPath = join(outDir, 'scenarios.json')

// Strategy:
//   1. If parent `dist/` exists, regenerate scenarios.json from it.
//      This is the local-dev path — fresh every build.
//   2. If parent `dist/` is missing AND parent `node_modules` exist,
//      build the parent first then regenerate. Fresh-checkout path.
//   3. If parent `dist/` is missing AND parent `node_modules` are too,
//      AND the committed scenarios.json is on disk, use that.
//      This is the Vercel path — the committed JSON is the artifact.
//   4. If none of the above: fail loudly. Something is wrong.

if (existsSync(distPath)) {
  await regenerate()
} else if (existsSync(parentNodeModules)) {
  console.log('▸ Parent dist/ missing, but parent node_modules exist — building parent first…')
  try {
    execSync('npm run build', { cwd: repoRoot, stdio: 'inherit' })
    await regenerate()
  } catch {
    console.error('✗ Parent build failed.')
    process.exit(1)
  }
} else if (existsSync(outPath)) {
  console.log('ℹ Parent dist/ + node_modules unavailable — using committed scenarios.json.')
  console.log('  (This is the expected Vercel build path.)')
  process.exit(0)
} else {
  console.error('✗ Cannot generate scenarios.json:')
  console.error('  - Parent dist/ is missing')
  console.error('  - Parent node_modules are missing (cannot build parent)')
  console.error('  - Committed scenarios.json is missing (no fallback)')
  console.error('')
  console.error('  Local fix: from the repo root, run `npm install && npm run build`')
  process.exit(1)
}

async function regenerate() {
  const { allScenarios } = await import(distPath)

  if (!Array.isArray(allScenarios) || allScenarios.length === 0) {
    console.error(`✗ Failed to load allScenarios from ${distPath}`)
    process.exit(1)
  }

  // `createTempGitRepo` lives in the parent's main entry. We use it to
  // materialize each scenario and capture its real commit graph — the
  // library guarantees byte-identical (and thus hash-identical) output,
  // so the graph committed here reproduces deterministically.
  const indexPath = join(repoRoot, 'dist', 'index.cjs')
  const { createTempGitRepo } = await import(indexPath)

  /**
   * Materialize one scenario and capture a compact `git log --graph`
   * rendering plus the local branch list. Failures (e.g. linked
   * worktrees that touch sibling dirs) degrade gracefully to an empty
   * graph rather than failing the whole build.
   */
  async function captureGraph(scenario) {
    const repo = await createTempGitRepo()
    try {
      await scenario.setup(repo)
      let graph = []
      try {
        const raw = await repo.git.raw([
          'log',
          '--graph',
          '--oneline',
          '--all',
          '--decorate',
          '--color=never',
        ])
        graph = raw.trimEnd().split('\n').filter(Boolean)
      } catch {
        // Empty repo (no commits) — git log exits non-zero. Leave [].
      }
      let branches = []
      try {
        const raw = await repo.git.raw(['branch', '--format=%(refname:short)'])
        branches = raw.trimEnd().split('\n').filter(Boolean)
      } catch {
        /* ignore */
      }
      let commits = []
      try {
        const SEP = '\x1f'
        const raw = await repo.git.raw([
          'log',
          '--all',
          '--date-order',
          `--pretty=format:%H${SEP}%h${SEP}%P${SEP}%D${SEP}%s${SEP}%an${SEP}%aI`,
        ])
        commits = raw.trimEnd().split('\n').filter(Boolean).map((line) => {
          const [hash, short, parentsRaw, refsRaw, subject, author, date] = line.split(SEP)
          return {
            hash,
            short,
            parents: parentsRaw ? parentsRaw.split(' ').filter(Boolean) : [],
            refs: refsRaw || '',
            subject: subject || '',
            author: author || '',
            date: date || '',
          }
        })
      } catch {
        // Empty repo — leave [].
      }
      return { graph, branches, commits }
    } catch (err) {
      console.warn(`  ⚠ could not capture graph for "${scenario.name}": ${err.message}`)
      return { graph: [], branches: [], commits: [] }
    } finally {
      await repo.cleanup()
    }
  }

  const payload = []
  for (const s of allScenarios) {
    const { graph, branches, commits } = await captureGraph(s)
    // Strip the runtime-only `setup` function — it's not serializable
    // and the browser doesn't need it. Everything else is plain data.
    payload.push({
      name: s.name,
      summary: s.summary,
      description: s.description,
      kind: s.kind,
      tags: s.tags ?? [],
      contracts: s.contracts ?? [],
      graph,
      branches,
      commits,
    })
  }

  mkdirSync(outDir, { recursive: true })
  writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n')

  const withGraph = payload.filter((p) => p.graph.length > 0).length
  console.log(
    `✓ Wrote ${payload.length} scenarios to src/data/scenarios.json (${withGraph} with commit graphs)`,
  )
}
