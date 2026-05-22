---
title: Introduction
description: What git-scenarios is and why it exists.
---

`@gfargo/git-scenarios` is a TypeScript library for spinning up real git repositories in any state, deterministically. It provides composable "atoms" (small, single-purpose functions) that build git repo states for tests, demos, and tool development.

## Who is this for?

1. **You're writing an integration test.** Use `spinUpScenario()` to start from a deterministic baseline instead of hand-building the same `git init` + `writeFile` + `commitAll` setup every time.

2. **You're hand-testing a git tool** (your own, or someone else's). Use the CLI to materialize a scenario on disk and launch the tool against it in one command.

3. **You're building your own scenario library** for a tool that doesn't fit the curated set. Use the atom layer to compose anything from "single staged file" to "three-way nested submodule mid-rebase."

## Key concepts

### Scenarios

Named, curated repo states. Call `spinUpScenario('mid-merge-conflict')` and you get a real temp git repo in that state. 27 built-in scenarios cover branches, conflicts, stash, worktrees, submodules, and more.

### Atoms

Small, composable functions that each apply one side-effect to a repo. Every atom returns a `Step` — `(repo: TempGitRepo) => Promise<void>`. Compose them with `chain(...)` to build any state.

### The CLI

`npx git-scenarios create <name> --run <command>` materializes a scenario to disk and launches any tool against it. The tightest dev loop for "what does my tool do against state X?"

## Design principles

- **Real git, not mocks.** Every scenario produces a real `.git` directory with real refs, real objects, real worktree state. Your tool runs against it unaltered.
- **Deterministic.** Same setup → byte-identical repo state every run. Tests built on top are deterministic too.
- **Composable.** Atoms compose via `chain(...)`. Scopes nest. Custom helpers are just functions that return `Step`.
- **Tool-agnostic.** The package knows nothing about which downstream tool consumes it. No hardcoded launchers, no framework coupling.

## Origin

Extracted from [coco](https://github.com/gfargo/coco), an AI-powered git CLI/TUI. The scenario library lived as an internal test helper from coco v0.43.0 onward, growing organically as new views shipped. After validating the boundary discipline through months of real usage, it was extracted to a standalone package.
