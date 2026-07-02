import { listRegistered, spinUpScenario } from '@gfargo/git-scenarios'

export interface ScenarioQuickPickItem {
  label: string
  description: string
  detail: string
}

export function listScenarios(): ScenarioQuickPickItem[] {
  return listRegistered().map((s) => ({
    label: s.name,
    description: s.kind,
    detail: s.summary,
  }))
}

export async function materialize(name: string): Promise<string> {
  const repo = await spinUpScenario(name)
  return repo.path
}
