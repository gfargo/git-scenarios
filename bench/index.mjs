#!/usr/bin/env node
/**
 * Benchmark harness: measures spinUpScenario() spin-up time for three
 * representative scenario sizes (empty, mid-size, large) across multiple
 * iterations, discards warmup runs, and reports median + min timing both
 * to stdout and as a machine-readable JSON file for CI consumption.
 *
 * Usage:  npm run bench
 * Output: bench-results.json  (benchmark-action/github-action-benchmark format)
 */

import { spinUpScenario } from '../dist/index.js'
import { writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Configuration ────────────────────────────────────────────────────────────

const SCENARIOS = [
  { name: 'empty-repo', label: 'empty-repo (empty baseline)' },
  { name: 'dirty-many-files', label: 'dirty-many-files (mid-size)' },
  { name: 'large-repo', label: 'large-repo (115 commits, 3 branches)' },
]

const WARMUP = 2      // iterations to discard
const ITERATIONS = 5  // measured iterations per scenario

// ── Helpers ──────────────────────────────────────────────────────────────────

function median(nums) {
  const sorted = [...nums].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2n
    : sorted[mid]
}

function msStr(ns) {
  return (Number(ns) / 1e6).toFixed(1)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function runScenario(scenarioName) {
  const start = process.hrtime.bigint()
  const repo = await spinUpScenario(scenarioName)
  const elapsed = process.hrtime.bigint() - start
  await repo.cleanup()
  return elapsed
}

async function bench() {
  const results = []

  console.log(`\ngit-scenarios benchmark`)
  console.log(`  warmup: ${WARMUP} run(s), measured: ${ITERATIONS} run(s)\n`)

  for (const { name, label } of SCENARIOS) {
    process.stdout.write(`  ${label}\n`)

    // Warmup
    for (let i = 0; i < WARMUP; i++) {
      process.stdout.write(`    warmup  ${i + 1}/${WARMUP}...`)
      await runScenario(name)
      process.stdout.write(' done\n')
    }

    // Measured
    const samples = []
    for (let i = 0; i < ITERATIONS; i++) {
      process.stdout.write(`    sample  ${i + 1}/${ITERATIONS}...`)
      const ns = await runScenario(name)
      samples.push(ns)
      process.stdout.write(` ${msStr(ns)} ms\n`)
    }

    const med = median(samples)
    const min = samples.reduce((a, b) => (a < b ? a : b))
    results.push({ name, label, med, min, samples })
    console.log(`    → median ${msStr(med)} ms  |  min ${msStr(min)} ms\n`)
  }

  // Human-readable summary table
  console.log('─'.repeat(68))
  console.log(`${'Scenario'.padEnd(36)} ${'Median (ms)'.padStart(12)} ${'Min (ms)'.padStart(10)}`)
  console.log('─'.repeat(68))
  for (const { label, med, min } of results) {
    const medStr = msStr(med).padStart(12)
    const minStr = msStr(min).padStart(10)
    console.log(`${label.padEnd(36)} ${medStr} ${minStr}`)
  }
  console.log('─'.repeat(68))

  // Machine-readable JSON (benchmark-action/github-action-benchmark format)
  // customSmallerIsBetter: lower numbers are better (latency)
  const benchmarkJson = results.map(({ name, med }) => ({
    name,
    unit: 'ms',
    value: Number((Number(med) / 1e6).toFixed(2)),
  }))

  const outPath = resolve(__dirname, '..', 'bench-results.json')
  await writeFile(outPath, JSON.stringify(benchmarkJson, null, 2) + '\n')
  console.log(`\nResults written to bench-results.json`)

  return results
}

// ── Parallel vs Serial benchmark ─────────────────────────────────────────────

async function benchParallel() {
  let spinUpAll
  try {
    const mod = await import('../dist/index.js')
    spinUpAll = mod.spinUpAll
    if (!spinUpAll) throw new Error('not exported')
  } catch {
    console.log('\n  ⚠ spinUpAll not found in dist — skipping parallel benchmark.')
    console.log('    (Merge the spinUpAll PR and rebuild to enable this benchmark.)\n')
    return null
  }

  const PARALLEL_SCENARIOS = [
    'empty-repo',
    'feature-pr-ready',
    'two-commit-feature',
    'stashed-changes',
    'detached-head',
    'feature-branch-one-commit',
    'multi-commit-branch',
    'mid-merge-conflict',
  ]

  console.log(`\nspinUpAll benchmark (${PARALLEL_SCENARIOS.length} scenarios)`)
  console.log(`  comparing serial (concurrency=1) vs parallel (concurrency=4)\n`)

  // Serial
  const serialSamples = []
  for (let i = 0; i < 3; i++) {
    const start = process.hrtime.bigint()
    const repos = await spinUpAll(PARALLEL_SCENARIOS, { concurrency: 1 })
    const elapsed = process.hrtime.bigint() - start
    await Promise.all(repos.map(r => r.cleanup()))
    serialSamples.push(elapsed)
    process.stdout.write(`    serial   ${i + 1}/3: ${msStr(elapsed)} ms\n`)
  }

  // Parallel (concurrency=4)
  const parallelSamples = []
  for (let i = 0; i < 3; i++) {
    const start = process.hrtime.bigint()
    const repos = await spinUpAll(PARALLEL_SCENARIOS, { concurrency: 4 })
    const elapsed = process.hrtime.bigint() - start
    await Promise.all(repos.map(r => r.cleanup()))
    parallelSamples.push(elapsed)
    process.stdout.write(`    parallel ${i + 1}/3: ${msStr(elapsed)} ms\n`)
  }

  const serialMed = median(serialSamples)
  const parallelMed = median(parallelSamples)
  const speedup = (Number(serialMed) / Number(parallelMed)).toFixed(2)

  console.log('')
  console.log(`    → serial median:   ${msStr(serialMed)} ms`)
  console.log(`    → parallel median: ${msStr(parallelMed)} ms`)
  console.log(`    → speedup:         ${speedup}x`)
  console.log('')

  return { serialMed, parallelMed, speedup }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const results = await bench()
  const parallelResults = await benchParallel()

  if (parallelResults) {
    // Append parallel results to the JSON output
    const outPath = resolve(__dirname, '..', 'bench-results.json')
    const { readFile } = await import('node:fs/promises')
    const existing = JSON.parse(await readFile(outPath, 'utf-8'))
    existing.push(
      { name: 'spinUpAll-serial-8', unit: 'ms', value: Number((Number(parallelResults.serialMed) / 1e6).toFixed(2)) },
      { name: 'spinUpAll-parallel-8', unit: 'ms', value: Number((Number(parallelResults.parallelMed) / 1e6).toFixed(2)) },
    )
    await writeFile(outPath, JSON.stringify(existing, null, 2) + '\n')
    console.log('Updated bench-results.json with parallel benchmark results')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
