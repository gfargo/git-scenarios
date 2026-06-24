/**
 * Cypress framework adapter for `@gfargo/git-scenarios`.
 *
 * Cypress tests run in a browser environment and cannot directly create
 * git repos. This module registers Node-side `cy.task` handlers so browser
 * specs can spin up and tear down scenarios across the process boundary.
 *
 * **Setup** — in `cypress.config.ts`:
 *
 *   import { defineConfig } from 'cypress'
 *   import { registerScenarioTasks } from '@gfargo/git-scenarios/cypress'
 *
 *   export default defineConfig({
 *     e2e: {
 *       setupNodeEvents(on, config) {
 *         registerScenarioTasks(on)
 *         return config
 *       },
 *     },
 *   })
 *
 * **Usage in a spec**:
 *
 *   describe('git tool E2E', () => {
 *     let repoPath: string
 *
 *     beforeEach(() => {
 *       cy.task('gitScenario:spinUp', { name: 'feature-pr-ready' }).then((result) => {
 *         repoPath = (result as { path: string }).path
 *       })
 *     })
 *
 *     afterEach(() => {
 *       cy.task('gitScenario:cleanup', { path: repoPath })
 *     })
 *
 *     it('launches the git tool against the scenario repo', () => {
 *       cy.exec(`my-git-tool status --repo ${repoPath}`)
 *         .its('stdout')
 *         .should('contain', 'On branch feat/widget-v2')
 *     })
 *   })
 *
 * **Safety teardown** — add a `gitScenario:cleanupAll` task in an `after`
 * hook to drain any repos that individual cleanup tasks missed:
 *
 *   after(() => cy.task('gitScenario:cleanupAll'))
 *
 * **Custom prefix** — change the task name prefix if `gitScenario`
 * collides with another Cypress plugin:
 *
 *   registerScenarioTasks(on, { prefix: 'myGit' })
 *   // registers: myGit:spinUp, myGit:cleanup, myGit:cleanupAll
 *
 * **Note on extraSteps:** Cypress task arguments must be JSON-serializable,
 * so functions (atoms / `Step` values) cannot be passed via `cy.task`.
 * To spin up a scenario with custom atoms, register a named scenario first
 * (via `registerScenario`) and then spin it up by name.
 *
 * **Dependency-free at install time.** Cypress is NOT a hard dependency.
 * Consumers must have it installed in their project. The `on` parameter
 * type below is intentionally narrow so the file compiles without Cypress.
 */

import type { TempGitRepo } from './tempGitRepo'
import { createTempGitRepo } from './tempGitRepo'
import { resolveScenario } from './resolveScenario'
import type { SpinUpScenarioOptions } from './spinUpScenario'

// ---------------------------------------------------------------------------
// Module-level registry — maps repo path → TempGitRepo so cleanup tasks
// issued in separate cy.task calls can find the same object.
// ---------------------------------------------------------------------------

const activeRepos = new Map<string, TempGitRepo>()

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** JSON-serializable result returned by the `spinUp` task. */
export type CypressScenarioResult = {
  /** Absolute path to the temp git repo on disk. */
  path: string
}

/** Options for {@link registerScenarioTasks}. */
export type RegisterScenarioTasksOptions = {
  /**
   * Prefix for the registered task names.
   * Defaults to `'gitScenario'` → `gitScenario:spinUp`, etc.
   *
   * @example `{ prefix: 'myGit' }` → `myGit:spinUp`, `myGit:cleanup`, `myGit:cleanupAll`
   */
  prefix?: string
}

/**
 * JSON-serializable arguments for the `spinUp` task.
 * Functions (extraSteps) cannot cross the Cypress browser→node boundary.
 */
type SpinUpTaskArgs = {
  name: string
  options?: Pick<SpinUpScenarioOptions, 'autoCleanup' | 'remote'>
}

/** Arguments for the `cleanup` task. */
type CleanupTaskArgs = {
  path: string
}

// ---------------------------------------------------------------------------
// Node-events registration
// ---------------------------------------------------------------------------

/**
 * Register git-scenario node-side tasks with Cypress.
 *
 * Call inside `setupNodeEvents` in `cypress.config.ts`.
 *
 * Tasks registered (default prefix `gitScenario`):
 * - `gitScenario:spinUp`     — spin up a named scenario; returns `{ path }`
 * - `gitScenario:cleanup`    — clean up a repo by path; returns `null`
 * - `gitScenario:cleanupAll` — drain all active repos (safety net); returns `null`
 *
 * @param on - The Cypress plugin event emitter (first arg of `setupNodeEvents`)
 * @param options - Optional configuration
 */
export function registerScenarioTasks(
  on: (event: 'task', tasks: Record<string, (args: unknown) => unknown>) => void,
  options: RegisterScenarioTasksOptions = {},
): void {
  const prefix = options.prefix ?? 'gitScenario'

  on('task', {
    [`${prefix}:spinUp`]: async (args: unknown): Promise<CypressScenarioResult> => {
      const { name, options: taskOptions = {} } = args as SpinUpTaskArgs

      const scenario = resolveScenario(name, `cypress/${prefix}:spinUp`)
      const repo = await createTempGitRepo(taskOptions)
      await scenario.setup(repo)

      activeRepos.set(repo.path, repo)
      return { path: repo.path }
    },

    [`${prefix}:cleanup`]: async (args: unknown): Promise<null> => {
      const { path } = args as CleanupTaskArgs
      const repo = activeRepos.get(path)
      if (repo) {
        await repo.cleanup()
        activeRepos.delete(path)
      }
      return null
    },

    [`${prefix}:cleanupAll`]: async (): Promise<null> => {
      for (const repo of activeRepos.values()) {
        await repo.cleanup()
      }
      activeRepos.clear()
      return null
    },
  })
}
