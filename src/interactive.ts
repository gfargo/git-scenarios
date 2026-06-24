import type { Scenario } from './scenarios/types'

/**
 * Subsequence fuzzy score for a scenario against a query string.
 * Searches across name, summary, and tags concatenated.
 * Returns -1 if no match, otherwise a positive integer (higher = better).
 * Consecutive character matches score higher than scattered ones.
 */
export function scoreScenario(query: string, s: Scenario): number {
  if (!query) return 0
  const haystack = [s.name, s.summary, ...(s.tags ?? [])].join(' ').toLowerCase()
  const needle = query.toLowerCase()
  let score = 0
  let pos = 0
  for (const ch of needle) {
    const idx = haystack.indexOf(ch, pos)
    if (idx === -1) return -1
    score += idx === pos ? 2 : 1
    pos = idx + 1
  }
  return score
}

/**
 * Filter and rank scenarios by query. Empty query returns all scenarios
 * in original order.
 */
export function filterScenarios(query: string, scenarios: readonly Scenario[]): Scenario[] {
  if (!query) return [...scenarios]
  return scenarios
    .map((s) => ({ s, score: scoreScenario(query, s) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(({ s }) => s)
}

/**
 * Render a static text preview of a scenario (name, kind, summary,
 * optional tags, and contracts) for the picker's preview pane.
 */
export function renderPreview(s: Scenario): string {
  const lines: string[] = [
    `  ${s.name}  ·  ${s.kind}`,
    `  ${'-'.repeat(s.name.length + s.kind.length + 5)}`,
    `  ${s.summary}`,
  ]
  if (s.tags && s.tags.length > 0) {
    lines.push(`  Tags: ${s.tags.join(', ')}`)
  }
  if (s.contracts && s.contracts.length > 0) {
    lines.push('', '  Contracts:')
    for (const c of s.contracts) {
      lines.push(`    - ${c}`)
    }
  }
  return lines.join('\n')
}
