import * as vscode from "vscode";
import { t } from "../../localization";
import type { SettingsService } from "../../services/settingsService";

export function registerOnboardingCommands(options: {
  settingsService: SettingsService;
}): vscode.Disposable[] {
  const { settingsService } = options;

  const welcomeCommand = vscode.commands.registerCommand(
    "shipone.showWelcome",
    () => {
      const settings = settingsService.getSettings();
      vscode.window.showInformationMessage(
        t("ShipOne listo. Ruta base: {0}", settings.projectsRoot)
      );
    }
  );

  return [welcomeCommand];
}
