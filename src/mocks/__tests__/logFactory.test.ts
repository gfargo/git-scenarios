import { mockLogResult, mockLog } from '../logFactory'
import { deterministicHash, deterministicDate, DEFAULT_AUTHOR } from '../defaults'

describe('mockLogResult', () => {
  describe('defaults (no arguments)', () => {
    it('returns an empty log when called with no arguments', () => {
      const log = mockLogResult()
      expect(log.all).toEqual([])
      expect(log.latest).toBeNull()
      expect(log.total).toBe(0)
    })

    it('returns an empty log when called with empty options', () => {
      const log = mockLogResult({})
      expect(log.all).toEqual([])
      expect(log.latest).toBeNull()
      expect(log.total).toBe(0)
    })
  })

  describe('count generation', () => {
    it('generates the specified number of commit entries', () => {
      const log = mockLogResult({ count: 5 })
      expect(log.all).toHaveLength(5)
      expect(log.total).toBe(5)
    })

    it('generates zero entries for count: 0', () => {
      const log = mockLogResult({ count: 0 })
      expect(log.all).toHaveLength(0)
      expect(log.latest).toBeNull()
      expect(log.total).toBe(0)
    })

    it('generates entries with sequential 1-indexed messages', () => {
      const log = mockLogResult({ count: 3 })
      expect(log.all[0].message).toBe('commit 1')
      expect(log.all[1].message).toBe('commit 2')
      expect(log.all[2].message).toBe('commit 3')
    })
  })

  describe('deterministic hashes', () => {
    it('produces sequential hashes based on index', () => {
      const log = mockLogResult({ count: 3 })
      expect(log.all[0].hash).toBe(deterministicHash(0))
      expect(log.all[1].hash).toBe(deterministicHash(1))
      expect(log.all[2].hash).toBe(deterministicHash(2))
    })

    it('produces unique 40-character hex hashes', () => {
      const log = mockLogResult({ count: 10 })
      const hashes = log.all.map((e) => e.hash)
      const unique = new Set(hashes)
      expect(unique.size).toBe(10)
      for (const hash of hashes) {
        expect(hash).toHaveLength(40)
        expect(hash).toMatch(/^[0-9a-f]{40}$/)
      }
    })
  })

  describe('deterministic dates', () => {
    it('generates dates decrementing by 1 hour per entry', () => {
      const log = mockLogResult({ count: 3 })
      expect(log.all[0].date).toBe(deterministicDate(0))
      expect(log.all[1].date).toBe(deterministicDate(1))
      expect(log.all[2].date).toBe(deterministicDate(2))
    })

    it('respects custom startDate', () => {
      const start = '2025-06-15T18:00:00.000Z'
      const log = mockLogResult({ count: 2, startDate: start })
      expect(log.all[0].date).toBe(deterministicDate(0, start))
      expect(log.all[1].date).toBe(deterministicDate(1, start))
    })

    it('entries are ordered newest-first (index 0 is most recent)', () => {
      const log = mockLogResult({ count: 5 })
      for (let i = 1; i < log.all.length; i++) {
        const newer = new Date(log.all[i - 1].date).getTime()
        const older = new Date(log.all[i].date).getTime()
        expect(newer).toBeGreaterThan(older)
      }
    })
  })

  describe('default author', () => {
    it('uses DEFAULT_AUTHOR for all generated entries', () => {
      const log = mockLogResult({ count: 3 })
      for (const entry of log.all) {
        expect(entry.author_name).toBe(DEFAULT_AUTHOR.name)
        expect(entry.author_email).toBe(DEFAULT_AUTHOR.email)
      }
    })
  })

  describe('partial overrides (commits array)', () => {
    it('uses overrides for specified fields', () => {
      const log = mockLogResult({
        commits: [
          { message: 'feat: custom message', hash: 'abcd'.repeat(10) },
          { author_name: 'Jane Doe' },
        ],
      })
      expect(log.all[0].message).toBe('feat: custom message')
      expect(log.all[0].hash).toBe('abcd'.repeat(10))
      expect(log.all[1].author_name).toBe('Jane Doe')
    })

    it('fills missing fields with deterministic defaults', () => {
      const log = mockLogResult({
        commits: [{ message: 'custom' }],
      })
      expect(log.all[0].message).toBe('custom')
      expect(log.all[0].hash).toBe(deterministicHash(0))
      expect(log.all[0].date).toBe(deterministicDate(0))
      expect(log.all[0].author_name).toBe(DEFAULT_AUTHOR.name)
      expect(log.all[0].author_email).toBe(DEFAULT_AUTHOR.email)
      expect(log.all[0].refs).toBe('')
      expect(log.all[0].body).toBe('')
    })

    it('uses commits.length as entry count when count is not provided', () => {
      const log = mockLogResult({
        commits: [{}, {}, {}],
      })
      expect(log.all).toHaveLength(3)
      expect(log.total).toBe(3)
    })

    it('generates extra default entries when count exceeds commits length', () => {
      const log = mockLogResult({
        count: 4,
        commits: [{ message: 'first' }],
      })
      expect(log.all).toHaveLength(4)
      expect(log.all[0].message).toBe('first')
      expect(log.all[1].message).toBe('commit 2')
      expect(log.all[2].message).toBe('commit 3')
      expect(log.all[3].message).toBe('commit 4')
    })
  })

  describe('latest / total invariants', () => {
    it('latest references the first entry in all', () => {
      const log = mockLogResult({ count: 3 })
      expect(log.latest).toBe(log.all[0])
    })

    it('latest is null for empty log', () => {
      const log = mockLogResult()
      expect(log.latest).toBeNull()
    })

    it('total equals all.length', () => {
      const log = mockLogResult({ count: 7 })
      expect(log.total).toBe(log.all.length)
    })
  })

  describe('complete entry shape', () => {
    it('each entry has all DefaultLogFields', () => {
      const log = mockLogResult({ count: 1 })
      const entry = log.all[0]
      expect(entry).toHaveProperty('hash')
      expect(entry).toHaveProperty('date')
      expect(entry).toHaveProperty('message')
      expect(entry).toHaveProperty('refs')
      expect(entry).toHaveProperty('body')
      expect(entry).toHaveProperty('author_name')
      expect(entry).toHaveProperty('author_email')
    })
  })
})

describe('LogBuilder', () => {
  it('starts with an empty log', () => {
    const log = mockLog().build()
    expect(log.all).toEqual([])
    expect(log.latest).toBeNull()
    expect(log.total).toBe(0)
  })

  it('adds commits incrementally via .commit()', () => {
    const log = mockLog()
      .commit({ message: 'feat: add auth' })
      .commit({ message: 'chore: initial commit' })
      .build()

    expect(log.all).toHaveLength(2)
    expect(log.all[0].message).toBe('feat: add auth')
    expect(log.all[1].message).toBe('chore: initial commit')
  })

  it('fills deterministic defaults for unspecified fields', () => {
    const log = mockLog().commit().commit().build()

    expect(log.all[0].hash).toBe(deterministicHash(0))
    expect(log.all[0].date).toBe(deterministicDate(0))
    expect(log.all[0].message).toBe('commit 1')
    expect(log.all[1].hash).toBe(deterministicHash(1))
    expect(log.all[1].date).toBe(deterministicDate(1))
    expect(log.all[1].message).toBe('commit 2')
  })

  it('respects partial overrides per commit', () => {
    const log = mockLog()
      .commit({ hash: 'cafe'.repeat(10) })
      .commit({ author_email: 'custom@test.org' })
      .build()

    expect(log.all[0].hash).toBe('cafe'.repeat(10))
    expect(log.all[0].author_email).toBe(DEFAULT_AUTHOR.email)
    expect(log.all[1].author_email).toBe('custom@test.org')
    expect(log.all[1].hash).toBe(deterministicHash(1))
  })

  it('maintains latest/total invariants', () => {
    const log = mockLog()
      .commit({ message: 'latest' })
      .commit({ message: 'older' })
      .commit({ message: 'oldest' })
      .build()

    expect(log.latest).toBe(log.all[0])
    expect(log.latest?.message).toBe('latest')
    expect(log.total).toBe(log.all.length)
    expect(log.total).toBe(3)
  })

  describe('builder equivalence with functional factory', () => {
    it('produces identical output to mockLogResult with commits array', () => {
      const overrides = [
        { message: 'feat: auth' },
        { message: 'fix: typo' },
        { message: 'chore: init' },
      ]

      const fromFactory = mockLogResult({ commits: overrides })
      const fromBuilder = mockLog()
        .commit(overrides[0])
        .commit(overrides[1])
        .commit(overrides[2])
        .build()

      expect(fromBuilder.all).toEqual(fromFactory.all)
      expect(fromBuilder.latest).toEqual(fromFactory.latest)
      expect(fromBuilder.total).toBe(fromFactory.total)
    })

    it('produces identical output for default entries', () => {
      const fromFactory = mockLogResult({ count: 3 })
      const fromBuilder = mockLog().commit().commit().commit().build()

      expect(fromBuilder.all).toEqual(fromFactory.all)
      expect(fromBuilder.total).toBe(fromFactory.total)
    })
  })

  it('supports custom startDate via .from()', () => {
    const start = '2025-03-01T00:00:00.000Z'
    const log = mockLog()
      .from(start)
      .commit()
      .commit()
      .build()

    expect(log.all[0].date).toBe(deterministicDate(0, start))
    expect(log.all[1].date).toBe(deterministicDate(1, start))
  })
})
