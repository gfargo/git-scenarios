---
title: Installation
description: How to install and configure git-scenarios.
---

## Install

```bash
npm install --save-dev @gfargo/git-scenarios simple-git
# or
yarn add --dev @gfargo/git-scenarios simple-git
# or
pnpm add --save-dev @gfargo/git-scenarios simple-git
```

`simple-git` is a peer dependency — installed alongside so your project picks the version compatible with both this package and any other simple-git consumer you have.

## Requirements

- **Node.js**: `^22.22.2 || ^24.15.0 || >=26.0.0`
- **Git**: Any modern version (2.25+ recommended for sparse checkout support)

## Module format

The package ships **both CJS and ESM**. Use `import` or `require` — both work:

```ts
// ESM
import { spinUpScenario } from '@gfargo/git-scenarios'

// CJS
const { spinUpScenario } = require('@gfargo/git-scenarios')
```

## Package exports

| Subpath | What it provides |
|---|---|
| `@gfargo/git-scenarios` | Main API: `spinUpScenario`, `fromScenario`, `createTempGitRepo`, all atoms, all scenarios, registry |
| `@gfargo/git-scenarios/atoms` | Atom layer only (tree-shakeable) |
| `@gfargo/git-scenarios/scenarios` | Scenario registry only |
| `@gfargo/git-scenarios/tempGitRepo` | Low-level `createTempGitRepo` only |
| `@gfargo/git-scenarios/jest` | Jest framework adapter (`describeWithScenario`) |
| `@gfargo/git-scenarios/vitest` | Vitest framework adapter (same shape as Jest) |

## TypeScript

The package is TypeScript-first — all public APIs ship with full type declarations and source maps. No additional `@types/` package needed.
