import { mockStatusResult, mockStatus, StatusBuilder } from '../statusFactory'

describe('mockStatusResult (functional factory)', () => {
  it('returns a clean status with no arguments', () => {
    const result = mockStatusResult()

    expect(result.current).toBe('main')
    expect(result.tracking).toBeNull()
    expect(result.ahead).toBe(0)
    expect(result.behind).toBe(0)
    expect(result.detached).toBe(false)
    expect(result.files).toEqual([])
    expect(result.staged).toEqual([])
    expect(result.modified).toEqual([])
    expect(result.not_added).toEqual([])
    expect(result.conflicted).toEqual([])
    expect(result.created).toEqual([])
    expect(result.deleted).toEqual([])
    expect(result.renamed).toEqual([])
    expect(result.isClean()).toBe(true)
  })

  it('accepts partial overrides', () => {
    const result = mockStatusResult({
      current: 'feature/auth',
      tracking: 'origin/feature/auth',
      ahead: 3,
      staged: ['src/auth.ts'],
    })

    expect(result.current).toBe('feature/auth')
    expect(result.tracking).toBe('origin/feature/auth')
    expect(result.ahead).toBe(3)
    expect(result.staged).toEqual(['src/auth.ts'])
    expect(result.isClean()).toBe(false)
  })

  it('populates files array with correct XY codes for staged files', () => {
    const result = mockStatusResult({ staged: ['a.ts'] })

    expect(result.files).toHaveLength(1)
    expect(result.files[0].path).toBe('a.ts')
    expect(result.files[0].index).toBe('M')
    expect(result.files[0].working_dir).toBe(' ')
  })

  it('populates files array with correct XY codes for modified files', () => {
    const result = mockStatusResult({ modified: ['b.ts'] })

    expect(result.files).toHaveLength(1)
    expect(result.files[0].path).toBe('b.ts')
    expect(result.files[0].index).toBe(' ')
    expect(result.files[0].working_dir).toBe('M')
  })

  it('populates files array with correct XY codes for untracked files', () => {
    const result = mockStatusResult({ not_added: ['new.ts'] })

    expect(result.files).toHaveLength(1)
    expect(result.files[0].path).toBe('new.ts')
    expect(result.files[0].index).toBe('?')
    expect(result.files[0].working_dir).toBe('?')
  })

  it('populates files array with correct XY codes for conflicted files', () => {
    const result = mockStatusResult({ conflicted: ['merge.ts'] })

    expect(result.files).toHaveLength(1)
    expect(result.files[0].path).toBe('merge.ts')
    expect(result.files[0].index).toBe('U')
    expect(result.files[0].working_dir).toBe('U')
  })

  it('handles renamed files', () => {
    const result = mockStatusResult({ renamed: [{ from: 'old.ts', to: 'new.ts' }] })

    expect(result.files).toHaveLength(1)
    expect(result.files[0].path).toBe('new.ts')
    expect(result.files[0].index).toBe('R')
    expect(result.renamed).toEqual([{ from: 'old.ts', to: 'new.ts' }])
  })

  it('isClean() returns true only when all arrays are empty', () => {
    expect(mockStatusResult().isClean()).toBe(true)
    expect(mockStatusResult({ staged: ['x'] }).isClean()).toBe(false)
    expect(mockStatusResult({ modified: ['x'] }).isClean()).toBe(false)
    expect(mockStatusResult({ not_added: ['x'] }).isClean()).toBe(false)
    expect(mockStatusResult({ conflicted: ['x'] }).isClean()).toBe(false)
  })
})

describe('StatusBuilder', () => {
  it('returns a StatusBuilder instance from mockStatus()', () => {
    expect(mockStatus()).toBeInstanceOf(StatusBuilder)
  })

  describe('chaining', () => {
    it('supports full method chaining', () => {
      const result = mockStatus()
        .onBranch('develop')
        .tracking('origin/develop')
        .ahead(1)
        .behind(2)
        .staged('a.ts')
        .modified('b.ts')
        .untracked('c.ts')
        .conflicted('d.ts')
        .created('e.ts')
        .deleted('f.ts')
        .renamed('old.ts', 'new.ts')
        .build()

      expect(result.current).toBe('develop')
      expect(result.tracking).toBe('origin/develop')
      expect(result.ahead).toBe(1)
      expect(result.behind).toBe(2)
      expect(result.staged).toContain('a.ts')
      expect(result.modified).toContain('b.ts')
      expect(result.not_added).toContain('c.ts')
      expect(result.conflicted).toContain('d.ts')
      expect(result.created).toContain('e.ts')
      expect(result.deleted).toContain('f.ts')
      expect(result.renamed).toContainEqual({ from: 'old.ts', to: 'new.ts' })
    })

    it('each method returns this for chaining', () => {
      const builder = mockStatus()
      expect(builder.onBranch('x')).toBe(builder)
      expect(builder.tracking('origin/x')).toBe(builder)
      expect(builder.ahead(1)).toBe(builder)
      expect(builder.behind(1)).toBe(builder)
      expect(builder.staged('a')).toBe(builder)
      expect(builder.modified('b')).toBe(builder)
      expect(builder.untracked('c')).toBe(builder)
      expect(builder.conflicted('d')).toBe(builder)
      expect(builder.created('e')).toBe(builder)
      expect(builder.deleted('f')).toBe(builder)
      expect(builder.renamed('g', 'h')).toBe(builder)
    })
  })

  describe('build() output', () => {
    it('produces equivalent output to functional factory for simple cases', () => {
      const functional = mockStatusResult({
        current: 'feature/test',
        tracking: 'origin/feature/test',
        staged: ['src/a.ts'],
        modified: ['src/b.ts'],
        ahead: 2,
      })

      const built = mockStatus()
        .onBranch('feature/test')
        .staged('src/a.ts')
        .modified('src/b.ts')
        .ahead(2)
        .build()

      expect(built.current).toBe(functional.current)
      expect(built.tracking).toBe(functional.tracking)
      expect(built.ahead).toBe(functional.ahead)
      expect(built.staged).toEqual(functional.staged)
      expect(built.modified).toEqual(functional.modified)
      expect(built.files).toHaveLength(functional.files.length)
      expect(built.isClean()).toBe(functional.isClean())
    })

    it('builds clean status by default', () => {
      const result = mockStatus().build()

      expect(result.current).toBe('main')
      expect(result.isClean()).toBe(true)
      expect(result.files).toEqual([])
    })

    it('builds detached HEAD state', () => {
      const result = mockStatus().detached('abc123').build()

      expect(result.current).toBe('abc123')
      expect(result.detached).toBe(true)
      expect(result.tracking).toBeNull()
    })

    it('isClean() is a working method on built result', () => {
      const clean = mockStatus().build()
      expect(typeof clean.isClean).toBe('function')
      expect(clean.isClean()).toBe(true)

      const dirty = mockStatus().staged('x.ts').build()
      expect(typeof dirty.isClean).toBe('function')
      expect(dirty.isClean()).toBe(false)
    })
  })

  describe('multi-bucket path merging', () => {
    it('.staged("x").modified("x") produces single FileStatusResult with index M and working_dir M', () => {
      const result = mockStatus()
        .staged('x.ts')
        .modified('x.ts')
        .build()

      expect(result.files).toHaveLength(1)
      expect(result.files[0].path).toBe('x.ts')
      expect(result.files[0].index).toBe('M')
      expect(result.files[0].working_dir).toBe('M')
    })

    it('.created("y").modified("y") produces single entry with index A and working_dir M', () => {
      const result = mockStatus()
        .created('y.ts')
        .modified('y.ts')
        .build()

      expect(result.files).toHaveLength(1)
      expect(result.files[0].path).toBe('y.ts')
      expect(result.files[0].index).toBe('A')
      expect(result.files[0].working_dir).toBe('M')
    })

    it('path appears in both staged and modified bucket arrays when merged', () => {
      const result = mockStatus()
        .staged('x.ts')
        .modified('x.ts')
        .build()

      expect(result.staged).toContain('x.ts')
      expect(result.modified).toContain('x.ts')
    })
  })

  describe('renamed entries', () => {
    it('.renamed("old.ts", "new.ts") produces entry with index R', () => {
      const result = mockStatus()
        .renamed('old.ts', 'new.ts')
        .build()

      expect(result.files).toHaveLength(1)
      expect(result.files[0].path).toBe('new.ts')
      expect(result.files[0].index).toBe('R')
      expect(result.renamed).toContainEqual({ from: 'old.ts', to: 'new.ts' })
    })
  })

  describe('variadic paths', () => {
    it('staged() accepts multiple paths', () => {
      const result = mockStatus().staged('a.ts', 'b.ts', 'c.ts').build()

      expect(result.staged).toEqual(['a.ts', 'b.ts', 'c.ts'])
      expect(result.files).toHaveLength(3)
    })

    it('modified() accepts multiple paths', () => {
      const result = mockStatus().modified('x.ts', 'y.ts').build()

      expect(result.modified).toEqual(['x.ts', 'y.ts'])
      expect(result.files).toHaveLength(2)
    })
  })
})
