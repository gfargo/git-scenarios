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
      'playwright': 'src/playwright.ts',
      'cypress': 'src/cypress.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    splitting: false,
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
