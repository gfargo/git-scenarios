# Mutation Testing — git-scenarios core

Stryker mutation testing is scoped to the deterministic core of the library.

## How to run

```bash
npm run test:mutation
```

Reports land in `reports/mutation/` (HTML) and the terminal (clear-text summary).

## Scope

| File | Rationale |
|---|---|
| `src/commitClock.ts` | Pure determinism heart (`nextCommitDate`, `resetCommitClock`). Covered by `determinism.properties.test.ts` and `determinism.test.ts`. |
| `src/capture.ts` | Pure render/parse functions (`renderScenarioModule`, `deriveContracts`, `normalizeName`, `parseCommits`). Directly unit-tested by `src/capture.test.ts`. |
| `src/atoms/seededFiles.ts` | Deterministic content generation. Covered by Property 10 in the property test suite. |
| `src/atoms/chain.ts` | Pure chain-building logic. |

**Why not all atoms?** Most atoms shell out to `git` with 30 s timeouts. Mutating
all of them would produce thousands of mutants and multi-hour CI runs. Full-atoms
coverage is a future follow-up once the pipeline matures.

## Thresholds

| Level | Score |
|---|---|
| `high` | ≥ 80 % |
| `low` | ≥ 60 % |
| `break` | *(not set — informational baseline)* |

`break` is intentionally `null` for the initial landing. Once the score is stable
over several runs, set it to match the `low` threshold and remove
`continue-on-error: true` from the `mutation` CI job.

## CI job

The `mutation` job in `.github/workflows/ci.yml` is **informational / non-blocking**
(`continue-on-error: true`). It uploads the HTML report as a GitHub Actions artifact
(`mutation-report`, 30-day retention).

## Baseline

*(To be filled in after the first successful CI run — paste the clear-text
summary from Stryker here and record the mutation score.)*
