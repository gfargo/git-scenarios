---
title: Contributing
description: How to contribute atoms, scenarios, and improvements.
---

See the full [CONTRIBUTING.md](https://github.com/gfargo/git-scenarios/blob/main/CONTRIBUTING.md) on GitHub for the complete guide. Here's the quick version:

## Adding an atom

1. Create `src/atoms/<name>.ts`
2. Export a function that returns `Step`
3. Add JSDoc with usage examples
4. Export from `src/atoms/index.ts`
5. Re-export from `src/index.ts`
6. Add tests

## Adding a scenario

1. Create `src/scenarios/<kebab-name>.ts` using `defineScenario`
   (copy `templates/scenario.template.ts` from the repo root as your starting point)
2. Create `src/scenarios/<kebab-name>.test.ts` verifying all contracts
   (copy `templates/scenario.test.template.ts` as your starting point)
3. Register in `src/scenarios/index.ts`
4. Re-export from `src/index.ts`
5. **Regenerate the website data**: run `npm run build && cd www && npm run gen:scenarios`, then commit `www/src/data/scenarios.json`

### Determinism requirement

Every scenario must be **byte-identical across runs** — this is the library's headline guarantee, enforced by the property test in `src/__tests__/determinism.properties.test.ts`, which runs *all* registered scenarios. Your scenario will be caught if it drifts. To stay deterministic:

- **Never** use wall-clock time (`new Date()`) or `Math.random()` in setup.
- Let the atoms handle commit dates. `commitAll`, `commit`, `addCommit`, `bulkCommits`, and the operation atoms pin a deterministic author/committer date from the monotonic commit clock (`src/commitClock.ts`) automatically. Use `daysAgo(n)` or an explicit `date` only when a scenario needs a *specific* timeline.
- Use `seededFiles({ seed, files })` for generated file content, never random data.
- If you shell out to git directly (rare), set `GIT_AUTHOR_DATE` / `GIT_COMMITTER_DATE` yourself — see how the scoped atoms do it in `src/atoms/scopes.ts`.

See [Architecture → Determinism](/docs/architecture#determinism) for the full rationale.

## Running locally

```bash
git clone https://github.com/gfargo/git-scenarios.git
cd git-scenarios
npm install
npm test          # run all tests
npm run build     # compile with tsup
npm run lint      # eslint
```

## PR checklist

- [ ] New atoms have JSDoc with examples
- [ ] New scenarios have co-located tests verifying every contract
- [ ] New scenarios are deterministic (no wall-clock / random; determinism property test passes)
- [ ] `www/src/data/scenarios.json` regenerated and committed (`npm run build && cd www && npm run gen:scenarios`)
- [ ] Exports added to barrel files
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] CHANGELOG.md updated
