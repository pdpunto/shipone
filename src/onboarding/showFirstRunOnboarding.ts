import * as vscode from "vscode";
import { t } from "../localization";
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
      "ShipOne listo. Ruta base: {0}. Solo un proyecto Active a la vez.",
      settings.projectsRoot
    ),
    t("Crear proyecto"),
    t("Crear idea de ejemplo"),
    t("Elegir carpeta base"),
    t("Conectar GitHub"),
    t("Abrir ajustes"),
    t("Entendido")
  );

  if (choice === t("Crear proyecto")) {
    await vscode.commands.executeCommand("shipone.createProject");
    return;
  }

  if (choice === t("Crear idea de ejemplo")) {
    await vscode.commands.executeCommand("shipone.createSampleIdea");
    return;
  }

  if (choice === t("Elegir carpeta base")) {
    await vscode.commands.executeCommand("shipone.setProjectsRoot");
    return;
  }

  if (choice === t("Conectar GitHub")) {
    await vscode.commands.executeCommand("shipone.connectGithub");
    return;
  }

  if (choice === t("Abrir ajustes")) {
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "ShipOne"
    );
  }
}
