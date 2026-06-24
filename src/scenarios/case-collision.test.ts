import { createTempGitRepo, type TempGitRepo } from '../tempGitRepo'
import { caseCollisionScenario } from './case-collision'

describe('case-collision scenario', () => {
  let repo: TempGitRepo

  beforeAll(async () => {
    repo = await createTempGitRepo()
    await caseCollisionScenario.setup(repo)
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

  it('records src/File.ts (PascalCase) in HEAD tree', async () => {
    const lsTree = await repo.git.raw(['ls-tree', '-r', 'HEAD'])
    expect(lsTree).toContain('src/File.ts')
  })

  it('records src/file.ts (lowercase) in HEAD tree', async () => {
    const lsTree = await repo.git.raw(['ls-tree', '-r', 'HEAD'])
    expect(lsTree).toContain('src/file.ts')
  })

  it('exposes both case variants as distinct blobs via git plumbing', async () => {
    const upper = await repo.git.raw(['show', 'HEAD:src/File.ts'])
    const lower = await repo.git.raw(['show', 'HEAD:src/file.ts'])
    expect(upper).toContain('File')
    expect(lower).toContain('file')
    // Confirm they are truly distinct objects with different content
    expect(upper).not.toBe(lower)
  })

  it('has both case-variant paths absent from the working tree', async () => {
    const deleted = await repo.git.raw(['ls-files', '--deleted'])
    const lines = deleted.trim().split('\n').filter(Boolean)
    expect(lines).toContain('src/File.ts')
    expect(lines).toContain('src/file.ts')
  })

  it('has core.ignoreCase set to false', async () => {
    const value = (await repo.git.raw(['config', '--get', 'core.ignoreCase'])).trim()
    expect(value).toBe('false')
  })
})
