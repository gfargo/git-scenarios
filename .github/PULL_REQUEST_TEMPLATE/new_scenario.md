---
name: New Scenario
about: Add a new built-in scenario to the catalogue
---

## New Scenario: `<kebab-name>`

<!-- Brief description of the repo state this scenario creates. -->

**Kind**: <!-- branch | worktree | operation | history | stash | submodule -->
**Tags**: <!-- e.g., conflict, merge, feature-branch -->

## Contracts

<!--
List the contracts declared in your scenario definition.
These should also appear as `it()` blocks in your co-located test.
-->

- [ ] <!-- e.g., "main has 3 commits" -->
- [ ] <!-- e.g., "feat/x is checked out" -->
- [ ] <!-- e.g., "worktree is clean" -->

## PR Checklist

> All items must be checked before merging. See [CONTRIBUTING.md](../CONTRIBUTING.md) for details.

### Scenario Definition

- [ ] File created at `src/scenarios/<kebab-name>.ts`
- [ ] Uses `defineScenario({...})` with all required fields
- [ ] `name` is kebab-case and unique
- [ ] `kind` is one of: `branch` | `worktree` | `operation` | `history` | `stash` | `submodule`
- [ ] `summary` is a single line
- [ ] `description` explains the state and lists use-cases
- [ ] `contracts` array documents every verifiable post-setup invariant
- [ ] `setup` uses `chain(...)` of atoms — no raw git commands
- [ ] `tags` are provided for filtering

### Determinism

- [ ] No `new Date()`, `Date.now()`, or `Math.random()` in setup
- [ ] Uses the monotonic commit clock (automatic when using `addCommit`)
- [ ] Uses `seededFiles({ seed, files })` for generated file content (if applicable)
- [ ] Determinism property test passes: `npx jest --testPathPattern determinism`

### Registration

- [ ] Imported and added to `allScenarios` in `src/scenarios/index.ts` (correct kind group)
- [ ] Named export added at bottom of `src/scenarios/index.ts`

### Testing

- [ ] Co-located test at `src/scenarios/<kebab-name>.test.ts`
- [ ] One `it()` per contract line
- [ ] `npm test` passes (includes determinism + property tests)

### Website / Data

- [ ] `www/src/data/scenarios.json` regenerated:
  ```bash
  npm run build
  cd www && npm install && npm run gen:scenarios
  ```
- [ ] Updated JSON committed alongside scenario files

### Final Checks

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] No unrelated changes included
