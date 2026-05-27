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

  // Strip the runtime-only `setup` function — it's not serializable and
  // the browser doesn't need it. Everything else is plain data.
  const payload = allScenarios.map((s) => ({
    name: s.name,
    summary: s.summary,
    description: s.description,
    kind: s.kind,
    tags: s.tags ?? [],
    contracts: s.contracts ?? [],
  }))

  mkdirSync(outDir, { recursive: true })
  writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n')

  console.log(`✓ Wrote ${payload.length} scenarios to src/data/scenarios.json`)
}
