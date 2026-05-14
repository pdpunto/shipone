import * as vscode from "vscode";
import { ProjectMetadata } from "./models/project";
import { registerProjectCommands } from "./commands/projects/registerProjectCommands";
import { registerLaunchCommands } from "./commands/projects/registerLaunchCommands";
import { registerProjectOpsCommands } from "./commands/projects/registerProjectOpsCommands";
import { registerReviewCommands } from "./commands/projects/registerReviewCommands";
import { ProjectCreationService } from "./services/projectCreationService";
import { ProjectContextService } from "./services/projectContextService";
import { ShipOneProjectsTreeDataProvider } from "./providers/shiponeProjectsTreeDataProvider";
import { ProjectStoreService } from "./services/projectStoreService";
import { SettingsService } from "./services/settingsService";
import { showFirstRunOnboarding } from "./onboarding/showFirstRunOnboarding";

const COMMAND_SHOW_WELCOME = "shipone.showWelcome";
const COMMAND_REFRESH_PROJECTS = "shipone.refreshProjects";
const FOCUS_MODE_CONTEXT_KEY = "shipone.focusMode";
const FOCUS_MODE_STATE_KEY = "shipone.focusMode";

export async function activate(context: vscode.ExtensionContext) {
  const settingsService = new SettingsService();
  const projectStore = new ProjectStoreService(context);
  const projectContextService = new ProjectContextService();
  const projectCreationService = new ProjectCreationService(projectStore, projectContextService);

  await projectStore.initialize();

  let focusModeEnabled = context.workspaceState.get<boolean>(FOCUS_MODE_STATE_KEY, false);
  let selectedProjectId: string | undefined;

  await vscode.commands.executeCommand("setContext", FOCUS_MODE_CONTEXT_KEY, focusModeEnabled);

  const treeDataProvider = new ShipOneProjectsTreeDataProvider(
    projectStore,
    settingsService,
    () => focusModeEnabled
  );

  const treeView = vscode.window.createTreeView("shipone.projectsView", {
    treeDataProvider,
  });

  treeView.onDidChangeSelection((event) => {
    const selected = event.selection[0] as unknown;
    if (selected && typeof selected === "object" && "project" in selected) {
      const project = (selected as { project?: ProjectMetadata }).project;
      selectedProjectId = project?.id;
    } else {
      selectedProjectId = undefined;
    }
  });

  const configurationWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("shipone")) {
      treeDataProvider.refresh();
    }
  });

  void showFirstRunOnboarding(context, settingsService);

  const setFocusMode = async (enabled: boolean) => {
    focusModeEnabled = enabled;
    await context.workspaceState.update(FOCUS_MODE_STATE_KEY, enabled);
    await vscode.commands.executeCommand("setContext", FOCUS_MODE_CONTEXT_KEY, enabled);
    treeDataProvider.refresh();
  };

  const welcomeCommand = vscode.commands.registerCommand(COMMAND_SHOW_WELCOME, () => {
    const settings = settingsService.getSettings();
    vscode.window.showInformationMessage(`ShipOne listo. Ruta base: ${settings.projectsRoot}`);
  });

  const projectCommands = registerProjectCommands({
    context,
    projectStore,
    settingsService,
    treeDataProvider,
    getSelectedProjectId: () => selectedProjectId,
  });

  const launchCommands = registerLaunchCommands({
    context,
    settingsService,
    projectStore,
    projectCreationService,
    treeRefresh: () => treeDataProvider.refresh(),
  });

  const projectOpsCommands = registerProjectOpsCommands({
    projectStore,
    settingsService,
    projectCreationService,
    projectContextService,
    treeRefresh: () => treeDataProvider.refresh(),
  });

  const reviewCommands = registerReviewCommands({
    projectStore,
    settingsService,
    projectCreationService,
    treeRefresh: () => treeDataProvider.refresh(),
    setFocusMode,
  });

  const refreshCommand = vscode.commands.registerCommand(COMMAND_REFRESH_PROJECTS, () => {
    treeDataProvider.refresh();
  });

  context.subscriptions.push(
    treeView,
    configurationWatcher,
    welcomeCommand,
    ...projectOpsCommands,
    ...reviewCommands,
    ...launchCommands,
    ...projectCommands,
    refreshCommand
  );
}

export function deactivate() {}
