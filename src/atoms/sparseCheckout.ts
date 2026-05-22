/**
 * Sparse checkout atom — configure a repo to only check out specific
 * paths. Useful for testing tools that need to detect or handle
 * sparse-checkout mode (increasingly common in monorepos).
 *
 * Uses the "cone" mode by default (directory-based patterns), which
 * is the recommended mode for git ≥ 2.25.
 *
 *   chain(
 *     addCommit({ message: 'init', files: {
 *       'src/app/index.ts': '…',
 *       'src/lib/utils.ts': '…',
 *       'docs/README.md': '…',
 *     }}),
 *     enableSparseCheckout(['src/app']),
 *     // Only src/app/ is checked out; src/lib/ and docs/ are absent
 *   )
 */

import type { Step } from './types'

/**
 * Enable sparse checkout and set the included paths. Files outside
 * the specified paths will be removed from the working tree but
 * remain in the index and history.
 *
 * @param paths - Directory paths to include in the sparse checkout
 * @param options.cone - Use cone mode (default: true). Cone mode is
 *   faster and uses directory-based patterns. Set to false for
 *   pattern-based sparse checkout.
 */
export function enableSparseCheckout(
  paths: string[],
  options: { cone?: boolean } = {},
): Step {
  const cone = options.cone !== false
  return async (repo) => {
    const initArgs = ['sparse-checkout', 'init']
    if (cone) {
      initArgs.push('--cone')
    }
    await repo.git.raw(initArgs)
    await repo.git.raw(['sparse-checkout', 'set', ...paths])
  }
}

/**
 * Disable sparse checkout, restoring the full working tree.
 */
export function disableSparseCheckout(): Step {
  return async (repo) => {
    await repo.git.raw(['sparse-checkout', 'disable'])
  }
}
