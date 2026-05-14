import * as vscode from "vscode";
import { SettingsService } from "../services/settingsService";

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
    `ShipOne listo. Ruta base: ${settings.projectsRoot}. Solo un proyecto Active a la vez.`,
    "Crear proyecto",
    "Crear idea de ejemplo",
    "Elegir carpeta base",
    "Conectar GitHub",
    "Abrir ajustes",
    "Entendido"
  );

  if (choice === "Crear proyecto") {
    await vscode.commands.executeCommand("shipone.createProject");
    return;
  }

  if (choice === "Crear idea de ejemplo") {
    await vscode.commands.executeCommand("shipone.createSampleIdea");
    return;
  }

  if (choice === "Elegir carpeta base") {
    await vscode.commands.executeCommand("shipone.setProjectsRoot");
    return;
  }

  if (choice === "Conectar GitHub") {
    await vscode.commands.executeCommand("shipone.connectGithub");
    return;
  }

  if (choice === "Abrir ajustes") {
    await vscode.commands.executeCommand("workbench.action.openSettings", "ShipOne");
  }
}
