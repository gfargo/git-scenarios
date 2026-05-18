import type { Step } from './types'

/**
 * Sequence atoms into a single `Step`. The composed step runs each
 * input in order, awaiting each before starting the next.
 *
 * `chain()` with no arguments is a valid no-op step — useful as a
 * placeholder while iterating on a scenario.
 *
 * Errors short-circuit: if one step rejects, subsequent steps don't
 * run. The promise rejects with that step's error so the caller's
 * stack trace points at the offending atom rather than the chain
 * wrapper.
 */
export function chain(...steps: Step[]): Step {
  return async (repo) => {
    for (const step of steps) {
      await step(repo)
    }
  }
}

/**
 * Run an atom factory N times, threading the index in so each call
 * can produce a distinct step (different file name, different seed,
 * different commit message). Equivalent to spreading an
 * `Array.from(...).map(...)` into `chain()`, but reads as the
 * intent: "do this N times."
 *
 *   chain(
 *     repeat(8, (i) => addCommit({ message: `feat: step ${i + 1}` })),
 *   )
 */
export function repeat(n: number, factory: (index: number) => Step): Step {
  return chain(...Array.from({ length: n }, (_, i) => factory(i)))
}

/**
 * Run a step only when a condition is true. The condition can be a
 * static boolean or a function that receives the repo and returns a
 * boolean (or Promise<boolean>) — enabling runtime decisions based
 * on repo state.
 *
 * Static condition (decided at scenario-definition time):
 *
 *   chain(
 *     addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
 *     conditionally(process.env.WITH_REMOTE === '1',
 *       addRemote('origin', 'git@github.com:org/repo.git'),
 *     ),
 *   )
 *
 * Dynamic condition (decided at run time based on repo state):
 *
 *   chain(
 *     addCommit({ message: 'init', files: { 'README.md': '# repo' } }),
 *     conditionally(
 *       async (repo) => (await repo.git.branchLocal()).all.includes('feat/x'),
 *       addCommit({ message: 'extra commit on feat/x' }),
 *     ),
 *   )
 *
 * When the condition is false, the step is a no-op.
 */
export function conditionally(
  condition: boolean | ((repo: Parameters<Step>[0]) => boolean | Promise<boolean>),
  step: Step,
): Step {
  return async (repo) => {
    const shouldRun = typeof condition === 'function' ? await condition(repo) : condition
    if (shouldRun) {
      await step(repo)
    }
  }
}
