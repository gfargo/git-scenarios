import { readdir } from 'fs/promises'
import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { emptyRepoScenario } from './empty-repo'

describe('empty-repo scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await emptyRepoScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('has HEAD unborn (no commits)', async () => {
    // `git log` on an unborn HEAD fails. simple-git surfaces that as a
    // rejected promise; treating that as "no commits" is the test.
    await expect(repo.git.log()).rejects.toBeTruthy()
  })

  it('has main as the current branch', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
  })

  it('has an empty working tree (no tracked, untracked, or staged files)', async () => {
    const status = await repo.git.status()
    expect(status.isClean()).toBe(true)
    expect(status.not_added).toHaveLength(0)
    expect(status.staged).toHaveLength(0)
    expect(status.modified).toHaveLength(0)
  })

  it('has no files in the working directory (only the .git directory)', async () => {
    const entries = await readdir(repo.path)
    expect(entries).toEqual(['.git'])
  })

  it('has no remotes configured', async () => {
    const remotes = await repo.git.getRemotes()
    expect(remotes).toEqual([])
  })

  it('has no tags', async () => {
    const tags = await repo.git.tags()
    expect(tags.all).toEqual([])
  })

  it('has no stashes', async () => {
    const stashList = await repo.git.stashList()
    expect(stashList.all).toEqual([])
  })
})
