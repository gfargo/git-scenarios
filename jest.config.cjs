/**
 * Jest config — runs the package's tests via ts-jest, compiling
 * source to CommonJS for the test process even though the published
 * package targets ESM. Common pattern: build output is ESM (for the
 * consumer), test runtime is CJS (simpler, no `--experimental-vm-modules`).
 *
 * `.cjs` extension so jest's config loader treats this as CommonJS
 * regardless of the package's `"type": "module"` setting.
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/bin'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Many tests shell out to git via simple-git (rebase + conflict + continue,
  // submodule clones, fetch-back patterns). CI runners are slow enough that
  // the default 5s timeout flakes on these compound flows. 30s gives
  // headroom without masking real hangs.
  testTimeout: 30_000,
  collectCoverageFrom: [
    'src/**/*.ts',
    'bin/**/*.ts',
    '!src/**/*.test.ts',
    '!src/__fixtures__/**',
    // The CLI binary is exercised end-to-end via `bin/cli.e2e.test.ts`
    // (a child-process test against the built binary), so its coverage
    // numbers don't reflect actual test execution. The lookup paths
    // it relies on are covered in `bin/cli.test.ts`.
    '!bin/cli.ts',
    // The Vitest adapter can only run under Vitest's runtime, so its
    // line coverage is structurally 0 in a Jest run. Shape parity
    // with the Jest adapter is verified in `vitest.test.ts`.
    '!src/vitest.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      // The `functions` metric counts every named re-export in a
      // barrel file as a function, even though those identifiers are
      // never invoked through the barrel — they're invoked from the
      // source module. Re-export-heavy files (src/index.ts,
      // src/scenarios/index.ts) drag this metric down without
      // representing actual untested behavior. The lines/statements/
      // branches numbers are the meaningful gates.
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          target: 'ES2020',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          types: ['jest', 'node'],
        },
      },
    ],
  },
}
