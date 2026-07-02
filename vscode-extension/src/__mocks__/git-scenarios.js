'use strict'
const MOCK_SCENARIOS = [
  {
    name: 'feature-pr-ready',
    kind: 'branch',
    summary: 'Branch with one ahead commit and staged files',
  },
  {
    name: 'merge-conflict',
    kind: 'operation',
    summary: 'Mid-merge state with a conflict in a tracked file',
  },
  {
    name: 'detached-head',
    kind: 'history',
    summary: 'HEAD pointing directly at a commit (not a branch)',
  },
]

module.exports = {
  listRegistered: () => MOCK_SCENARIOS,
  spinUpScenario: jest.fn().mockResolvedValue({ path: '/tmp/git-scenarios-test-abc' }),
  clearScenarioCache: jest.fn().mockResolvedValue(undefined),
  cacheRoot: jest.fn().mockReturnValue('/tmp/git-scenarios-cache'),
}
