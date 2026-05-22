import { mkdir, mkdtemp, rm, writeFile as writeFileContent } from 'fs/promises'
import { rmSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { simpleGit, SimpleGit } from 'simple-git'

export type TempGitRepo = {
  path: string
  git: SimpleGit
  writeFile: (filePath: string, content: string) => Promise<void>
  commitAll: (message: string) => Promise<void>
  cleanup: () => Promise<void>
}

export type CreateTempGitRepoOptions = {
  /**
   * When true, the repo is automatically cleaned up when the process
   * exits (via a `beforeExit` hook). This is a safety net — you should
   * still call `cleanup()` explicitly in test teardown, but this
   * catches cases where a test crashes or forgets to clean up.
   *
   * Default: false (backward-compatible — repos persist until
   * explicitly cleaned up or removed via `git-scenarios clean`).
   */
  autoCleanup?: boolean
}

/**
 * Tracks repos registered for auto-cleanup. The process-exit hook
 * iterates this set and removes any that haven't been cleaned up yet.
 */
const autoCleanupPaths = new Set<string>()
let exitHookRegistered = false

function registerExitHook(): void {
  if (exitHookRegistered) return
  exitHookRegistered = true

  process.on('exit', () => {
    // Synchronous cleanup on exit — async won't complete in 'exit' handler
    for (const p of autoCleanupPaths) {
      try {
        rmSync(p, { recursive: true, force: true })
      } catch {
        // Best effort — don't crash the exit
      }
    }
  })
}

export async function createTempGitRepo(
  options: CreateTempGitRepoOptions = {},
): Promise<TempGitRepo> {
  const path = await mkdtemp(join(tmpdir(), 'coco-git-test-'))
  const git = simpleGit(path)

  await git.init()
  await git.addConfig('user.name', 'Coco Test')
  await git.addConfig('user.email', 'coco@example.com')
  await git.addConfig('commit.gpgsign', 'false')
  await git.raw(['checkout', '-b', 'main'])

  if (options.autoCleanup) {
    autoCleanupPaths.add(path)
    registerExitHook()
  }

  const writeFile = async (filePath: string, content: string) => {
    const absolutePath = join(path, filePath)
    await mkdir(dirname(absolutePath), { recursive: true })
    await writeFileContent(absolutePath, content)
  }

  return {
    path,
    git,
    writeFile,
    commitAll: async (message: string) => {
      await git.add('.')
      await git.commit(message)
    },
    cleanup: async () => {
      autoCleanupPaths.delete(path)
      await rm(path, { recursive: true, force: true })
    },
  }
}
