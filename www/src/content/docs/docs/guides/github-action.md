---
title: GitHub Action
description: Materialize a git-scenarios scenario in CI with a single uses step.
---

Use the `gfargo/git-scenarios` composite action to spin up a real git repository
in a known state inside any GitHub Actions workflow — no scripting required.

## Quick start

```yaml
- name: Materialize scenario
  id: scenario
  uses: gfargo/git-scenarios@v1
  with:
    scenario: feature-pr-ready

- name: Run your tool against it
  run: my-git-tool status --repo "${{ steps.scenario.outputs.path }}"
```

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `scenario` | ✅ | — | Name of the scenario to materialize (e.g. `feature-pr-ready`, `mid-merge-conflict`). Run `npx git-scenarios list` for the full catalogue. |
| `path` | | `git-scenario` | Target directory (workspace-relative or absolute). Must not already exist. |
| `remote` | | `''` | URL to register as `origin` (e.g. `git@github.com:org/repo.git`). Omit to leave the repo remote-free. |
| `version` | | `latest` | `@gfargo/git-scenarios` version for the `npx` fallback. Pin this in production workflows. |

## Outputs

| Output | Description |
|---|---|
| `path` | Absolute path to the materialized scenario directory. |

## Example: integration test in CI

```yaml
jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Materialize a mid-merge-conflict repo
        id: repo
        uses: gfargo/git-scenarios@v1
        with:
          scenario: mid-merge-conflict
          path: test-repos/conflict

      - name: Run integration tests
        run: npm test
        env:
          SCENARIO_PATH: ${{ steps.repo.outputs.path }}
```

## Example: multiple scenarios in a matrix

```yaml
jobs:
  matrix-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        scenario:
          - feature-pr-ready
          - mid-merge-conflict
          - single-staged-file
    steps:
      - uses: actions/checkout@v4

      - uses: gfargo/git-scenarios@v1
        id: repo
        with:
          scenario: ${{ matrix.scenario }}

      - run: my-tool --repo "${{ steps.repo.outputs.path }}"
```

## Example: add an origin remote

Some tools only activate gh-specific features when `origin` is set.
Pass any URL — it's stored as-is, no network access occurs:

```yaml
- uses: gfargo/git-scenarios@v1
  id: repo
  with:
    scenario: feature-pr-ready
    remote: git@github.com:org/repo.git
```

## Platform support

The action uses `mv` (via the CLI's `--path` flag) to relocate the scenario
directory, which works reliably on **Linux and macOS** runners.
**Windows** runners are not currently supported.

## Pin the version

For production workflows, pin to a specific release tag to avoid
unexpected changes:

```yaml
uses: gfargo/git-scenarios@v1.1.0
```
