#  git-scenarios — hero demo
#
#  Story: ask for any git state by name, get a real repo in that state
#  instantly. We contrast a clean PR-ready feature branch against an
#  in-progress merge conflict — same one command, wildly different repo.
#
#  Render from the repo root (so $PWD resolves to the package root):
#      vhs tapes/hero.tape
#  then optimize losslessly:
#      gifsicle -O3 --batch tapes/hero.gif
#
#  Deterministic by construction: every scenario is byte-identical on
#  every run, so the short hashes below are stable across machines.

Output tapes/hero.gif

Set Shell "bash"
Set FontSize 18
Set Width 1200
Set Height 760
Set Padding 24
Set CursorBlink false
Set Theme { "name": "git-scenarios", "background": "#0d1116", "foreground": "#f1f4f8", "cursor": "#38bdf8", "selection": "#11161d", "black": "#0d1116", "red": "#f97316", "green": "#38bdf8", "yellow": "#fbbf24", "blue": "#38bdf8", "magenta": "#f97316", "cyan": "#38bdf8", "white": "#f1f4f8", "brightBlack": "#94a3b8", "brightRed": "#f97316", "brightGreen": "#38bdf8", "brightYellow": "#fbbf24", "brightBlue": "#38bdf8", "brightMagenta": "#f97316", "brightCyan": "#38bdf8", "brightWhite": "#f1f4f8" }

#  Put a `git-scenarios` shim on PATH that points at the local build,
#  so the demo shows the real command name (not `node dist/...`). Done
#  off-camera. Uses the absolute build path captured from $PWD.
Hide
Type `export GS_BIN="$(mktemp -d)"`
Enter
Type `printf '#!/usr/bin/env bash\nexec node "%s/dist/bin/cli.cjs" "$@"\n' "$PWD" > "$GS_BIN/git-scenarios" && chmod +x "$GS_BIN/git-scenarios"`
Enter
Type `export PATH="$GS_BIN:$PATH" PS1="$ "`
Enter
Type "clear"
Enter
Show

#  Beat 1 — a clean, PR-ready feature branch.
Type "git-scenarios inspect feature-pr-ready"
Sleep 600ms
Enter
Sleep 3.2s

Type "clear"
Enter
Sleep 400ms

#  Beat 2 — an in-progress merge conflict, fork and all.
Type "git-scenarios inspect mid-merge-conflict"
Sleep 600ms
Enter
Sleep 3.8s

#  Clean up the shim off-camera.
Hide
Type `rm -rf "$GS_BIN"`
Enter
Show
