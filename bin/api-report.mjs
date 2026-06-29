#!/usr/bin/env node
/**
 * API surface snapshot tool for @gfargo/git-scenarios.
 *
 * Usage:
 *   node bin/api-report.mjs           # CI mode: fail if any report changed
 *   node bin/api-report.mjs --local   # Update mode: regenerate reports
 */

import { createRequire } from 'module'
import { existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const { Extractor, ExtractorConfig } = require('@microsoft/api-extractor')

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const localBuild = process.argv.includes('--local')

/** Entry points that map to dist/<key>.d.ts (mirrors tsup.config.ts entry map). */
const ENTRIES = [
  'index',
  'atoms/index',
  'scenarios/index',
  'capture',
  'matchers',
  'tempGitRepo',
  'jest',
  'vitest',
  'node-test',
  'mocha',
  'ava',
  'playwright',
  'cypress',
  'mcp',
]

const etcDir = resolve(rootDir, 'etc')
mkdirSync(etcDir, { recursive: true })

let anyChanged = false
let anyFailed = false

for (const entry of ENTRIES) {
  const dtsPath = resolve(rootDir, 'dist', `${entry}.d.ts`)
  if (!existsSync(dtsPath)) {
    console.error(`✗ Missing: dist/${entry}.d.ts — run "npm run build" first`)
    anyFailed = true
    continue
  }

  // Flatten entry path to a filename: atoms/index → atoms-index
  const slug = entry.replace('/', '-')
  const reportFileName = `${slug}.api.md`

  let config
  try {
    config = ExtractorConfig.prepare({
      configObject: {
        projectFolder: rootDir,
        mainEntryPointFilePath: dtsPath,
        bundledPackages: [],
        compiler: {
          tsconfigFilePath: resolve(rootDir, 'tsconfig.json'),
          overrideTsconfig: { compilerOptions: { skipLibCheck: true } },
        },
        apiReport: {
          enabled: true,
          reportFolder: etcDir,
          reportFileName,
          reportTempFolder: resolve(rootDir, 'temp/api-report'),
        },
        docModel: { enabled: false },
        dtsRollup: { enabled: false },
        tsdocMetadata: { enabled: false },
        messages: {
          extractorMessageReporting: {
            default: { logLevel: 'none' },
          },
          tsdocMessageReporting: { default: { logLevel: 'none' } },
          compilerMessageReporting: { default: { logLevel: 'none' } },
        },
      },
      configObjectFullPath: resolve(rootDir, 'api-extractor.json'),
      packageJsonFullPath: resolve(rootDir, 'package.json'),
    })
  } catch (err) {
    console.error(`✗ Config error for ${entry}: ${err.message}`)
    anyFailed = true
    continue
  }

  const result = Extractor.invoke(config, {
    localBuild,
    showVerboseMessages: false,
    showDiagnostics: false,
  })

  if (!result.succeeded) {
    console.error(`✗ Extraction failed for ${entry}`)
    anyFailed = true
  } else if (result.apiReportChanged) {
    if (localBuild) {
      console.log(`✓ Updated: etc/${reportFileName}`)
    } else {
      console.error(
        `✗ API surface changed for "${entry}" — run "npm run api:update" and commit etc/${reportFileName}`,
      )
      anyChanged = true
    }
  } else {
    console.log(`✓ No change: etc/${reportFileName}`)
  }
}

// Clean up temp dir created by api-extractor
import { rmSync } from 'fs'
const tempDir = resolve(rootDir, 'temp')
if (existsSync(tempDir)) {
  rmSync(tempDir, { recursive: true, force: true })
}

if (anyFailed || (!localBuild && anyChanged)) {
  process.exit(1)
}
