import { defineConfig } from 'tsup'

export default defineConfig([
  // Library entry points
  {
    entry: {
      'index': 'src/index.ts',
      'atoms/index': 'src/atoms/index.ts',
      'scenarios/index': 'src/scenarios/index.ts',
      'capture': 'src/capture.ts',
      'matchers': 'src/matchers.ts',
      'tempGitRepo': 'src/tempGitRepo.ts',
      'jest': 'src/jest.ts',
      'vitest': 'src/vitest.ts',
      'node-test': 'src/node-test.ts',
      'mocha': 'src/mocha.ts',
      'ava': 'src/ava.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    splitting: false,
    // Shims __dirname/__filename for ESM output (used by scenarioCache.ts to
    // locate package.json at runtime without hand-syncing a version literal).
    shims: true,
    // Externalize peer deps and node builtins
    external: ['simple-git'],
  },
  // CLI binary (CJS only — Node scripts don't need ESM)
  {
    entry: { 'bin/cli': 'bin/cli.ts' },
    format: ['cjs'],
    sourcemap: true,
    outDir: 'dist',
    external: ['simple-git'],
  },
])
