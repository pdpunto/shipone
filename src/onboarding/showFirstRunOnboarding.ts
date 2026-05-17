import * as vscode from "vscode";
import { t } from "../localization";
import { translationKeys as k } from "../localization/keys";
import type { SettingsService } from "../services/settingsService";

export async function showFirstRunOnboarding(
  context: vscode.ExtensionContext,
  settingsService: SettingsService
): Promise<void> {
  const seen = context.globalState.get<boolean>("shipone.firstRunSeen", false);
  if (seen) {
    return;
  }

  await context.globalState.update("shipone.firstRunSeen", true);

  const settings = settingsService.getSettings();
  const choice = await vscode.window.showInformationMessage(
    t(
      k.onboarding.ready,
      settings.projectsRoot
    ),
    t(k.common.createProject),
    t("Elegir carpeta base"),
    t(k.common.openGuide),
    t(k.common.connectGitHub),
    t(k.common.openSettings),
    t(k.common.okay)
  );

  if (choice === t(k.common.createProject)) {
    await vscode.commands.executeCommand("shipone.createProject");
    return;
  }

  if (choice === t("Elegir carpeta base")) {
    await vscode.commands.executeCommand("shipone.setProjectsRoot");
    return;
  }

  if (choice === t(k.common.openGuide)) {
    await vscode.commands.executeCommand(
      "vscode.open",
      vscode.Uri.joinPath(context.extensionUri, "README.md")
    );
    return;
  }

  if (choice === t(k.common.connectGitHub)) {
    await vscode.commands.executeCommand("shipone.connectGithub");
    return;
  }

  if (choice === t(k.common.openSettings)) {
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "ShipOne"
    );
  }
}
