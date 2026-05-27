/**
 * Smoke tests for the public API surface (src/index.ts). The module
 * is a re-export aggregator — these tests verify that the named
 * exports actually resolve and that they're the same identities as
 * their source modules. If a re-export gets typo'd or dropped during
 * a refactor, this catches it without waiting for a downstream
 * consumer to break.
 */

import * as publicApi from './index'
import { spinUpScenario as spinUpDirect } from './spinUpScenario'
import { fromScenario as fromDirect } from './fromScenario'
import { createTempGitRepo as createDirect } from './tempGitRepo'
import { findRegistered as findDirect, listRegistered as listDirect } from './registry'
import * as atoms from './atoms'

describe('public API (src/index.ts)', () => {
  describe('entry points', () => {
    it('re-exports spinUpScenario', () => {
      expect(publicApi.spinUpScenario).toBe(spinUpDirect)
    })

    it('re-exports fromScenario', () => {
      expect(publicApi.fromScenario).toBe(fromDirect)
    })

    it('re-exports createTempGitRepo', () => {
      expect(publicApi.createTempGitRepo).toBe(createDirect)
    })
  })

  describe('registry surface', () => {
    it('re-exports findRegistered', () => {
      expect(publicApi.findRegistered).toBe(findDirect)
    })

    it('re-exports listRegistered', () => {
      expect(publicApi.listRegistered).toBe(listDirect)
    })

    it.each(['registerScenario', 'registerScenarios', 'unregisterScenario', 'resetRegistry', 'findRegisteredByTag'])(
      're-exports %s',
      (name) => {
        expect(typeof (publicApi as Record<string, unknown>)[name]).toBe('function')
      },
    )
  })

  describe('atom catalog', () => {
    // A representative slice of atoms — not exhaustive, just enough
    // to catch a barrel-export regression. Each name is matched by
    // identity to ensure the re-export points at the right thing.
    it.each([
      'chain',
      'repeat',
      'conditionally',
      'addCommit',
      'commit',
      'emptyCommit',
      'amendCommit',
      'bulkCommits',
      'stageFiles',
      'unstageFiles',
      'switchToBranch',
      'startMerge',
      'cherryPick',
      'continueCherryPick',
      'revert',
      'abortRevert',
      'continueRevert',
      'gitClean',
      'writeGitignore',
      'writeGitattributes',
      'defineScenario',
    ])('re-exports atom: %s', (name) => {
      expect((publicApi as Record<string, unknown>)[name]).toBe((atoms as Record<string, unknown>)[name])
    })
  })

  describe('scenario re-exports', () => {
    it.each([
      'featurePrReadyScenario',
      'midMergeConflictScenario',
      'partialStageScenario',
      'monorepoMultiPackageScenario',
      'mergeNoConflictScenario',
      'orphanBranchScenario',
      'stashWithUntrackedScenario',
    ])('re-exports %s', (name) => {
      const value = (publicApi as Record<string, unknown>)[name]
      expect(value).toBeDefined()
      expect(typeof value).toBe('object')
      expect((value as { name: string }).name).toBeDefined()
    })
  })
})
