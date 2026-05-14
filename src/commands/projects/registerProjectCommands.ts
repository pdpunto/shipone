import * as vscode from "vscode";
import { t } from "../../localization";
import { ProjectMetadata, ProjectStatus } from "../../models/project";
import { ShipOneSettings } from "../../models/settings";
import { ProjectStoreService } from "../../services/projectStoreService";
import { SettingsService } from "../../services/settingsService";
import { ShipOneProjectsTreeDataProvider } from "../../providers/shiponeProjectsTreeDataProvider";
import { pickProject } from "./projectOpsHelpers";

const STATUS_FILE_NAME = "STATUS.md";
const COMMAND_OPEN_PROJECT = "shipone.openProject";
const COMMAND_CHANGE_PROJECT_STATUS = "shipone.changeProjectStatus";
const COMMAND_MARK_PROJECT_IDEA = "shipone.markProjectIdea";
const COMMAND_MARK_PROJECT_ACTIVE = "shipone.markProjectActive";
const COMMAND_MARK_PROJECT_PAUSED = "shipone.markProjectPaused";
const COMMAND_MARK_PROJECT_FINISHED = "shipone.markProjectFinished";
const COMMAND_EDIT_NEXT_ACTION = "shipone.editNextAction";
const COMMAND_CLEAR_NEXT_ACTION = "shipone.clearNextAction";
const COMMAND_OPEN_STATUS_FILE = "shipone.openStatusFile";
const COMMAND_TOGGLE_FAVORITE = "shipone.toggleFavorite";

const STATUS_PICKERS: Array<{ label: string; value: ProjectStatus }> = [
  { label: t("Idea"), value: "idea" },
  { label: t("Active"), value: "active" },
  { label: t("Paused"), value: "paused" },
  { label: t("Finished"), value: "finished" },
];

export function registerProjectCommands(options: {
  context: vscode.ExtensionContext;
  projectStore: ProjectStoreService;
  settingsService: SettingsService;
  treeDataProvider: ShipOneProjectsTreeDataProvider;
  getSelectedProjectId: () => string | undefined;
}): vscode.Disposable[] {
  const { context, projectStore, settingsService, treeDataProvider, getSelectedProjectId } =
    options;

  const openProjectCommand = vscode.commands.registerCommand(
    COMMAND_OPEN_PROJECT,
    async (projectArg?: unknown) => {
      const project = await resolveProject(projectStore, projectArg, getSelectedProjectId());

      if (!project) {
        vscode.window.showErrorMessage(t("No se encontró el proyecto."));
        return;
      }

      await projectStore.markProjectOpened(project.id);
      await vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.file(project.path),
        false
      );
    }
  );

  const changeStatusCommand = vscode.commands.registerCommand(
    COMMAND_CHANGE_PROJECT_STATUS,
    async (projectArg?: unknown) => {
      const settings = settingsService.getSettings();
      const project = await resolveProject(projectStore, projectArg, getSelectedProjectId());

      if (!project) {
        return;
      }

      const statusChoice = await vscode.window.showQuickPick(STATUS_PICKERS, {
        title: t("Estado"),
        placeHolder: t("Elige el nuevo estado"),
      });

      if (!statusChoice) {
        return;
      }

      await updateProjectStatus(
        projectStore,
        treeDataProvider,
        settings,
        project,
        statusChoice.value,
        statusChoice.label
      );
    }
  );

  const markProjectIdeaCommand = vscode.commands.registerCommand(
    COMMAND_MARK_PROJECT_IDEA,
    async (projectArg?: unknown) => {
      const settings = settingsService.getSettings();
      await markProjectStatus(
        projectStore,
        treeDataProvider,
        settings,
        "idea",
        projectArg,
        getSelectedProjectId()
      );
    }
  );

  const markProjectActiveCommand = vscode.commands.registerCommand(
    COMMAND_MARK_PROJECT_ACTIVE,
    async (projectArg?: unknown) => {
      const settings = settingsService.getSettings();
      await markProjectStatus(
        projectStore,
        treeDataProvider,
        settings,
        "active",
        projectArg,
        getSelectedProjectId()
      );
    }
  );

  const markProjectPausedCommand = vscode.commands.registerCommand(
    COMMAND_MARK_PROJECT_PAUSED,
    async (projectArg?: unknown) => {
      const settings = settingsService.getSettings();
      await markProjectStatus(
        projectStore,
        treeDataProvider,
        settings,
        "paused",
        projectArg,
        getSelectedProjectId()
      );
    }
  );

  const markProjectFinishedCommand = vscode.commands.registerCommand(
    COMMAND_MARK_PROJECT_FINISHED,
    async (projectArg?: unknown) => {
      const settings = settingsService.getSettings();
      await markProjectStatus(
        projectStore,
        treeDataProvider,
        settings,
        "finished",
        projectArg,
        getSelectedProjectId()
      );
    }
  );

  const editNextActionCommand = vscode.commands.registerCommand(
    COMMAND_EDIT_NEXT_ACTION,
    async (projectArg?: unknown) => {
      const project = await resolveProject(projectStore, projectArg, getSelectedProjectId());

      if (!project) {
        return;
      }

      const nextAction = await vscode.window.showInputBox({
        title: t("Siguiente accion"),
        prompt: t("Que hay que hacer ahora"),
        placeHolder: t("Crear login"),
        value: project.nextAction ?? "",
      });

      if (nextAction === undefined) {
        return;
      }

      await projectStore.setNextAction(project.id, nextAction.trim() ? nextAction.trim() : null);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(
        t("Siguiente accion actualizada en {0}.", project.name)
      );
    }
  );

  const clearNextActionCommand = vscode.commands.registerCommand(
    COMMAND_CLEAR_NEXT_ACTION,
    async (projectArg?: unknown) => {
      const project = await resolveProject(projectStore, projectArg, getSelectedProjectId());

      if (!project) {
        return;
      }

      await projectStore.setNextAction(project.id, null);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(t("Siguiente accion limpiada en {0}.", project.name));
    }
  );

  const openStatusFileCommand = vscode.commands.registerCommand(
    COMMAND_OPEN_STATUS_FILE,
    async (projectArg?: unknown) => {
      const project = await resolveProject(projectStore, projectArg, getSelectedProjectId());

      if (!project) {
        return;
      }

      const statusFileUri = vscode.Uri.joinPath(vscode.Uri.file(project.path), STATUS_FILE_NAME);

      try {
        const document = await vscode.workspace.openTextDocument(statusFileUri);
        await vscode.window.showTextDocument(document, { preview: false });
      } catch {
        vscode.window.showErrorMessage(t("No se pudo abrir STATUS.md."));
      }
    }
  );

  const toggleFavoriteCommand = vscode.commands.registerCommand(
    COMMAND_TOGGLE_FAVORITE,
    async (projectArg?: unknown) => {
      const project = await resolveProject(projectStore, projectArg, getSelectedProjectId());

      if (!project) {
        return;
      }

      const wasFavorite = project.favorite;
      await projectStore.toggleFavorite(project.id);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(
        wasFavorite
          ? t("Quitado de favoritos: {0}.", project.name)
          : t("Marcado como favorito: {0}.", project.name)
      );
    }
  );

  context.subscriptions.push(
    openProjectCommand,
    changeStatusCommand,
    markProjectIdeaCommand,
    markProjectActiveCommand,
    markProjectPausedCommand,
    markProjectFinishedCommand,
    editNextActionCommand,
    clearNextActionCommand,
    openStatusFileCommand,
    toggleFavoriteCommand
  );

  return [
    openProjectCommand,
    changeStatusCommand,
    markProjectIdeaCommand,
    markProjectActiveCommand,
    markProjectPausedCommand,
    markProjectFinishedCommand,
    editNextActionCommand,
    clearNextActionCommand,
    openStatusFileCommand,
    toggleFavoriteCommand,
  ];
}

async function markProjectStatus(
  projectStore: ProjectStoreService,
  treeDataProvider: ShipOneProjectsTreeDataProvider,
  settings: ShipOneSettings,
  status: ProjectStatus,
  projectArg?: unknown,
  selectedProjectId?: string
) {
  const project = await resolveProject(projectStore, projectArg, selectedProjectId);

  if (!project) {
    return;
  }

  await updateProjectStatus(
    projectStore,
    treeDataProvider,
    settings,
    project,
    status,
    status
  );
}

async function resolveProject(
  projectStore: ProjectStoreService,
  projectArg?: unknown,
  selectedProjectId?: string
): Promise<ProjectMetadata | undefined> {
  if (typeof projectArg === "string") {
    const projectById = await projectStore.getProject(projectArg);
    if (projectById) {
      return projectById;
    }
  }

  const directProject = unwrapProjectArg(projectArg);

  if (directProject) {
    return directProject;
  }

  if (selectedProjectId) {
    const selectedProject = await projectStore.getProject(selectedProjectId);
    if (selectedProject) {
      return selectedProject;
    }
  }

  return pickProject(projectStore);
}

function unwrapProjectArg(projectArg?: unknown): ProjectMetadata | undefined {
  if (!projectArg) {
    return undefined;
  }

  if (typeof projectArg === "string") {
    return undefined;
  }

  if (typeof projectArg !== "object") {
    return undefined;
  }

  const candidate = projectArg as { project?: ProjectMetadata };

  if (candidate.project) {
    return candidate.project;
  }

  return undefined;
}

async function updateProjectStatus(
  projectStore: ProjectStoreService,
  treeDataProvider: ShipOneProjectsTreeDataProvider,
  settings: ShipOneSettings,
  project: ProjectMetadata,
  status: ProjectStatus,
  statusLabel: string
) {
  if (status === "active") {
    if (!settings.enforceOneActiveProject) {
      await projectStore.setProjectStatus(project.id, status, false);
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(
        t("{0} ahora esta en {1}.", project.name, statusLabel)
      );
      return;
    }

    const projects = await projectStore.loadProjects();
    const otherActive = projects.find((item) => item.status === "active" && item.id !== project.id);

    if (otherActive) {
      const choice = await vscode.window.showWarningMessage(
        t("Ya hay un proyecto activo: {0}.", otherActive.name),
        t("Pausar y activar"),
        t("Cancelar")
      );

      if (choice !== t("Pausar y activar")) {
        return;
      }
    }
  }

  await projectStore.setProjectStatus(project.id, status, settings.enforceOneActiveProject);
  treeDataProvider.refresh();
  vscode.window.showInformationMessage(t("{0} ahora esta en {1}.", project.name, statusLabel));
}
