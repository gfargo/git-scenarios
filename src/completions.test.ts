import { SUPPORTED_SHELLS, generateCompletion } from './completions'

describe('SUPPORTED_SHELLS', () => {
  it('contains bash, zsh, and fish', () => {
    expect(SUPPORTED_SHELLS).toContain('bash')
    expect(SUPPORTED_SHELLS).toContain('zsh')
    expect(SUPPORTED_SHELLS).toContain('fish')
    expect(SUPPORTED_SHELLS).toHaveLength(3)
  })
})

describe('generateCompletion', () => {
  describe('bash', () => {
    const script = generateCompletion('bash')

    it('contains the completion function registration', () => {
      expect(script).toContain('complete -F _git_scenarios git-scenarios')
    })

    it('contains COMPREPLY for scenario name completion', () => {
      expect(script).toContain('COMPREPLY')
    })

    it('references dynamic name lookup via list --names', () => {
      expect(script).toContain('list --names')
    })

    it('includes all subcommands', () => {
      expect(script).toContain('list')
      expect(script).toContain('describe')
      expect(script).toContain('inspect')
      expect(script).toContain('create')
      expect(script).toContain('capture')
      expect(script).toContain('clean')
      expect(script).toContain('completions')
    })

    it('includes install instructions as a comment', () => {
      expect(script).toContain('eval')
    })
  })

  describe('zsh', () => {
    const script = generateCompletion('zsh')

    it('has the compdef header', () => {
      expect(script).toContain('#compdef git-scenarios')
    })

    it('uses _arguments for completion', () => {
      expect(script).toContain('_arguments')
    })

    it('references dynamic name lookup via list --names', () => {
      expect(script).toContain('list --names')
    })

    it('includes all subcommands', () => {
      expect(script).toContain('list')
      expect(script).toContain('describe')
      expect(script).toContain('inspect')
      expect(script).toContain('create')
      expect(script).toContain('capture')
      expect(script).toContain('clean')
      expect(script).toContain('completions')
    })

    it('includes install instructions as a comment', () => {
      expect(script).toContain('eval')
    })
  })

  describe('fish', () => {
    const script = generateCompletion('fish')

    it('uses complete -c git-scenarios', () => {
      expect(script).toContain('complete -c git-scenarios')
    })

    it('references dynamic name lookup via list --names', () => {
      expect(script).toContain('list --names')
    })

    it('includes all subcommands', () => {
      expect(script).toContain('list')
      expect(script).toContain('describe')
      expect(script).toContain('inspect')
      expect(script).toContain('create')
      expect(script).toContain('capture')
      expect(script).toContain('clean')
      expect(script).toContain('completions')
    })

    it('includes install instructions as a comment', () => {
      expect(script).toContain('source')
    })
  })
})
