window.BENCHMARK_DATA = {
  "lastUpdate": 1784854033459,
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
          "id": "12158b6fde49615e81f1a96195ebdf2d80856970",
          "message": "feat(cli): add doctor command for environment health checks (#76)\n\nAdds `git-scenarios doctor` that runs pass/warn/fail checks on: git\nversion (≥ 2.25.0), temp-dir writability, leftover scenario dirs, and\noptional git-lfs. Exits non-zero when any hard check fails. Supports\n--json for machine-readable output. Exports parseGitVersion for unit\ntesting and guards main() with require.main === module.\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>\nCo-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>",
          "timestamp": "2026-06-28T17:10:22-07:00",
          "tree_id": "2bd3c472159650911c888d25437f3d66a64e79c0",
          "url": "https://github.com/gfargo/git-scenarios/commit/12158b6fde49615e81f1a96195ebdf2d80856970"
        },
        "date": 1782691907338,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 166.74,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 935.25,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7091.92,
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
          "id": "e2e7fc341b15ace535c51b5e0682b81ef4ddc68d",
          "message": "feat(cli): add completions command and list --names flag (#79)\n\n- Add src/completions.ts with generateCompletion(shell) for bash/zsh/fish\n- Scenario names are resolved dynamically at TAB time via list --names\n- Add commandCompletions to bin/cli.ts; wire into parseArgs, main, printHelp\n- Add --names flag to commandList for newline-separated name output\n- Add src/completions.test.ts (15 unit tests)\n- Add e2e tests to bin/cli.e2e.test.ts (completions + list --names)\n- Update README.md and www CLI guide with install instructions\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>",
          "timestamp": "2026-06-28T17:23:29-07:00",
          "tree_id": "de7b54832d42a42685cc17dc7d678ae0d14e8eb0",
          "url": "https://github.com/gfargo/git-scenarios/commit/e2e7fc341b15ace535c51b5e0682b81ef4ddc68d"
        },
        "date": 1782692695098,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 167.01,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 931.57,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7040.96,
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
          "id": "08e64f363316bb6f3bd2392964d6a31ced4d6832",
          "message": "feat(mcp): MCP server exposing scenarios to AI coding agents (#87)\n\n* feat(mcp): add MCP server exposing scenarios to AI coding agents\n\n- src/mcp.ts: createMcpServer() + runMcpServer() with 6 tools\n  (list_scenarios, describe_scenario, inspect_scenario,\n  materialize_scenario, capture_repo, cleanup_scenario)\n- bin/mcp.ts: thin stdio binary entry point\n- src/mcp.test.ts: 15 tests covering all tools via InMemoryTransport\n- package.json: add ./mcp export, git-scenarios-mcp bin,\n  @modelcontextprotocol/sdk@1.29.0 dependency\n- tsup.config.ts: add mcp library + bin/mcp build entries\n- www/: MCP server docs page + sidebar entry\n\nNew dependency: @modelcontextprotocol/sdk@1.29.0 (required by this feature)\n\n* fix(mcp): use basename check in isTempScenarioPath for macOS /tmp compat\n\n* fix(mcp): use path.basename for cross-platform temp-path + repo-name handling\n\nWindows CI failed because isTempScenarioPath and capture_repo's defaultName\nsplit on a hardcoded '/', so backslash-separated paths never matched. Use\npath.basename (platform-aware) instead.\n\n* fix(mcp): guard capture_repo against non-existent path (Windows)\n\nsimple-git's constructor throws synchronously on a directory that does\nnot exist (Windows has no /tmp), escaping the checkIsRepo try/catch and\nsurfacing a raw non-JSON error. Guard with existsSync first and collapse\nthe redundant double checkIsRepo.\n\n---------\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>\nCo-authored-by: gfargo <ghfargo@gmail.com>",
          "timestamp": "2026-06-28T17:23:34-07:00",
          "tree_id": "063c84c536ef3d9ba4378ffba1ac1948c46147ac",
          "url": "https://github.com/gfargo/git-scenarios/commit/08e64f363316bb6f3bd2392964d6a31ced4d6832"
        },
        "date": 1782692696739,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 167.95,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 935.78,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7169.68,
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
          "id": "4ae24784a60022ac5dcfa2241433edd8258c6cac",
          "message": "feat(ci): add attw + publint package-checks job (#83)\n\nRun @arethetypeswrong/cli and publint against the npm pack tarball in CI\nto catch dual CJS/ESM/types-resolution regressions before publish.\n\nAlso fixes the exports map across all 11 subpath entries to use\ncondition-specific types (require.types → .d.cts, import.types → .d.ts),\nresolving the FalseESM issue both tools detected against the old flat map.\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>\nCo-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>",
          "timestamp": "2026-06-28T17:36:14-07:00",
          "tree_id": "03085c116621802e583ba39da0668e138e869bd5",
          "url": "https://github.com/gfargo/git-scenarios/commit/4ae24784a60022ac5dcfa2241433edd8258c6cac"
        },
        "date": 1782693461950,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 168.51,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 940.02,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7273.23,
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
          "id": "e3a628e552103fcf476646eb6484cf7d0ca6ce25",
          "message": "docs(www): add scenario decision guide and alternatives comparison (#85)\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>",
          "timestamp": "2026-06-28T17:36:18-07:00",
          "tree_id": "0f3890ddd002f57bb4a4cac14d23c71f4e43d956",
          "url": "https://github.com/gfargo/git-scenarios/commit/e3a628e552103fcf476646eb6484cf7d0ca6ce25"
        },
        "date": 1782693462808,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 166.56,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 930.24,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7099.34,
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
          "id": "dcedc7c6f6ef6b0c753e370c01d1aa69a3ffcc78",
          "message": "feat(action): add composite GitHub Action to materialize scenarios in CI (#86)\n\nShips action.yml at repo root so it can be consumed as\nuses: gfargo/git-scenarios@<ref>.\n\n- Inputs: scenario (required), path, remote, version\n- Output: path — absolute path to the materialized repo\n- Wraps existing 'git-scenarios create --path --remote' CLI command\n- Passes inputs through env vars to avoid shell injection\n- Falls back to npx when git-scenarios binary isn't pre-installed\n- Guards against pre-existing target path\n\nAlso adds:\n- .github/workflows/action-test.yml: self-test CI job that packs and\n  installs the local CLI globally then exercises uses: ./ with\n  assertions on branch, git validity, and remote URL\n- www/src/content/docs/docs/guides/github-action.md: docs page\n- README.md: GitHub Action section before The CLI section\n- www/astro.config.mjs: GitHub Action entry in the Guides sidebar\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>",
          "timestamp": "2026-06-28T17:36:58-07:00",
          "tree_id": "4a1cca05b9276070efb3e8a1d78daa0ccbde82c8",
          "url": "https://github.com/gfargo/git-scenarios/commit/dcedc7c6f6ef6b0c753e370c01d1aa69a3ffcc78"
        },
        "date": 1782693499654,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 169.99,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 937.18,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7195.1,
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
          "id": "47632b2ad441f0db3337c0ad5e77e252355ac4f0",
          "message": "feat(www): add per-scenario permalink pages with snippets and git graph (#88)\n\nGenerates a static page at /scenarios/<name> for every entry in\nscenarios.json. Each page shows the scenario's description, contracts,\ntags, branches, three copy-paste snippets (library / CLI / Jest adapter),\nand the captured ASCII git log --graph output. Empty-graph scenarios\n(empty-repo) degrade gracefully with an explanatory message.\n\nScenarioBrowser cards now link scenario names to their permalink for\nshareable entry points. browse.mdx updated with tips and cross-links.\n\nCloses #58\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>\nCo-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>",
          "timestamp": "2026-06-28T17:39:48-07:00",
          "tree_id": "11b25e224bef39f42f10c9447def44ce3218a2c0",
          "url": "https://github.com/gfargo/git-scenarios/commit/47632b2ad441f0db3337c0ad5e77e252355ac4f0"
        },
        "date": 1782693675197,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 167.25,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 941.46,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7211.11,
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
          "id": "01cc423625f5e4d480fc814885758da6a3d92602",
          "message": "feat(www): add in-browser scenario playground with interactive commit graph (#89)\n\nAdds a Playground page to the marketing site that renders each scenario's\ncommit DAG interactively in the browser — no install required.\n\n- www/scripts/generate-scenarios-json.mjs: capture structured `commits`\n  array (hash, parents, refs, subject, author, date) via git log --pretty\n  alongside the existing ASCII graph; add to scenarios.json payload.\n- www/src/lib/graph-layout.mjs: pure computeLanes() function that assigns\n  each commit a horizontal lane and computes parent edges from the\n  date-ordered git log output.\n- www/src/components/ScenarioPlayground.astro: interactive component with\n  a searchable scenario sidebar, kind-filter pills, SVG commit graph\n  (lane-colored circles + bezier edges), commit-detail hover panel, and\n  deep-link support via #scenario=<name> URL hash.\n- www/src/content/docs/docs/scenarios/playground.mdx: new Playground page\n  that renders the component with framing copy.\n- www/astro.config.mjs: add Playground entry to the Scenarios sidebar.\n- www/src/content/docs/docs/scenarios/browse.mdx: cross-link to Playground\n  in See also.\n- www/src/data/scenarios.json: regenerated with commits field (43 scenarios,\n  42 with graphs).\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>\nCo-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>",
          "timestamp": "2026-06-28T17:51:52-07:00",
          "tree_id": "1ec0943a1ea548468359006cb1b0ad18a11dcf7c",
          "url": "https://github.com/gfargo/git-scenarios/commit/01cc423625f5e4d480fc814885758da6a3d92602"
        },
        "date": 1782694397743,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 169.19,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 944.24,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7221.15,
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
          "id": "8618111c55497660e377d958918e3388766113fa",
          "message": "ci: add API surface snapshot + drift gate (#82)\n\n- Add bin/api-report.mjs: loops all 11 published entry points and runs\n  api-extractor programmatically, generating etc/<slug>.api.md per entry\n- Add etc/*.api.md: committed baseline reports for all entry points\n- Add .gitattributes: normalise API report line endings to LF across OSes\n- Add api:update / api:check scripts to package.json\n- Add @microsoft/api-extractor 7.58.9 as pinned devDependency\n- Add API surface check CI step (ubuntu-latest only, after Build)\n\nCI fails when a public export signature changes without the committed\nreport being updated. Run npm run api:update to regenerate.\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>",
          "timestamp": "2026-06-28T17:51:47-07:00",
          "tree_id": "5e12116198edfb021d4515c803248688f9d1996f",
          "url": "https://github.com/gfargo/git-scenarios/commit/8618111c55497660e377d958918e3388766113fa"
        },
        "date": 1782694397105,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 168.55,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 943.26,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7240.84,
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
          "id": "5bd7267ea7cb97d6b00b18bea056f5e421ddec86",
          "message": "feat(test): add Stryker mutation testing on the core (#84)\n\nInstalls @stryker-mutator/core + @stryker-mutator/jest-runner and wires\nmutation testing scoped to the deterministic core: commitClock.ts,\ncapture.ts, atoms/seededFiles.ts, and atoms/chain.ts.\n\n- stryker.config.mjs: Jest runner, perTest coverage analysis, low concurrency\n  (git subprocess contention), generous timeoutMS for shelling tests\n- package.json: test:mutation script + two Stryker devDeps\n- .gitignore: exclude reports/ and .stryker-tmp/\n- ci.yml: non-blocking mutation job (continue-on-error: true) with HTML\n  artifact upload; thresholds.break stays null until baseline is stable\n- MUTATION.md: scope rationale, thresholds, baseline instructions\n\nCloses #63\nPlane: [OSS-50](https://compass.tailb82ead.ts.net:3443/gfargo/browse/OSS-50/)\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>\nCo-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>",
          "timestamp": "2026-06-28T18:04:27-07:00",
          "tree_id": "92775c49c021dec53ad829f239a92316f0e17407",
          "url": "https://github.com/gfargo/git-scenarios/commit/5bd7267ea7cb97d6b00b18bea056f5e421ddec86"
        },
        "date": 1782695155475,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 171.6,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 950.92,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7364.35,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "ghfargo@gmail.com",
            "name": "gfargo",
            "username": "gfargo"
          },
          "committer": {
            "email": "ghfargo@gmail.com",
            "name": "gfargo",
            "username": "gfargo"
          },
          "distinct": true,
          "id": "f2c41b21d32109063d469860a65e9979cce9fdcb",
          "message": "chore(release): 1.2.0\n\nMCP server, doctor, completions, GitHub Action, content-addressed cache,\nmetadata scenarios, attw/publint + API-surface gate + mutation testing,\nand the in-browser playground / permalink pages / decision guide.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>",
          "timestamp": "2026-06-28T21:26:43-04:00",
          "tree_id": "1afaffb716009ee7edb6add08ca2443a2c1e7003",
          "url": "https://github.com/gfargo/git-scenarios/commit/f2c41b21d32109063d469860a65e9979cce9fdcb"
        },
        "date": 1782696491208,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 168.09,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 933.16,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7130.04,
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
          "id": "64bf1a19766397170d0c9c6e66c679b2f6611841",
          "message": "fix(www): update specs strip to show 5 test runner adapters\n\nWas showing '2 (jest · vitest)' but we ship Jest, Vitest, node:test,\nMocha, and AVA adapters since v0.7.0.",
          "timestamp": "2026-06-29T09:47:45-04:00",
          "tree_id": "74fa79021b6f2cffd42a7f798f8124e5db8255a0",
          "url": "https://github.com/gfargo/git-scenarios/commit/64bf1a19766397170d0c9c6e66c679b2f6611841"
        },
        "date": 1782740958375,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 169.85,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 948.58,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7368.84,
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
          "id": "f67c401f42ed46ab3d64599d41df4fd6ff0aff2a",
          "message": "docs(www): audit and fix stale content for v1.1.0\n\n- Fix coco-git-test- → git-scenarios- in DiagramPipeline SVG\n- Update scenario count 32 → 46 across all pages (hero, specs strip,\n  SVG schematic, browse, overview, quick-start, index cards, tip block,\n  playground cross-refs, changelog, ScenarioBrowser comment)\n- Add snapshot() to TempGitRepo type in atoms/overview\n- Remove hardcoded '32' from changelog prose (use 'all' instead)",
          "timestamp": "2026-06-29T09:54:34-04:00",
          "tree_id": "ce5d4dd0974a21d3243fe27b1f4fa51c08a1ce18",
          "url": "https://github.com/gfargo/git-scenarios/commit/f67c401f42ed46ab3d64599d41df4fd6ff0aff2a"
        },
        "date": 1782741368043,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 168.89,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 943.89,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7245.43,
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
          "id": "b5ca9e526ebd64cf5df77d45b0116efb77b83bd6",
          "message": "feat(api): extend drift gate to cover mcp, playwright, and cypress exports (#90)\n\nAdd mcp, playwright, and cypress to the ENTRIES array in bin/api-report.mjs so\nall 14 tsup entry points are tracked by the API-surface gate. Commit the three\ngenerated baselines (etc/mcp.api.md, etc/playwright.api.md, etc/cypress.api.md).\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>\nCo-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>",
          "timestamp": "2026-06-29T09:57:47-04:00",
          "tree_id": "57670e82fd83cc7ec0d11236a43c07782c65cca2",
          "url": "https://github.com/gfargo/git-scenarios/commit/b5ca9e526ebd64cf5df77d45b0116efb77b83bd6"
        },
        "date": 1782741555391,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 170.93,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 951.18,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7224.95,
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
          "id": "20cea6fad2243f0f7e43737def32af5c53b47422",
          "message": "docs(www): update introduction scenario count to 46",
          "timestamp": "2026-06-29T10:00:33-04:00",
          "tree_id": "b0223ef5bbf8b3f86086e29bbefb3d1a8f2e4a7f",
          "url": "https://github.com/gfargo/git-scenarios/commit/20cea6fad2243f0f7e43737def32af5c53b47422"
        },
        "date": 1782741724528,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 166.28,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 929.47,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7077.3,
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
          "id": "bb8386cb93ed0b216c04525d7b9d804eab9174c7",
          "message": "ci: run mutation testing only on main, add job summary + timeout\n\n- Mutation job now only triggers on push to main (not PRs)\n  Saves ~37 min of CI per PR while keeping the data on every merge.\n\n- Added timeout-minutes: 45 to cap runaway jobs\n\n- Added a Summary step that writes mutation results to the GitHub\n  Actions run summary (the Overview tab). This makes the score\n  visible without downloading artifacts — harder to forget about.\n\n- Mutated files and score excerpt appear in the run summary markdown\n  so you see the results at a glance when reviewing the CI run.",
          "timestamp": "2026-06-29T18:26:15-04:00",
          "tree_id": "fd2ed64e819a31058d8ec2c039fbf82dc8e9aceb",
          "url": "https://github.com/gfargo/git-scenarios/commit/bb8386cb93ed0b216c04525d7b9d804eab9174c7"
        },
        "date": 1782772061813,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 161.88,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 994.2,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7408.49,
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
          "id": "17c26b872a95f61c0be8e27cbd5db052338e4e97",
          "message": "test: fix timeout flakes in property tests and scenario cache\n\nProperty tests that create many repos were timing out under full-suite\nload (83 suites competing for I/O). Fixes:\n\n- Property 5+6: reduce from 10 repos to 5, bump timeout 30s → 60s\n- Property 3: bump timeout 60s → 90s (15 runs × repo creation)\n- Property 7: bump timeout 30s → 60s per atom\n- Property 11: reduce from 20 runs to 10, bump timeout 60s → 90s\n- scenarioCache: add explicit 60s timeout for submodule-with-history\n\nThe property confidence is unchanged — 5 repos still validates the\ninvariant; the original 10 was overkill for a deterministic system.",
          "timestamp": "2026-06-29T18:49:44-04:00",
          "tree_id": "7b88d4487e014280383742a55db6f3fbf9d04160",
          "url": "https://github.com/gfargo/git-scenarios/commit/17c26b872a95f61c0be8e27cbd5db052338e4e97"
        },
        "date": 1782773477432,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 171.12,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 950.77,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7459.81,
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
          "id": "b1196288c80abb0be8553a7b7d88b89a66455cf8",
          "message": "docs: update website and README for v1.2.0 features\n\n- Add v1.2.0 changelog entry (MCP server, VS Code extension, cache,\n  doctor/diff commands, new scenarios, Playwright/Cypress adapters)\n- Add VS Code Extension guide page + sidebar entry\n- Update installation.md exports table (mcp, playwright, cypress)\n- Update CLI guide with doctor and diff commands + flags\n- Update jest-adapter guide with Playwright/Cypress sections\n- Fix index.mdx adapter count: 5 → 7\n- Update README status line: v1.1.0→v1.2.0, 35→46 scenarios,\n  5→7 adapters, add MCP/VS Code/diff/doctor mentions\n- Add MCP Server and VS Code Extension sections to README TOC",
          "timestamp": "2026-07-03T09:01:11-04:00",
          "tree_id": "ed6d54b7ca68d295694cdfc5785c59d441a1bc40",
          "url": "https://github.com/gfargo/git-scenarios/commit/b1196288c80abb0be8553a7b7d88b89a66455cf8"
        },
        "date": 1783083762179,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 167.35,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 931.08,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7102.36,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "GhFargo@gmail.com",
            "name": "Griffen Fargo",
            "username": "gfargo"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "942aad292d80652bec62a730eb2d80c0a3b78ff9",
          "message": "feat(vscode): VS Code extension — create scenario from command palette (#91)\n\nfeat(vscode): VS Code extension — create scenario from command palette",
          "timestamp": "2026-07-03T09:21:35-04:00",
          "tree_id": "71ddb6186b4314af6698190675245cc07474d459",
          "url": "https://github.com/gfargo/git-scenarios/commit/942aad292d80652bec62a730eb2d80c0a3b78ff9"
        },
        "date": 1783084979623,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 168.2,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 940.4,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7231.78,
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
          "id": "7ea69e4a8cd0b755af0bcdc729582ef3045e0a08",
          "message": "chore(vscode): remove redundant activationEvents\n\nVS Code auto-generates onCommand activation events from the\ncontributes.commands section — explicit activationEvents are\nunnecessary and trigger a diagnostic warning.",
          "timestamp": "2026-07-03T09:48:47-04:00",
          "tree_id": "943ebc95ab87be7ff63b96ebb021608bc5aec97b",
          "url": "https://github.com/gfargo/git-scenarios/commit/7ea69e4a8cd0b755af0bcdc729582ef3045e0a08"
        },
        "date": 1783086623160,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 169.01,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 943.56,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7211.99,
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
          "id": "4d47576497ce0947ea0214d3659733366c8b07fb",
          "message": "chore(www): regenerate scenarios.json",
          "timestamp": "2026-07-03T09:55:47-04:00",
          "tree_id": "a7dc8c158d22c8a09cb3caabe62b3c2750362d05",
          "url": "https://github.com/gfargo/git-scenarios/commit/4d47576497ce0947ea0214d3659733366c8b07fb"
        },
        "date": 1783087042034,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 168.52,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 942.17,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7213.54,
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
          "id": "9e0a9c32642acaf57e34b45f187f67729c8f1fe2",
          "message": "feat(vscode): prepare extension for Marketplace publishing\n\n- Add publisher, icon, categories, keywords, repository metadata\n- Bundle @gfargo/git-scenarios + simple-git into extension.js (no\n  runtime node_modules needed — lean 90KB VSIX)\n- Move runtime deps to devDependencies (build-time only, bundled)\n- Simplify .vscodeignore (exclude all node_modules since bundled)\n- Suppress harmless import.meta esbuild warning\n- Add LICENSE, icon.png (256x256 from favicon.svg)\n- Add .gitignore for .vsix artifacts\n- Add package/publish npm scripts\n- Version 0.1.0",
          "timestamp": "2026-07-03T10:00:52-04:00",
          "tree_id": "fce2dfaf8d6cc79e220122a00096d0a1e8454016",
          "url": "https://github.com/gfargo/git-scenarios/commit/9e0a9c32642acaf57e34b45f187f67729c8f1fe2"
        },
        "date": 1783087344784,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 171.73,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 951.36,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7355.23,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "GhFargo@gmail.com",
            "name": "Griffen Fargo",
            "username": "gfargo"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "81047f0fe3fe0964699df298e8bc68b01276b163",
          "message": "Merge pull request #92 from gfargo/feat/mock-factory-layer\n\nfeat: add mock factory layer",
          "timestamp": "2026-07-04T22:44:28-04:00",
          "tree_id": "25a4beb7ea93293bf4b1b3f6bdea3e2fa730464a",
          "url": "https://github.com/gfargo/git-scenarios/commit/81047f0fe3fe0964699df298e8bc68b01276b163"
        },
        "date": 1783219558569,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 167.68,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 940.47,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7198.36,
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
          "id": "fd11bef169abd376d4546e9c408349ef9902b29b",
          "message": "ci: add release-please for automated releases",
          "timestamp": "2026-07-05T14:57:13-04:00",
          "tree_id": "e0f28aa2da1d13d477609d7d386ef34a61bf9f4c",
          "url": "https://github.com/gfargo/git-scenarios/commit/fd11bef169abd376d4546e9c408349ef9902b29b"
        },
        "date": 1783277934170,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 166.77,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 1230.53,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 8451.91,
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
          "id": "77c47bf82096f5a02dca5a0dd662125a393815ed",
          "message": "ci: fix release-please tag format (no component prefix)",
          "timestamp": "2026-07-05T16:25:52-04:00",
          "tree_id": "43410b99280bd159c1fdf124ee54a15bff131dad",
          "url": "https://github.com/gfargo/git-scenarios/commit/77c47bf82096f5a02dca5a0dd662125a393815ed"
        },
        "date": 1783283249367,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 166.27,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 932.18,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7193.04,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "GhFargo@gmail.com",
            "name": "Griffen Fargo",
            "username": "gfargo"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "9890413ac69a0b1dcadd5a1b3687e8bea2723ca8",
          "message": "Merge pull request #105 from gfargo/fix/cli-flag-parsing-and-engines-range\n\nfix: CLI flag-before-positional parsing and engines.node range",
          "timestamp": "2026-07-12T15:30:47-04:00",
          "tree_id": "8b53dd7543f533bfa97345e7972eaa49162d7b1c",
          "url": "https://github.com/gfargo/git-scenarios/commit/9890413ac69a0b1dcadd5a1b3687e8bea2723ca8"
        },
        "date": 1783884737349,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 168.83,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 939.85,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7194.38,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "GhFargo@gmail.com",
            "name": "Griffen Fargo",
            "username": "gfargo"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "fcf0777e2a1bddcc54567331b7efb761aa6251b7",
          "message": "Merge pull request #106 from gfargo/release-please--branches--main--components--git-scenarios\n\nchore(main): release 1.3.1",
          "timestamp": "2026-07-12T17:18:41-04:00",
          "tree_id": "14be100f76975353473470835063c55922c61ea9",
          "url": "https://github.com/gfargo/git-scenarios/commit/fcf0777e2a1bddcc54567331b7efb761aa6251b7"
        },
        "date": 1783891208579,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 165.82,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 931.66,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7128.35,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "GhFargo@gmail.com",
            "name": "Griffen Fargo",
            "username": "gfargo"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "04fee137df816969d47cc6e89d81a4bc9b3b3867",
          "message": "Merge pull request #107 from gfargo/fix/low-severity-mock-and-snapshot-bugs\n\nfix: bucket of four low-severity mock/snapshot/docs bugs",
          "timestamp": "2026-07-13T12:12:05-04:00",
          "tree_id": "721d5bc7fc06a9077e01f21bcba753d10f25c1a1",
          "url": "https://github.com/gfargo/git-scenarios/commit/04fee137df816969d47cc6e89d81a4bc9b3b3867"
        },
        "date": 1783959234040,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 164.89,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 1268.77,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 8808.18,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "GhFargo@gmail.com",
            "name": "Griffen Fargo",
            "username": "gfargo"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "0d684409e180761aadbdefc91da450d47f32984e",
          "message": "Merge pull request #108 from gfargo/release-please--branches--main--components--git-scenarios\n\nchore(main): release 1.3.2",
          "timestamp": "2026-07-13T12:12:48-04:00",
          "tree_id": "cb42f34ec912cde199d0dcb708ea3a0c720d8317",
          "url": "https://github.com/gfargo/git-scenarios/commit/0d684409e180761aadbdefc91da450d47f32984e"
        },
        "date": 1783959259586,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 167.04,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 938.1,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7129.23,
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
          "id": "0cec737a778aeb4cb5ddea77341af3f19d9bdb6e",
          "message": "test(e2e): harden dist freshness gate — fail loudly on stale build (#109)\n\n* test(e2e): harden dist freshness gate in cli.e2e.test.ts\n\nReplace the silent-skip-on-stale-build path with a two-tier gate:\n\n- dist/ absent entirely → suite skips (dev convenience preserved)\n- dist/ present but stale → dedicated 'dist freshness' describe runs\n  and fails loudly with an actionable message\n\nTwo new tests guard the exact regression from issue #104:\n1. dist/bin/mcp.cjs exists (git-scenarios-mcp bin, added v1.3.0) —\n   the mcp binary was the canonical missing artifact in the stale dist.\n2. --help output contains doctor, diff, completions — these commands\n   were absent from the pre-v1.3.0 stale dist snapshot.\n\nAlso documents the build-before-e2e requirement in CONTRIBUTING.md.\n\nNo production source changed; test + docs only.\n\n* test(e2e): surface fix hint in failure message; drop HAS_BUILD alias\n\nTwo nits from review:\n- Replace silent expect().toBe(true) with throw new Error() so the\n  'run npm run build' hint appears directly in Jest failure output\n  instead of being hidden in a comment.\n- Remove the HAS_BUILD = !DIST_ABSENT alias; use !DIST_ABSENT directly\n  in the (? describe : describe.skip) gate — one less level of\n  indirection with no readability benefit.\n\n---------\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-17T22:13:05Z",
          "tree_id": "4a812b0bfe4dd7b7805a55e764dfc7c54ee1385d",
          "url": "https://github.com/gfargo/git-scenarios/commit/0cec737a778aeb4cb5ddea77341af3f19d9bdb6e"
        },
        "date": 1784326476934,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 172.53,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 951.99,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7383.59,
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
          "id": "e48049a81be85f73725dfe7318dbb4eeffb57cf9",
          "message": "fix(atoms): correct shallowAt(depth) off-by-one boundary (#111)\n\nThe shallow boundary commit written to .git/shallow is itself still\nreachable — only its parents get cut off. shallowAt(depth) computed\nthe boundary as HEAD~depth, leaving depth+1 commits reachable instead\nof depth, contradicting its own docstring and git clone --depth\nsemantics. Boundary is now HEAD~(depth-1).\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-18T15:19:31Z",
          "tree_id": "6ad32997489fa9ffdd62f9c16f93d211ca4d965d",
          "url": "https://github.com/gfargo/git-scenarios/commit/e48049a81be85f73725dfe7318dbb4eeffb57cf9"
        },
        "date": 1784388059253,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 168.56,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 938.49,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7306.17,
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
          "id": "b0af5d33eb43b4dada21899eb0a03639a0d60bab",
          "message": "fix(scopes): continue parent commit clock for all atoms inside withRemoteTracking (#112)\n\nOnly commitAll pulled dates from the parent's clock; commit/emptyCommit/\nbulkCommits/etc. keyed off the clone's own path, restarting the\ndeterministic clock at the 2020-01-01 epoch and letting upstream commits\ntie or overlap with the parent's dates. Seed the clone's clock from the\nparent's position at scope-entry and propagate it back on exit, so every\natom used inside the scope continues one deterministic sequence.\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-18T15:20:35Z",
          "tree_id": "7d4deb759f89ad7852c8462573de8ee72283fdd3",
          "url": "https://github.com/gfargo/git-scenarios/commit/b0af5d33eb43b4dada21899eb0a03639a0d60bab"
        },
        "date": 1784388124346,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 168.58,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 944.11,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7221.14,
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
          "id": "174c271794f8a98377592ba1c2df073985bd722c",
          "message": "fix: prevent temp repo leaks when scenario setup throws (#110)\n\nplaywright/vitest/cypress adapters and the CLI create command each\ncreated a temp git repo, then ran (throwable) scenario setup before\ncleanup was wired up or the repo was registered for cleanup. If setup\nthrew, the temp dir under /tmp/git-scenarios-* was orphaned.\n\nWrap createTempGitRepo() + setup/remote/extraSteps in try/catch so a\nthrow triggers cleanup before rethrowing, and add cleanup calls to the\nthree early-return failure branches in the CLI's create command.\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-18T16:28:11Z",
          "tree_id": "bfaeb9809f895081a96c7bc7941094cbc78efbea",
          "url": "https://github.com/gfargo/git-scenarios/commit/174c271794f8a98377592ba1c2df073985bd722c"
        },
        "date": 1784392179982,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 172.46,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 951.23,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7317.9,
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
          "id": "a7fc4cecb02871330d468e1b37ea9769e9811413",
          "message": "fix(atoms): pin tagger date on annotated tags for replay determinism (#113)\n\nAnnotated tags were the one commit-like git object not pinned to the\nshared commit clock, so `git tag -a` embedded the real wall-clock time\nand produced a different tag object SHA on every replay. Pin\nGIT_COMMITTER_DATE (merged, not replaced, so a withAuthor scope's\nidentity survives) from the commit clock, with an optional `date`\noverride for parity with the other date-pinning atoms.\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-18T16:28:23Z",
          "tree_id": "a963831db55e3bbe967875fd619639b3d43c0b0e",
          "url": "https://github.com/gfargo/git-scenarios/commit/a7fc4cecb02871330d468e1b37ea9769e9811413"
        },
        "date": 1784392193540,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 169.56,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 947.7,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7270.74,
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
          "id": "b77f912b79ce9a50b16d0095ac79b47380de941d",
          "message": "fix(scenarioCache): never serve stale templates for custom scenarios (#114)\n\nThe on-disk cache keyed every scenario by `${name}@${LIBRARY_VERSION}`,\nwhich is safe for built-ins (setup only changes on a version bump) but\nunsafe for consumer-registered custom scenarios, whose setup can change\nwithout any package version change. Custom scenarios are now identified\nby reference identity against the built-in registry and are only cached\nwhen they declare an explicit `version`; otherwise they're always\ncold-replayed so a stale template can never be served.\n\nCo-authored-by: gfargo-horizon-agent[bot] <294710345+gfargo-horizon-agent[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-18T16:28:35Z",
          "tree_id": "c8027dabeb3b83e3d166bd0a4aad852a0c0ca168",
          "url": "https://github.com/gfargo/git-scenarios/commit/b77f912b79ce9a50b16d0095ac79b47380de941d"
        },
        "date": 1784392211751,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 169.8,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 947.68,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7388.04,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "GhFargo@gmail.com",
            "name": "Griffen Fargo",
            "username": "gfargo"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ef565fabedae80e3afd65390bff527aeb78bc1cc",
          "message": "Merge pull request #115 from gfargo/release-please--branches--main--components--git-scenarios\n\nchore(main): release 1.3.3",
          "timestamp": "2026-07-18T12:29:52-04:00",
          "tree_id": "94fcc8bc5668428f00bf0aafc877812e92de6583",
          "url": "https://github.com/gfargo/git-scenarios/commit/ef565fabedae80e3afd65390bff527aeb78bc1cc"
        },
        "date": 1784392282792,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 171.17,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 958.68,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7480.2,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "GhFargo@gmail.com",
            "name": "Griffen Fargo",
            "username": "gfargo"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7bf7374d93f0fd38b15254102ff1e8740a31d852",
          "message": "Merge pull request #118 from gfargo/docs/scenario-contribution-template\n\ndocs: add new-scenario contribution template & checklist",
          "timestamp": "2026-07-21T17:45:51-04:00",
          "tree_id": "3b39e5b9b6a022e8de635ad0ba78d9f0f496042a",
          "url": "https://github.com/gfargo/git-scenarios/commit/7bf7374d93f0fd38b15254102ff1e8740a31d852"
        },
        "date": 1784670441337,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 167.05,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 947.86,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7179.29,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "GhFargo@gmail.com",
            "name": "Griffen Fargo",
            "username": "gfargo"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "86acd88949b607f1faf2ec85d9545019042f4cea",
          "message": "Merge pull request #116 from gfargo/feat/executable-contracts\n\nfeat: add verifyContracts() for executable scenario contracts",
          "timestamp": "2026-07-21T21:17:48-04:00",
          "tree_id": "77731c31946d06cb2f26b757a842120839d27e95",
          "url": "https://github.com/gfargo/git-scenarios/commit/86acd88949b607f1faf2ec85d9545019042f4cea"
        },
        "date": 1784683159303,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 167.72,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 942.37,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7172.28,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "GhFargo@gmail.com",
            "name": "Griffen Fargo",
            "username": "gfargo"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d898cf6a133b118b59a647372d755a3ae2b1be55",
          "message": "Merge pull request #121 from gfargo/chore/close-completed-issues\n\nchore: close issues for already-implemented features",
          "timestamp": "2026-07-23T00:10:11-04:00",
          "tree_id": "77731c31946d06cb2f26b757a842120839d27e95",
          "url": "https://github.com/gfargo/git-scenarios/commit/d898cf6a133b118b59a647372d755a3ae2b1be55"
        },
        "date": 1784779900262,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 167.05,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 934.12,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7116.21,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "GhFargo@gmail.com",
            "name": "Griffen Fargo",
            "username": "gfargo"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "dff64eccd26abf6363834d8fb6ad7781f406c2d6",
          "message": "Merge pull request #117 from gfargo/feat/vitest-test-extend-fixture\n\nfeat(vitest): add scenarioTest() for test.extend fixture API",
          "timestamp": "2026-07-23T20:45:45-04:00",
          "tree_id": "385f72c1a820c781b024a4f30de9768e9ac91ba1",
          "url": "https://github.com/gfargo/git-scenarios/commit/dff64eccd26abf6363834d8fb6ad7781f406c2d6"
        },
        "date": 1784854032633,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "empty-repo",
            "value": 167.66,
            "unit": "ms"
          },
          {
            "name": "dirty-many-files",
            "value": 935.83,
            "unit": "ms"
          },
          {
            "name": "large-repo",
            "value": 7113.21,
            "unit": "ms"
          }
        ]
      }
    ]
  }
}