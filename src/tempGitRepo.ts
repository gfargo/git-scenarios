import { access, mkdir, mkdtemp, readFile as readFileFs, rm, writeFile as writeFileContent } from 'fs/promises'
import { constants, rmSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { simpleGit, SimpleGit } from 'simple-git'

import { nextCommitDate, resetCommitClock } from './commitClock'
import { snapshotRepo, type RepoSnapshot } from './snapshot'

/**
 * Handle returned by `createTempGitRepo` and every scenario factory.
 *
 * Tests get a real on-disk git repo plus a few convenience helpers.
 * The repo is fully owned by the caller — call `cleanup()` in test
 * teardown to remove it, or set `autoCleanup: true` for a process-exit
 * safety net.
 */
export type TempGitRepo = {
  /** Absolute path to the temp directory containing the repo. */
  path: string
  /** Pre-configured `simple-git` instance bound to `path`. */
  git: SimpleGit
  /**
   * Write `content` to a path relative to the repo root. Parent
   * directories are created as needed. Does NOT stage.
   */
  writeFile: (filePath: string, content: string) => Promise<void>
  /**
   * Read a file's content (utf-8) from a path relative to the repo
   * root. Throws if the file doesn't exist.
   */
  readFile: (filePath: string) => Promise<string>
  /**
   * Test whether a path exists in the repo (relative to the repo
   * root). Returns `true` for files and directories alike.
   */
  exists: (filePath: string) => Promise<boolean>
  /** `git add . && git commit -m <message>` in one call. */
  commitAll: (message: string) => Promise<void>
  /**
   * Capture a structured snapshot of the repo's current state — HEAD,
   * branches, working-tree status, in-progress operation, conflicts,
   * stashes, and the commit graph. Read-only. The programmatic
   * counterpart to the `git-scenarios inspect` CLI command.
   */
  snapshot: () => Promise<RepoSnapshot>
  /**
   * Remove the temp directory. Safe to call multiple times — the
   * second call is a no-op. `cleanup` also removes the repo from the
   * autoCleanup tracker so the process-exit hook doesn't double-free.
   */
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

const DEFAULT_USER_NAME = 'Git Scenarios Test'
const DEFAULT_USER_EMAIL = 'test@git-scenarios.dev'

/**
 * Create a fresh temporary git repository.
 *
 * The repo is initialized with:
 * - Branch: `main`
 * - Identity: `Git Scenarios Test <test@git-scenarios.dev>`
 * - GPG signing: disabled (`commit.gpgsign=false`)
 *
 * @param options - Configuration options
 * @returns A TempGitRepo handle with path, git instance, and helpers
 */
export async function createTempGitRepo(
  options: CreateTempGitRepoOptions = {},
): Promise<TempGitRepo> {
  const TEMP_PREFIX = 'git-scenarios-'
  const path = await mkdtemp(join(tmpdir(), TEMP_PREFIX))
  const git = simpleGit(path)

  await git.init()
  await git.addConfig('user.name', DEFAULT_USER_NAME)
  await git.addConfig('user.email', DEFAULT_USER_EMAIL)
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

  const readFile = async (filePath: string) => {
    return readFileFs(join(path, filePath), 'utf8')
  }

  const exists = async (filePath: string): Promise<boolean> => {
    try {
      await access(join(path, filePath), constants.F_OK)
      return true
    } catch {
      return false
    }
  }

  return {
    path,
    git,
    writeFile,
    readFile,
    exists,
    commitAll: async (message: string) => {
      await git.add('.')
      // Deterministic date so the commit hash is reproducible. An
      // explicit-date path isn't offered here — callers that need to
      // pin a date use the `commit`/`addCommit` atoms.
      const date = nextCommitDate(path)
      await git.env({ GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }).commit(message)
    },
    snapshot: () => snapshotRepo(git, path),
    cleanup: async () => {
      autoCleanupPaths.delete(path)
      resetCommitClock(path)
      await rm(path, { recursive: true, force: true })
    },
  }
}
