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
 * If the parent `dist/` folder is missing or stale (no `scenarios/index.cjs`),
 * the script falls back to running `npm run build` in the parent first.
 * This keeps Vercel builds (which only build the www/ folder) working
 * via the committed `scenarios.json`, while local dev stays fresh
 * automatically.
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

// If the parent's dist isn't built, try to build it. This keeps the
// generator usable on a fresh checkout. On Vercel (which builds only
// the www/ folder against a pre-committed scenarios.json), this branch
// won't run because the JSON output is already on disk and committed.
if (!existsSync(distPath)) {
  console.log(`▸ Parent dist/ not found at ${distPath}`)
  console.log('  Building parent package first…')
  try {
    execSync('npm run build', { cwd: repoRoot, stdio: 'inherit' })
  } catch (err) {
    console.error('✗ Parent build failed. Cannot generate scenarios.json.')
    console.error('  If this is a Vercel build, the committed scenarios.json should already be in place.')
    process.exit(1)
  }
}

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

const outDir = join(wwwRoot, 'src', 'data')
const outPath = join(outDir, 'scenarios.json')
mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n')

console.log(`✓ Wrote ${payload.length} scenarios to src/data/scenarios.json`)
