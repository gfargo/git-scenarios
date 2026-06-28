import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { commitsWithNotesScenario } from './commits-with-notes'

describe('commits-with-notes scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await commitsWithNotesScenario.setup(repo)
  }, 30_000)

  afterAll(async () => {
    await repo?.cleanup()
  })

  it('has main checked out with 2 commits', async () => {
    const status = await repo.git.status()
    expect(status.current).toBe('main')
    const log = await repo.git.log()
    expect(log.total).toBe(2)
  })

  it('HEAD~1 has a note in refs/notes/commits containing "Reviewed-by: Alice"', async () => {
    const note = await repo.git.raw(['notes', 'show', 'HEAD~1'])
    expect(note).toContain('Reviewed-by: Alice <alice@example.com>')
  })

  it('HEAD~1 has a note in refs/notes/ci containing "CI: passed"', async () => {
    const note = await repo.git.raw(['notes', '--ref', 'refs/notes/ci', 'show', 'HEAD~1'])
    expect(note).toContain('CI: passed')
  })

  it('HEAD has a note in refs/notes/commits containing "Reviewed-by: Bob" and "Coverage: 92%"', async () => {
    const note = await repo.git.raw(['notes', 'show', 'HEAD'])
    expect(note).toContain('Reviewed-by: Bob <bob@example.com>')
    expect(note).toContain('Coverage: 92%')
  })
})
