import * as vscode from "vscode";
import { t } from "../../localization";
import { translationKeys as k } from "../../localization/keys";

const COMMAND_FOCUS_MODE = "shipone.focusMode";
const COMMAND_EXIT_FOCUS_MODE = "shipone.exitFocusMode";

export function registerFocusCommands(options: {
  setFocusMode: (enabled: boolean) => Promise<void>;
}): vscode.Disposable[] {
  const { setFocusMode } = options;

  const focusModeCommand = vscode.commands.registerCommand(
    COMMAND_FOCUS_MODE,
    async () => {
      await setFocusMode(true);
      vscode.window.showInformationMessage(t(k.notification.focusEnabled));
    }
  );

  const exitFocusModeCommand = vscode.commands.registerCommand(
    COMMAND_EXIT_FOCUS_MODE,
    async () => {
      await setFocusMode(false);
      vscode.window.showInformationMessage(t(k.notification.focusDisabled));
    }
  );

  return [focusModeCommand, exitFocusModeCommand];
}
