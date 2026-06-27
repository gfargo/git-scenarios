/**
 * Shell completion script generators for git-scenarios.
 *
 * Each script resolves scenario names dynamically at completion time
 * by calling `git-scenarios list --names`, so newly added scenarios
 * complete without regenerating the script.
 */

export const SUPPORTED_SHELLS = ['bash', 'zsh', 'fish'] as const
export type CompletionShell = (typeof SUPPORTED_SHELLS)[number]

const SUBCOMMANDS = 'list describe inspect create capture clean completions help'
const SCENARIO_CMDS = 'describe inspect create'

function bashScript(): string {
  return `\
# bash completion for git-scenarios
# Install: eval "$(git-scenarios completions bash)"
# Or add to ~/.bash_completion.d/git-scenarios

_git_scenarios() {
  local cur prev words cword
  _init_completion 2>/dev/null || {
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
  }

  local subcommands="${SUBCOMMANDS}"
  local scenario_cmds="${SCENARIO_CMDS}"

  # Complete the subcommand (first positional)
  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( \$(compgen -W "\${subcommands}" -- "\${cur}") )
    return
  fi

  local cmd="\${COMP_WORDS[1]}"

  # Complete scenario names for commands that take one
  if [[ " \${scenario_cmds} " == *" \${cmd} "* && \${COMP_CWORD} -eq 2 ]]; then
    COMPREPLY=( \$(compgen -W "\$(git-scenarios list --names 2>/dev/null)" -- "\${cur}") )
    return
  fi

  # Flag completions per subcommand
  case "\${cmd}" in
    list)
      COMPREPLY=( \$(compgen -W "--kind --tag --json --names" -- "\${cur}") )
      ;;
    describe|inspect)
      COMPREPLY=( \$(compgen -W "--json" -- "\${cur}") )
      ;;
    create)
      COMPREPLY=( \$(compgen -W "--path --run --remote --ephemeral" -- "\${cur}") )
      ;;
    capture)
      COMPREPLY=( \$(compgen -W "--name --summary --kind --out --json" -- "\${cur}") )
      ;;
    clean)
      COMPREPLY=( \$(compgen -W "--dry-run --older-than" -- "\${cur}") )
      ;;
    completions)
      COMPREPLY=( \$(compgen -W "bash zsh fish" -- "\${cur}") )
      ;;
  esac
}

complete -F _git_scenarios git-scenarios
`
}

function zshScript(): string {
  return `\
#compdef git-scenarios
# zsh completion for git-scenarios
# Install: eval "$(git-scenarios completions zsh)"
# Or place in a directory on your \$fpath (e.g. ~/.zsh/completions/_git-scenarios)

_git_scenarios() {
  local state

  _arguments -C \\
    '1: :->cmd' \\
    '*: :->args' && return 0

  case \$state in
    cmd)
      local -a cmds
      cmds=(
        'list:Show all scenarios'
        'describe:Print description and contracts for a scenario'
        'inspect:Show commit graph, branches, and status for a scenario'
        'create:Materialize a scenario on disk'
        'capture:Snapshot a real repo into a scenario module'
        'clean:Remove stale scenario temp directories'
        'completions:Print shell completion script'
        'help:Show usage'
      )
      _describe 'command' cmds
      ;;
    args)
      case \${words[2]} in
        describe|inspect|create)
          local -a names
          names=(\${(f)"\$(git-scenarios list --names 2>/dev/null)"})
          _describe 'scenario' names
          ;;
        list)
          _arguments \\
            '--kind[Filter by kind]:kind:(branch worktree operation history stash submodule)' \\
            '--tag[Filter by tag]:tag:' \\
            '--json[Machine-readable JSON output]' \\
            '--names[Print scenario names one per line]'
          ;;
        create)
          _arguments \\
            '--path[Materialize at path]:dir:_files -/' \\
            '--run[Launch command against scenario]:cmd:' \\
            '--remote[Add origin remote]:url:' \\
            '--ephemeral[Auto-clean on exit]'
          ;;
        capture)
          _arguments \\
            '--name[Scenario name]:name:' \\
            '--summary[One-line summary]:summary:' \\
            '--kind[Override inferred kind]:kind:(branch worktree operation history stash submodule)' \\
            '--out[Write module to file]:file:_files' \\
            '--json[Emit structured capture data]'
          ;;
        clean)
          _arguments \\
            '--dry-run[List without deleting]' \\
            '--older-than[Only remove dirs older than N hours]:hours:'
          ;;
        completions)
          local -a shells
          shells=('bash' 'zsh' 'fish')
          _describe 'shell' shells
          ;;
      esac
      ;;
  esac
}

_git_scenarios
`
}

function fishScript(): string {
  return `\
# fish completion for git-scenarios
# Install: git-scenarios completions fish | source
# Or: git-scenarios completions fish > ~/.config/fish/completions/git-scenarios.fish

set -l __gs_cmds list describe inspect create capture clean completions help
set -l __gs_scenario_cmds describe inspect create

# Disable file completions globally
complete -c git-scenarios -f

# Subcommand completion (first argument only)
complete -c git-scenarios -n 'not __fish_seen_subcommand_from $__gs_cmds' \\
  -a list         -d 'Show all scenarios'
complete -c git-scenarios -n 'not __fish_seen_subcommand_from $__gs_cmds' \\
  -a describe     -d 'Print description and contracts'
complete -c git-scenarios -n 'not __fish_seen_subcommand_from $__gs_cmds' \\
  -a inspect      -d 'Show commit graph, branches, and status'
complete -c git-scenarios -n 'not __fish_seen_subcommand_from $__gs_cmds' \\
  -a create       -d 'Materialize a scenario on disk'
complete -c git-scenarios -n 'not __fish_seen_subcommand_from $__gs_cmds' \\
  -a capture      -d 'Snapshot a real repo into a scenario module'
complete -c git-scenarios -n 'not __fish_seen_subcommand_from $__gs_cmds' \\
  -a clean        -d 'Remove stale scenario temp directories'
complete -c git-scenarios -n 'not __fish_seen_subcommand_from $__gs_cmds' \\
  -a completions  -d 'Print shell completion script'
complete -c git-scenarios -n 'not __fish_seen_subcommand_from $__gs_cmds' \\
  -a help         -d 'Show usage'

# Scenario names (dynamic — calls git-scenarios list --names at TAB time)
complete -c git-scenarios \\
  -n '__fish_seen_subcommand_from $__gs_scenario_cmds' \\
  -a '(git-scenarios list --names 2>/dev/null)'

# list flags
complete -c git-scenarios -n '__fish_seen_subcommand_from list' -l kind  -d 'Filter by kind'  -r -a 'branch worktree operation history stash submodule'
complete -c git-scenarios -n '__fish_seen_subcommand_from list' -l tag   -d 'Filter by tag'   -r
complete -c git-scenarios -n '__fish_seen_subcommand_from list' -l json  -d 'JSON output'
complete -c git-scenarios -n '__fish_seen_subcommand_from list' -l names -d 'Names only'

# describe / inspect flags
complete -c git-scenarios -n '__fish_seen_subcommand_from describe inspect' -l json -d 'JSON output'

# create flags
complete -c git-scenarios -n '__fish_seen_subcommand_from create' -l path      -d 'Target path'     -r -a '(__fish_complete_directories)'
complete -c git-scenarios -n '__fish_seen_subcommand_from create' -l run       -d 'Command to run'  -r
complete -c git-scenarios -n '__fish_seen_subcommand_from create' -l remote    -d 'Origin URL'      -r
complete -c git-scenarios -n '__fish_seen_subcommand_from create' -l ephemeral -d 'Auto-clean'

# capture flags
complete -c git-scenarios -n '__fish_seen_subcommand_from capture' -l name    -d 'Scenario name'    -r
complete -c git-scenarios -n '__fish_seen_subcommand_from capture' -l summary -d 'One-line summary'  -r
complete -c git-scenarios -n '__fish_seen_subcommand_from capture' -l kind    -d 'Override kind'     -r -a 'branch worktree operation history stash submodule'
complete -c git-scenarios -n '__fish_seen_subcommand_from capture' -l out     -d 'Output file'       -r -a '(__fish_complete_path)'
complete -c git-scenarios -n '__fish_seen_subcommand_from capture' -l json    -d 'JSON output'

# clean flags
complete -c git-scenarios -n '__fish_seen_subcommand_from clean' -l dry-run    -d 'Preview only'
complete -c git-scenarios -n '__fish_seen_subcommand_from clean' -l older-than -d 'Min age in hours' -r

# completions: shell argument
complete -c git-scenarios -n '__fish_seen_subcommand_from completions' -a 'bash zsh fish' -d 'Shell'
`
}

/**
 * Generate a completion script for the given shell.
 * The script dynamically resolves scenario names at completion time
 * by calling `git-scenarios list --names`.
 */
export function generateCompletion(shell: CompletionShell): string {
  switch (shell) {
    case 'bash': return bashScript()
    case 'zsh':  return zshScript()
    case 'fish': return fishScript()
  }
}
