/**
 * `large-repo` — a repo with 100+ commits across multiple branches,
 * designed for stress-testing tools that paginate, virtualize, or
 * filter large histories.
 *
 * State after setup:
 *   - `main` has 80 commits (mix of feat/fix/chore/docs/refactor)
 *   - `feat/large-feature` has 25 additional commits (branched from main~40)
 *   - `develop` has 10 additional commits (branched from main~20)
 *   - 50+ files across src/, tests/, docs/ directories
 *   - 3 tags: v0.1.0, v0.5.0, v1.0.0 at various points
 *   - Total: 115 commits across all branches
 *
 * EXTRACTION DISCIPLINE: no coco-specific imports.
 */

import {
    addCommit,
    chain,
    checkoutBranch,
    createTag,
    defineScenario,
    repeat,
    switchToBranch,
} from '../atoms'
import type { Step } from '../atoms/types'

const FILE_PREFIXES = ['src', 'tests', 'docs', 'lib', 'config']
const COMMIT_TYPES = ['feat', 'fix', 'chore', 'docs', 'refactor', 'test', 'perf', 'ci']

function makeCommit(index: number): Step {
  const type = COMMIT_TYPES[index % COMMIT_TYPES.length]
  const dir = FILE_PREFIXES[index % FILE_PREFIXES.length]
  const fileName = `${dir}/module-${index}.ts`
  const content = `// Module ${index}\nexport const module${index} = {\n  id: ${index},\n  type: '${type}',\n}\n`
  return addCommit({
    message: `${type}: implement module ${index}`,
    files: { [fileName]: content },
  })
}

export const largeRepoScenario = defineScenario({
  name: 'large-repo',
  summary: '115 commits across 3 branches with tags — for pagination and performance testing',
  description: [
    'A repository with 115 commits across multiple branches, designed',
    'for stress-testing tools that paginate, virtualize, or filter',
    'large histories.',
    '',
    '  - `main` has 80 commits (mix of feat/fix/chore/docs/refactor)',
    '  - `feat/large-feature` has 25 commits (branched from main~40)',
    '  - `develop` has 10 commits (branched from main~20)',
    '  - 50+ files across src/, tests/, docs/, lib/, config/',
    '  - 3 tags: v0.1.0 (at commit 20), v0.5.0 (at commit 50),',
    '    v1.0.0 (at commit 80)',
    '',
    'Useful for testing:',
    '  - log pagination / infinite scroll',
    '  - history graph rendering performance',
    '  - search / filter across large commit sets',
    '  - branch comparison with many commits',
    '  - tag navigation in long histories',
  ].join('\n'),
  kind: 'history',
  tags: ['large', 'history', 'performance', 'pagination'],
  contracts: [
    'main is checked out',
    'main has 80 commits',
    'feat/large-feature exists with 25 commits ahead of its fork point',
    'develop exists with 10 commits ahead of its fork point',
    'tags v0.1.0, v0.5.0, v1.0.0 exist',
    'total commit count across all branches is 115',
  ],
  setup: chain(
    // First 20 commits on main
    repeat(20, (i) => makeCommit(i)),
    // Tag v0.1.0
    createTag('v0.1.0', { message: 'Release v0.1.0' }),

    // Next 20 commits on main (20-39)
    repeat(20, (i) => makeCommit(i + 20)),

    // Branch feat/large-feature from here (main at commit 40)
    switchToBranch('feat/large-feature'),
    repeat(25, (i) => addCommit({
      message: `feat: large-feature step ${i + 1}`,
      files: { [`src/feature/step-${i + 1}.ts`]: `export const step${i + 1} = true\n` },
    })),

    // Back to main, continue to commit 60
    checkoutBranch('main'),
    repeat(20, (i) => makeCommit(i + 40)),

    // Tag v0.5.0 at commit 60 (index 50 in makeCommit but 60th commit)
    createTag('v0.5.0', { message: 'Release v0.5.0' }),

    // Branch develop from here (main at commit 60)
    switchToBranch('develop'),
    repeat(10, (i) => addCommit({
      message: `feat: develop iteration ${i + 1}`,
      files: { [`src/develop/iter-${i + 1}.ts`]: `export const iter${i + 1} = true\n` },
    })),

    // Back to main, final 20 commits (60-79)
    checkoutBranch('main'),
    repeat(20, (i) => makeCommit(i + 60)),

    // Tag v1.0.0 at the tip
    createTag('v1.0.0', { message: 'Release v1.0.0' }),
  ),
})
