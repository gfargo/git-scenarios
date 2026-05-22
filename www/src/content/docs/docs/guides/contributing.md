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
2. Create `src/scenarios/<kebab-name>.test.ts` verifying all contracts
3. Register in `src/scenarios/index.ts`
4. Re-export from `src/index.ts`

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
- [ ] New scenarios have co-located tests
- [ ] Exports added to barrel files
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] CHANGELOG.md updated
