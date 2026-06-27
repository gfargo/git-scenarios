window.BENCHMARK_DATA = {
  "lastUpdate": 1782573505720,
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
      }
    ]
  }
}