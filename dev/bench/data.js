window.BENCHMARK_DATA = {
  "lastUpdate": 1782690867527,
  "repoUrl": "https://github.com/gfargo/git-scenarios",
  "entries": {
    "git-scenarios spin-up benchmarks": [
      {
        "commit": {
          "author": {
            "email": "294710345+gfargo-horizon-agent[bot]@users.noreply.github.com",
            "name": "gfargo-horizon-agent[bot]",
            "username": "gfargo-horizon-agent[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "06bc68eae03fe25e3dbb60f550e1138f6bf4108b",
          "message": "feat(bench): benchmark harness + CI regression tracking (#68)\n\n* feat(bench): add benchmark harness and CI regression tracking\n\nAdds `npm run bench` — a plain ESM harness that measures scenario\nspin-up time for empty-repo, dirty-many-files, and large-repo with\nwarmup discarding, 5 measured iterations per scenario, and median/min\nreporting.  Also writes bench-results.json (customSmallerIsBetter\nformat) consumed by the new CI `bench` job which stores results to\ngh-pages and fails when any scenario regresses more than 50% vs the\nstored baseline.\n\nCloses #41\nPlane: [OSS-72](https://compass.tailb82ead.ts.net:3443/gfargo/browse/OSS-72/)\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>\n\n* fix(ci): initialize gh-pages branch before benchmark-action fetch\n\nbenchmark-action/github-action-benchmark always fetches the gh-pages\nbranch to load historical baseline data, even on PR runs.  On the first\nrun the branch does not yet exist, so the git fetch fails with:\n\n  fatal: couldn't find remote ref gh-pages\n\nAdd a step that creates the branch with an empty data store when it is\nabsent, ensuring the action can always fetch a valid baseline and\nregression tracking starts working from the first push to main.\n\n---------\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>\nCo-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>",
          "timestamp": "2026-06-24T20:56:11Z",
          "tree_id": "7f8b10d710eb2f69d4f3ff0cdc8dc0137dc196cb",
          "url": "https://github.com/gfargo/git-scenarios/commit/06bc68eae03fe25e3dbb60f550e1138f6bf4108b"
        },
        "date": 1782334651455,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 169.72,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 941.3,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7256.52,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "294710345+gfargo-horizon-agent[bot]@users.noreply.github.com",
            "name": "gfargo-horizon-agent[bot]",
            "username": "gfargo-horizon-agent[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "18a31b3528d1758ae61fceb25ee8414ecff04c4f",
          "message": "feat(cli): interactive fuzzy picker for no-args invocation (#74)\n\nWhen git-scenarios is invoked with no arguments in a TTY, open an\ninteractive fuzzy-find picker instead of printing help. The picker\nfilters the scenario catalogue by name/summary/tags as the user types,\nshows a live preview pane, and lets the user choose create/inspect/\ndescribe after selecting a scenario. Non-TTY, CI=true, and\n--no-interactive fall back to the existing printHelp() output so the\nexisting e2e test (\"prints usage when no command given\") stays green.\n\nPure picker logic lives in src/interactive.ts (scoreScenario,\nfilterScenarios, renderPreview) with unit tests in\nsrc/interactive.test.ts. The readline event loop and ANSI rendering\nlive in bin/cli.ts (commandPick + runActionMenu).\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>\nCo-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>",
          "timestamp": "2026-06-25T02:40:37Z",
          "tree_id": "768cb8bb3e101e75e97a64125ce3b64903f5e428",
          "url": "https://github.com/gfargo/git-scenarios/commit/18a31b3528d1758ae61fceb25ee8414ecff04c4f"
        },
        "date": 1782355317558,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 168.02,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 940.32,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7191.6,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "3642037+gfargo@users.noreply.github.com",
            "name": "Griffen Fargo",
            "username": "gfargo"
          },
          "committer": {
            "email": "3642037+gfargo@users.noreply.github.com",
            "name": "Griffen Fargo",
            "username": "gfargo"
          },
          "distinct": true,
          "id": "36349b06b7e97ffcdd19959dabec3135b7710c67",
          "message": "style(www): rework hero headline layout and light theme palette\n\n- Light theme: replace warm manila cream with cool parchment (blue-grey\n  off-white #f5f7f9). Same blueprint aesthetic, less antique shop.\n- Hero headline: replace eyebrow + 01 callout with compact badge pill,\n  tighten vertical rhythm, vertically center content, reduce padding.\n- Fix h2 padding-left leak: global 3.2rem balloon offset was applying\n  to the hero display heading. Added explicit reset.\n- Reorder hero content: badge → heading → lede → install → CTAs.\n- Shorten tagline: 'One line of code' → 'One line' (punchier).",
          "timestamp": "2026-06-25T15:50:12-04:00",
          "tree_id": "dcf1df0fd3d25f38d56c5afb0e38b9712c6032f5",
          "url": "https://github.com/gfargo/git-scenarios/commit/36349b06b7e97ffcdd19959dabec3135b7710c67"
        },
        "date": 1782417104831,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 169.12,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 938.92,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7234.05,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "3642037+gfargo@users.noreply.github.com",
            "name": "Griffen Fargo",
            "username": "gfargo"
          },
          "committer": {
            "email": "3642037+gfargo@users.noreply.github.com",
            "name": "Griffen Fargo",
            "username": "gfargo"
          },
          "distinct": true,
          "id": "0969e40985a925b09ca1e6fe3801a23e10cad718",
          "message": "style(www): rework hero title block with meaningful metadata\n\nReplace decorative engineering-drawing fields (Sheet, Scale, Drawn by,\nDate) with real package info (Version, Output format, Runtime, Peer dep,\nAuthor). Remove MIT license cell to avoid duplicating the footer.",
          "timestamp": "2026-06-25T23:28:22-04:00",
          "tree_id": "d5e9d36eb433bd04fa6bf6b2c33968510792cccf",
          "url": "https://github.com/gfargo/git-scenarios/commit/0969e40985a925b09ca1e6fe3801a23e10cad718"
        },
        "date": 1782444590811,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 169.76,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 945.42,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7210.45,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "294710345+gfargo-horizon-agent[bot]@users.noreply.github.com",
            "name": "gfargo-horizon-agent[bot]",
            "username": "gfargo-horizon-agent[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c86e6c71ee0777f2d4025eefc519550cf5537376",
          "message": "feat(cli): add diff command for side-by-side scenario comparison (#80)\n\nCloses #50\nPlane: [OSS-63](https://compass.tailb82ead.ts.net:3443/gfargo/browse/OSS-63/)\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>\nCo-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>",
          "timestamp": "2026-06-27T15:17:00Z",
          "tree_id": "ddc1cc5a8e232623a9528b9b9a37b243d60566f1",
          "url": "https://github.com/gfargo/git-scenarios/commit/c86e6c71ee0777f2d4025eefc519550cf5537376"
        },
        "date": 1782573504947,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 167.59,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 930.35,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7126.95,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "294710345+gfargo-horizon-agent[bot]@users.noreply.github.com",
            "name": "gfargo-horizon-agent[bot]",
            "username": "gfargo-horizon-agent[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "0e8023f5b7df30de4b134481473baa7e96be1d28",
          "message": "docs(contributing): add scenario template + step-by-step guide and checklist (#81)\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>",
          "timestamp": "2026-06-27T15:17:02Z",
          "tree_id": "5e3183a7d7dcf0bf11b4e1106ac1c83d6aea3817",
          "url": "https://github.com/gfargo/git-scenarios/commit/0e8023f5b7df30de4b134481473baa7e96be1d28"
        },
        "date": 1782573506326,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 167.87,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 934.75,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7150.93,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "294710345+gfargo-horizon-agent[bot]@users.noreply.github.com",
            "name": "gfargo-horizon-agent[bot]",
            "username": "gfargo-horizon-agent[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d363b732991f368dcddaed23d5e3ffd771429baf",
          "message": "feat(adapters): add Playwright fixture and Cypress task adapters (#77)\n\n* feat(adapters): add Playwright fixture and Cypress task adapters\n\nImplements OSS-59: E2E framework adapters so web-based git GUIs and IDE\nextensions can spin up git scenarios inside Playwright and Cypress test suites.\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>\n\n* fix(adapters): apply remote option in Playwright and Cypress adapters\n\nBoth adapters passed options (including `remote`) directly to\n`createTempGitRepo`, which only accepts `autoCleanup`. The `remote`\nfield was silently dropped instead of being applied via\n`repo.git.addRemote('origin', remote)` after scenario setup.\n\nFix mirrors `spinUpScenario.ts`: destructure `remote` out of the\noptions object, pass the remainder to `createTempGitRepo`, then call\n`addRemote` when the field is present.\n\nTests added for both adapters asserting the origin remote is reachable\nafter `spinUp` / the repo fixture resolves.\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>\n\n* chore: revert unrelated devDependency bumps to main versions\n\nReverts @types/jest, ts-jest, and typescript version spec bumps that\nwere not needed for the Playwright/Cypress adapter work. Also restores\nthe bench script that was accidentally removed. Scope now matches only\nthe adapter additions and remote-option fix.\n\n---------\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>\nCo-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>",
          "timestamp": "2026-06-27T15:17:10Z",
          "tree_id": "7cbc2f6a3b48af829a25f68d719772fb1c247bf1",
          "url": "https://github.com/gfargo/git-scenarios/commit/d363b732991f368dcddaed23d5e3ffd771429baf"
        },
        "date": 1782573513838,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 166.2,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 931.97,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7119.19,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "294710345+gfargo-horizon-agent[bot]@users.noreply.github.com",
            "name": "gfargo-horizon-agent[bot]",
            "username": "gfargo-horizon-agent[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "2057a549fa9fd53a05debf0c8306977f96d94ed7",
          "message": "feat(scenarios): add installed-hooks, commits-with-notes, and mixed-tags scenarios (#73)\n\n* feat(scenarios): add installed-hooks, commits-with-notes, and mixed-tags scenarios\n\nThree new deterministic metadata scenarios with co-located contract tests:\n\n- installed-hooks (worktree): pre-commit and commit-msg hooks installed\n  and executable; hooks added after setup commits to avoid blocking setup\n- commits-with-notes (history): two commits with git notes in\n  refs/notes/commits; first commit also annotated in refs/notes/ci\n- mixed-tags (history): lightweight tag (v0.1.0), annotated tag object\n  (v1.0.0), and a tree-pointing tag (tree-snapshot)\n\nAll registered in the scenario index; README and docs updated (35 → 38).\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>\n\n* docs(scenarios): add missing detail sections for commits-with-notes, mixed-tags, installed-hooks\n\nAdd per-scenario detail page entries that were skipped in the initial PR:\n- history.md: commits-with-notes and mixed-tags sections\n- worktree-stash.md: installed-hooks section\n\nEach entry follows the existing concise format: one-line description,\nContracts list, and a usefulness note.\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>\nCo-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>",
          "timestamp": "2026-06-28T16:53:01-07:00",
          "tree_id": "7a2e2be7044a79bf4f47e7a0905c042e4c9ee770",
          "url": "https://github.com/gfargo/git-scenarios/commit/2057a549fa9fd53a05debf0c8306977f96d94ed7"
        },
        "date": 1782690860364,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 166.14,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 930.9,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7054.53,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "294710345+gfargo-horizon-agent[bot]@users.noreply.github.com",
            "name": "gfargo-horizon-agent[bot]",
            "username": "gfargo-horizon-agent[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "f75a5adcb4d14671e8250a2644a325ce762d621a",
          "message": "feat(cache): content-addressed scenario cache via directory copy (#75)\n\n* feat(cache): content-addressed scenario cache via directory copy\n\nAdds a cache layer (`src/scenarioCache.ts`) that materialises each\nscenario once into a template directory keyed by\n`${scenarioName}@${libraryVersion}`, then serves subsequent calls by\ncopying that template rather than replaying every git atom.\n\nChanges:\n- `src/scenarioCache.ts` — new module: `materializeCached()`,\n  `clearScenarioCache()`, `cacheRoot()` with `GIT_SCENARIOS_CACHE_DIR`\n  env override. Atomic rename for concurrent-builder safety.\n- `src/tempGitRepo.ts` — extracts `makeRepoHandle()` helper; exports\n  `wrapRepoAtPath()` so the cache can wrap a copied directory;\n  adds `cache?: boolean` to `CreateTempGitRepoOptions`.\n- `src/spinUpScenario.ts` — routes through `materializeCached()` when\n  `{ cache: true }`.\n- `src/fromScenario.ts` — adds optional leading options object overload\n  (`fromScenario(name, { cache: true }, ...steps)`) while keeping all\n  existing call-sites working.\n- `src/index.ts` — exports `clearScenarioCache`, `cacheRoot`,\n  `FromScenarioOptions`.\n- `bin/cli.ts` (`commandClean`) — also scans `git-scenarios-cache/`\n  for template dirs and surfaces them in the listing with a `(cache)`\n  label.\n- `src/scenarioCache.test.ts` — 14 new tests covering cache miss/hit,\n  hash-identity (including a scenario with real commits), `autoCleanup`,\n  `clearScenarioCache`, `spinUpScenario`/`fromScenario` integration.\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>\n\n* chore: sync package-lock.json version to 1.1.0\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>\n\n* fix(cache): safety gate for worktrees/submodules + restore commit clock on cache hit\n\nTwo bugs addressed:\n\n1. materializeCached() now detects scenarios that cannot be faithfully\n   reproduced by directory copy (linked worktrees with absolute gitdir\n   back-pointers, submodules) and declines the cache for them, falling\n   back to cold replay. Detection checks .git/worktrees/ (non-empty) and\n   .gitmodules (present).\n\n2. The commit-clock counter is now persisted to .git/GIT_SCENARIOS_CLOCK\n   inside the template, then restored for the copied repo. Without this,\n   extra steps applied after a cache hit started the clock at 0 rather\n   than at the post-scenario position, producing different commit hashes\n   than a cold fromScenario() call.\n\nNew exports on commitClock: getCommitClockCount / setCommitClockCount.\n\nTests added:\n- declines to cache multiple-worktrees (no template written, returns cold-replay repo)\n- declines to cache submodule-with-history (same)\n- fromScenario({ cache: true }, extraStep) is hash-identical to cold replay\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>\n\n* fix(cache): avoid double build for uncacheable scenarios; read version from package.json\n\n- buildTemplate now returns the already-built TempGitRepo on the uncacheable path\n  (worktrees / submodules) instead of discarding it and returning false.\n  materializeCached reuses that repo directly, eliminating the second cold replay.\n- LIBRARY_VERSION is no longer a hand-synced literal: scenarioCache.ts reads it\n  from package.json at runtime via readFileSync + __dirname.\n- tsup.config.ts: shims: true added to the library build so __dirname is available\n  in ESM output (the CJS build and jest/ts-jest already have it natively).\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>\nCo-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>",
          "timestamp": "2026-06-28T16:53:05-07:00",
          "tree_id": "0e8c6ae0c7a0e96cb107603bde9b2f1ad32b2ae2",
          "url": "https://github.com/gfargo/git-scenarios/commit/f75a5adcb4d14671e8250a2644a325ce762d621a"
        },
        "date": 1782690867271,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 168.27,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 943.59,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7280.67,
            "unit": "ms"
          }
        ]
      }
    ]
  }
}