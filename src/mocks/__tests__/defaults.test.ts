import {
    deterministicHash,
    deterministicDate,
    DEFAULT_AUTHOR,
    DEFAULT_BRANCH,
} from '../defaults'

describe('deterministicHash', () => {
  it('produces a 40-character hex string', () => {
    const hash = deterministicHash(0)
    expect(hash).toHaveLength(40)
    expect(hash).toMatch(/^[0-9a-f]{40}$/)
  })

  it('pads small indices with leading zeros', () => {
    expect(deterministicHash(0)).toBe('0000000000000000000000000000000000000000')
    expect(deterministicHash(1)).toBe('0000000000000000000000000000000000000001')
    expect(deterministicHash(16)).toBe('0000000000000000000000000000000000000010')
  })

  it('handles larger indices correctly', () => {
    expect(deterministicHash(255)).toBe('00000000000000000000000000000000000000ff')
    expect(deterministicHash(4096)).toBe('0000000000000000000000000000000000001000')
  })

  it('produces unique hashes for different indices', () => {
    const hashes = Array.from({ length: 100 }, (_, i) => deterministicHash(i))
    const uniqueHashes = new Set(hashes)
    expect(uniqueHashes.size).toBe(100)
  })
})

describe('deterministicDate', () => {
  it('returns an ISO 8601 date string', () => {
    const date = deterministicDate(0)
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('uses the default epoch for index 0', () => {
    expect(deterministicDate(0)).toBe('2024-01-01T12:00:00.000Z')
  })

  it('decrements by 1 hour per index', () => {
    expect(deterministicDate(0)).toBe('2024-01-01T12:00:00.000Z')
    expect(deterministicDate(1)).toBe('2024-01-01T11:00:00.000Z')
    expect(deterministicDate(2)).toBe('2024-01-01T10:00:00.000Z')
    expect(deterministicDate(12)).toBe('2024-01-01T00:00:00.000Z')
    expect(deterministicDate(13)).toBe('2023-12-31T23:00:00.000Z')
  })

  it('accepts a custom startDate', () => {
    const start = '2025-06-15T18:00:00.000Z'
    expect(deterministicDate(0, start)).toBe('2025-06-15T18:00:00.000Z')
    expect(deterministicDate(1, start)).toBe('2025-06-15T17:00:00.000Z')
    expect(deterministicDate(3, start)).toBe('2025-06-15T15:00:00.000Z')
  })

  it('produces older dates for higher indices', () => {
    const dates = Array.from({ length: 5 }, (_, i) => new Date(deterministicDate(i)).getTime())
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeLessThan(dates[i - 1])
    }
  })
})

describe('DEFAULT_AUTHOR', () => {
  it('has the expected name and email', () => {
    expect(DEFAULT_AUTHOR.name).toBe('Test Author')
    expect(DEFAULT_AUTHOR.email).toBe('test@example.com')
  })
})

describe('DEFAULT_BRANCH', () => {
  it('is "main"', () => {
    expect(DEFAULT_BRANCH).toBe('main')
  })
})
