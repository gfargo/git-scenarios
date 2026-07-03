import * as vscode from 'vscode'
import { listScenarios, materialize } from './scenarios'
import { runCleanup } from './cleanup'

export function activate(context: vscode.ExtensionContext): void {
  const createCmd = vscode.commands.registerCommand('gitScenarios.create', async () => {
    const items = listScenarios()

    const picked = await vscode.window.showQuickPick(items, {
      matchOnDetail: true,
      placeHolder: 'Pick a git scenario to materialize',
    })

    if (!picked) return

    let repoPath: string
    try {
      repoPath = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Spinning up "${picked.label}"…`,
          cancellable: false,
        },
        () => materialize(picked.label),
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      vscode.window.showErrorMessage(
        `Failed to create scenario "${picked.label}": ${msg}`,
      )
      return
    }

    // Sanitize stored value before appending
    const raw: unknown = context.globalState.get('gitScenarios.dirs')
    const dirs: string[] = Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : []
    dirs.push(repoPath)
    await context.globalState.update('gitScenarios.dirs', dirs)

    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(repoPath), {
      forceNewWindow: true,
    })
  })

  const cleanupCmd = vscode.commands.registerCommand('gitScenarios.cleanup', () =>
    runCleanup(context),
  )

  context.subscriptions.push(createCmd, cleanupCmd)
}

export function deactivate(): void {}
