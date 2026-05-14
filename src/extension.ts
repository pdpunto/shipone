import * as vscode from "vscode";
import { ProjectStatus } from "./models/project";
import { ProjectCreationService } from "./services/projectCreationService";
import { ShipOneProjectsTreeDataProvider } from "./providers/shiponeProjectsTreeDataProvider";
import { ProjectStoreService } from "./services/projectStoreService";
import { SettingsService } from "./services/settingsService";

const COMMAND_SHOW_WELCOME = "shipone.showWelcome";
const COMMAND_CREATE_PROJECT = "shipone.createProject";
const COMMAND_OPEN_PROJECT = "shipone.openProject";
const COMMAND_CHANGE_PROJECT_STATUS = "shipone.changeProjectStatus";
const COMMAND_EDIT_NEXT_ACTION = "shipone.editNextAction";
const COMMAND_CLEAR_NEXT_ACTION = "shipone.clearNextAction";
const COMMAND_OPEN_STATUS_FILE = "shipone.openStatusFile";
const COMMAND_REFRESH_PROJECTS = "shipone.refreshProjects";
const STATUS_FILE_NAME = "STATUS.md";

const STATUS_PICKERS: Array<{ label: string; value: ProjectStatus }> = [
  { label: "Idea", value: "idea" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Finished", value: "finished" },
];

export async function activate(context: vscode.ExtensionContext) {
  const settingsService = new SettingsService();
  const projectStore = new ProjectStoreService(context);
  const projectCreationService = new ProjectCreationService(projectStore);
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

  const createProjectCommand = vscode.commands.registerCommand(
    COMMAND_CREATE_PROJECT,
    async () => {
      const settings = settingsService.getSettings();
      const project = await projectCreationService.createProject(settings);

      if (project) {
        treeDataProvider.refresh();
        vscode.window.showInformationMessage(`Proyecto creado: ${project.name}`);
      }
    }
  );

  const openProjectCommand = vscode.commands.registerCommand(
    COMMAND_OPEN_PROJECT,
    async (projectId: string) => {
      const project = await projectStore.getProject(projectId);

      if (!project) {
        vscode.window.showErrorMessage("No se encontró el proyecto.");
        return;
      }

      await vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.file(project.path),
        false
      );
    }
  );

  const changeStatusCommand = vscode.commands.registerCommand(
    COMMAND_CHANGE_PROJECT_STATUS,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const statusChoice = await vscode.window.showQuickPick(STATUS_PICKERS, {
        title: "Estado",
        placeHolder: "Elige el nuevo estado",
      });

      if (!statusChoice) {
        return;
      }

      await projectStore.setProjectStatus(project.id, statusChoice.value);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(
        `${project.name} ahora está en ${statusChoice.label}.`
      );
    }
  );

  const editNextActionCommand = vscode.commands.registerCommand(
    COMMAND_EDIT_NEXT_ACTION,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const nextAction = await vscode.window.showInputBox({
        title: "Siguiente acción",
        prompt: "Qué hay que hacer ahora",
        placeHolder: "Crear login",
        value: project.nextAction ?? "",
      });

      if (nextAction === undefined) {
        return;
      }

      await projectStore.setNextAction(project.id, nextAction.trim() ? nextAction.trim() : null);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(`Siguiente acción actualizada en ${project.name}.`);
    }
  );

  const clearNextActionCommand = vscode.commands.registerCommand(
    COMMAND_CLEAR_NEXT_ACTION,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      await projectStore.setNextAction(project.id, null);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(`Siguiente acción limpiada en ${project.name}.`);
    }
  );

  const openStatusFileCommand = vscode.commands.registerCommand(
    COMMAND_OPEN_STATUS_FILE,
    async () => {
      const project = await pickProject(projectStore);

      if (!project) {
        return;
      }

      const statusFileUri = vscode.Uri.joinPath(vscode.Uri.file(project.path), STATUS_FILE_NAME);

      try {
        const document = await vscode.workspace.openTextDocument(statusFileUri);
        await vscode.window.showTextDocument(document, { preview: false });
      } catch {
        vscode.window.showErrorMessage("No se pudo abrir STATUS.md.");
      }
    }
  );

  const refreshCommand = vscode.commands.registerCommand(COMMAND_REFRESH_PROJECTS, () => {
    treeDataProvider.refresh();
  });

  context.subscriptions.push(
    treeView,
    welcomeCommand,
    createProjectCommand,
    openProjectCommand,
    changeStatusCommand,
    editNextActionCommand,
    clearNextActionCommand,
    openStatusFileCommand,
    refreshCommand
  );
}

async function pickProject(projectStore: ProjectStoreService) {
  const groupedProjects = await projectStore.getProjectsByStatus();
  const projects = Object.values(groupedProjects).flat();

  if (projects.length === 0) {
    vscode.window.showInformationMessage("Todavía no hay proyectos.");
    return undefined;
  }

  const choice = await vscode.window.showQuickPick(
    projects.map((project) => ({
      label: project.name,
      description: project.status,
      detail: project.path,
      project,
    })),
    {
      title: "Proyecto",
      placeHolder: "Elige un proyecto",
    }
  );

  return choice?.project;
}

export function deactivate() {}
