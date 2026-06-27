/**
 * Smoke test for the Cypress adapter.
 *
 * Cypress is not installed in this project (we use Jest). We verify:
 *   1. registerScenarioTasks is exported as a function
 *   2. It registers tasks under the expected names (default + custom prefix)
 *   3. gitScenario:spinUp returns a serializable { path } result
 *   4. gitScenario:cleanup removes the repo and returns null
 *   5. gitScenario:cleanupAll drains all active repos
 *   6. Cleanup of an unknown path is a safe no-op
 *   7. spinUp throws on an unknown scenario name
 */

import { existsSync } from 'fs'
import { simpleGit } from 'simple-git'
import { registerScenarioTasks } from './cypress'

type TaskFn = (args: unknown) => Promise<unknown>
type TaskMap = Record<string, TaskFn>

function captureTaskRegistration(): { on: (event: string, tasks: TaskMap) => void; tasks: TaskMap } {
  const tasks: TaskMap = {}
  return {
    on: (_event: string, t: TaskMap) => { Object.assign(tasks, t) },
    tasks,
  }
}

describe('cypress adapter', () => {
  it('exports registerScenarioTasks as a function', () => {
    expect(typeof registerScenarioTasks).toBe('function')
  })

  describe('task registration', () => {
    it('registers the three default-prefixed tasks', () => {
      const { on, tasks } = captureTaskRegistration()
      registerScenarioTasks(on as never)
      expect(typeof tasks['gitScenario:spinUp']).toBe('function')
      expect(typeof tasks['gitScenario:cleanup']).toBe('function')
      expect(typeof tasks['gitScenario:cleanupAll']).toBe('function')
    })

    it('respects a custom prefix', () => {
      const { on, tasks } = captureTaskRegistration()
      registerScenarioTasks(on as never, { prefix: 'myGit' })
      expect(typeof tasks['myGit:spinUp']).toBe('function')
      expect(typeof tasks['myGit:cleanup']).toBe('function')
      expect(typeof tasks['myGit:cleanupAll']).toBe('function')
    })
  })

  describe('task behavior', () => {
    let tasks: TaskMap

    beforeAll(() => {
      const { on, tasks: t } = captureTaskRegistration()
      registerScenarioTasks(on as never)
      tasks = t
    })

    afterEach(async () => {
      await tasks['gitScenario:cleanupAll'](undefined)
    })

    it('spinUp returns { path } for a known scenario', async () => {
      const result = await tasks['gitScenario:spinUp']({ name: 'empty-repo' })
      expect(result).toMatchObject({ path: expect.any(String) })
    }, 30_000)

    it('cleanup removes the repo from disk and returns null', async () => {
      const spinResult = await tasks['gitScenario:spinUp']({ name: 'empty-repo' }) as { path: string }
      const cleanupResult = await tasks['gitScenario:cleanup']({ path: spinResult.path })
      expect(cleanupResult).toBeNull()
      expect(existsSync(spinResult.path)).toBe(false)
    }, 30_000)

    it('cleanupAll drains all active repos from disk', async () => {
      const r1 = await tasks['gitScenario:spinUp']({ name: 'empty-repo' }) as { path: string }
      const r2 = await tasks['gitScenario:spinUp']({ name: 'empty-repo' }) as { path: string }

      await tasks['gitScenario:cleanupAll'](undefined)

      expect(existsSync(r1.path)).toBe(false)
      expect(existsSync(r2.path)).toBe(false)
    }, 30_000)

    it('cleanup of an unknown path is a safe no-op returning null', async () => {
      const result = await tasks['gitScenario:cleanup']({ path: '/non/existent/path' })
      expect(result).toBeNull()
    })

    it('spinUp throws on an unknown scenario name', async () => {
      await expect(
        tasks['gitScenario:spinUp']({ name: 'totally-fake-xyz' }),
      ).rejects.toThrow(/Unknown scenario/)
    })

    it('spinUp applies the remote option as an origin remote', async () => {
      const result = await tasks['gitScenario:spinUp']({
        name: 'empty-repo',
        options: { remote: 'https://github.com/example/repo.git' },
      }) as { path: string }

      const git = simpleGit(result.path)
      const remotes = await git.getRemotes(true)
      const origin = remotes.find((r) => r.name === 'origin')
      expect(origin).toBeDefined()
      expect(origin!.refs.fetch).toBe('https://github.com/example/repo.git')
    }, 30_000)
  })
})
