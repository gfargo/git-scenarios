import { InvalidArgumentError } from '../errors'
import type { TempGitRepo } from '../tempGitRepo'

/**
 * Assert that the repo has at least one commit.
 * Throws InvalidArgumentError if HEAD is unborn.
 */
export async function requireCommits(
  repo: TempGitRepo,
  atomName: string,
): Promise<void> {
  try {
    await repo.git.log(['--oneline', '-1'])
  } catch {
    throw new InvalidArgumentError({
      parameterName: 'repo',
      constraint: 'Repository must have at least one commit',
      atomName,
    })
  }
}

/**
 * Assert that something is staged in the index.
 * Throws InvalidArgumentError if the index has no staged changes,
 * whether HEAD is unborn or the tree is clean after prior commits.
 */
export async function requireStaged(repo: TempGitRepo, atomName: string): Promise<void> {
  const staged = (await repo.git.raw(['diff', '--cached', '--name-only'])).trim()
  if (staged.length === 0) {
    throw new InvalidArgumentError({
      parameterName: 'repo',
      constraint:
        'Nothing is staged to commit — stage changes first (stageFiles) or use emptyCommit() for an intentional empty commit',
      atomName,
    })
  }
}
