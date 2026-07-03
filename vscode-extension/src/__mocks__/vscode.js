'use strict'
module.exports = {
  window: {
    showQuickPick: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    withProgress: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
    executeCommand: jest.fn(),
  },
  Uri: {
    file: (p) => ({ fsPath: p }),
  },
  ProgressLocation: {
    Notification: 15,
  },
}
