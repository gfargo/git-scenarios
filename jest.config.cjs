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
  roots: ['<rootDir>/src'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
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
