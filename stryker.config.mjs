/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'npm',
  testRunner: 'jest',
  jest: {
    configFile: 'jest.config.cjs',
    enableFindRelatedTests: true,
  },
  reporters: ['html', 'clear-text', 'progress'],
  coverageAnalysis: 'perTest',
  mutate: [
    'src/commitClock.ts',
    'src/capture.ts',
    'src/atoms/seededFiles.ts',
    'src/atoms/chain.ts',
  ],
  // break: null for the baseline — flip to a number once score is stable (see MUTATION.md)
  thresholds: { high: 80, low: 60, break: null },
  // The test suite shells out to git extensively; give plenty of headroom
  dryRunTimeoutMinutes: 15,
  // Per-mutant timeout offset on top of the baseline test duration
  timeoutMS: 60000,
  // Low concurrency: spawning many git sub-processes contend on I/O and temp dirs
  concurrency: 2,
}
