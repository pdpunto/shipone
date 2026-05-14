import * as vscode from "vscode";
import { ShipOneProjectsTreeDataProvider } from "./providers/shiponeProjectsTreeDataProvider";
import { ProjectStoreService } from "./services/projectStoreService";
import { SettingsService } from "./services/settingsService";

const COMMAND_SHOW_WELCOME = "shipone.showWelcome";
const COMMAND_REFRESH_PROJECTS = "shipone.refreshProjects";

export async function activate(context: vscode.ExtensionContext) {
  const settingsService = new SettingsService();
  const projectStore = new ProjectStoreService(context);
  await projectStore.initialize();
  const treeDataProvider = new ShipOneProjectsTreeDataProvider(projectStore);

  const treeView = vscode.window.createTreeView("shipone.projectsView", {
    treeDataProvider,
  });

  const welcomeCommand = vscode.commands.registerCommand(COMMAND_SHOW_WELCOME, () => {
    const settings = settingsService.getSettings();

    vscode.window.showInformationMessage(
      `ShipOne listo. Ruta base: ${settings.projectsRoot}`
    );
  });

  const refreshCommand = vscode.commands.registerCommand(COMMAND_REFRESH_PROJECTS, () => {
    treeDataProvider.refresh();
  });

  context.subscriptions.push(treeView, welcomeCommand, refreshCommand);
}

export function deactivate() {}
