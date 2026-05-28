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
